import test from "node:test";
import assert from "node:assert/strict";
import {
  initialData, signupCompany, canRegister, canCancel, validateEvent, registerLocally,
  cancelLocally, remainingPlaces, eventAccess, activeRegistrations, waitlistedRegistrations, waitlistPosition, promoteWaitlistLocally, validateSpeakers
} from "../src/lib/portal-model";

const makeData=()=>structuredClone(initialData);
const user=(data:ReturnType<typeof makeData>,id:string)=>data.users.find(u=>u.id===id)!;
const event=(data:ReturnType<typeof makeData>,id:string)=>data.events.find(e=>e.id===id)!;
const fixedNow=new Date("2026-11-03T00:00:00.000Z");

test("work email routes to its company but an unknown or personal domain cannot sign up",()=>{
  const data=makeData();
  assert.equal(signupCompany("new@northwind.example",data).company?.id,"northwind");
  assert.ok(signupCompany("person@gmail.com",data).error);
  assert.ok(signupCompany("person@not-listed.example",data).error);
  assert.ok(signupCompany("priya@northwind.example",data).error);
});

test("company user cannot see or register for another organization's events",()=>{
  const data=makeData();
  assert.equal(eventAccess(user(data,"employee"),event(data,"event-4"),data),false);
  assert.match(canRegister(user(data,"employee"),event(data,"event-4"),data,fixedNow)!,/cannot register/);
  assert.equal(eventAccess(user(data,"employee3"),event(data,"event-1"),data),false);
});
test("draft and cancelled events cannot accept registrations",()=>{
  const data=makeData();
  assert.match(canRegister(user(data,"employee2"),event(data,"event-3"),data,fixedNow)!,/not open/);
  const e={...event(data,"event-2"),status:"cancelled" as const};
  assert.match(canRegister(user(data,"employee"),e,data,fixedNow)!,/not open/);
});
test("full event blocks further registrations",()=>{
  const data=makeData();const e=event(data,"event-2");e.capacity=1;e.waitlistEnabled=false;
  const first=registerLocally(user(data,"employee"),e,data,fixedNow);
  assert.equal(first.error,null);
  const second=registerLocally(user(first.data,"employee2"),e,first.data,fixedNow);
  assert.match(second.error!,/full/);
  assert.equal(activeRegistrations(e.id,second.data).length,1);
});
test("registration deadline and event start close registration",()=>{
  const data=makeData();const e=event(data,"event-2");
  e.deadline="2026-11-02T23:00:00Z";
  assert.match(canRegister(user(data,"employee"),e,data,fixedNow)!,/deadline/);
  e.deadline="";
  assert.match(canRegister(user(data,"employee"),e,data,new Date("2026-12-01T00:00:00Z"))!,/started/);
});
test("duplicate registration is blocked and a cancelled registration can rejoin",()=>{
  const data=makeData();const e=event(data,"event-1"),u=user(data,"employee");
  assert.match(canRegister(u,e,data,fixedNow)!,/already have an RSVP/);
  const cancelled=cancelLocally(u,e,data,fixedNow);
  assert.equal(cancelled.error,null);
  const joined=registerLocally(u,e,cancelled.data,fixedNow);
  assert.equal(joined.error,null);
  assert.equal(activeRegistrations(e.id,joined.data).filter(x=>x.userId===u.id).length,1);
});
test("registration cannot be cancelled after the event starts",()=>{
  const data=makeData();
  const e=event(data,"event-1"),u=user(data,"employee");
  assert.match(canCancel(u,e,data,new Date("2026-12-30T00:00:00Z"))!,/cannot cancel/);
});
test("capacity cannot be lowered below existing registrations",()=>{
  const data=makeData();const e={...event(data,"event-1"),capacity:1};
  assert.match(validateEvent(e,data)!,/below 2 existing registrations/);
  assert.equal(remainingPlaces(e,data),0);
});
test("suspending a company blocks event access",()=>{
  const data=makeData();data.companies.find(c=>c.id==="northwind")!.status="suspended";
  assert.equal(eventAccess(user(data,"employee"),event(data,"event-1"),data),false);
});

test("full event admits a waitlist with deterministic FIFO queue",()=>{
  const data=makeData(),e=event(data,"event-2");e.capacity=1;e.waitlistEnabled=true;
  const first=registerLocally(user(data,"employee"),e,data,fixedNow);
  const second=registerLocally(user(data,"employee2"),e,first.data,new Date(fixedNow.getTime()+1000));
  assert.equal(second.error,null);
  assert.equal(waitlistedRegistrations(e.id,second.data).length,1);
  assert.equal(waitlistPosition(e.id,"employee2",second.data),1);
  const cancelled=cancelLocally(user(data,"employee"),e,second.data,new Date(fixedNow.getTime()+2000));
  assert.equal(cancelled.error,null);
  assert.equal(activeRegistrations(e.id,cancelled.data)[0].userId,"employee2");
  assert.ok(activeRegistrations(e.id,cancelled.data)[0].promotedAt);
});
test("capacity increase promotes queued employees before new RSVPs",()=>{
  const data=makeData(),e=event(data,"event-2");e.capacity=1;e.waitlistEnabled=true;
  const first=registerLocally(user(data,"employee"),e,data,fixedNow);
  const second=registerLocally(user(data,"employee2"),e,first.data,new Date(fixedNow.getTime()+1000));
  const raised={...e,capacity:2};const promoted=promoteWaitlistLocally(raised,second.data,new Date(fixedNow.getTime()+2000));
  assert.equal(activeRegistrations(e.id,promoted).length,2);
  assert.equal(waitlistedRegistrations(e.id,promoted).length,0);
});

test("speaker form requires complete details but does not require photo alt text",()=>{
  const sample={id:"s1",name:"Sample Speaker",jobTitle:"Mentor",company:"Example Company",talkTitle:"A useful session",bio:"Short biography."};
  assert.equal(validateSpeakers([sample]),null);
  assert.equal(validateSpeakers([{...sample,photoDataUrl:"data:image/webp;base64,abcd"}]),null);
  assert.match(validateSpeakers([{...sample,linkedIn:"javascript:alert(1)"}])!,/HTTPS/);
  assert.match(validateSpeakers([{...sample,company:""}])!,/company/);
});

test("banner alt text and short summary are optional for event creation",()=>{
  const data=makeData();
  const e={...event(data,"event-1"),summary:"",bannerAlt:"",bannerDataUrl:"data:image/webp;base64,abc"};
  assert.equal(validateEvent(e,data),null);
});
