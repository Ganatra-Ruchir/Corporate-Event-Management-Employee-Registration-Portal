import test from "node:test";
import assert from "node:assert/strict";
import {initialData,isPersonalDomain,registrationState,registrationLabel,signupCompany} from "../src/lib/portal-model";
import type {PortalEvent} from "../src/lib/portal-model";

const makeData=()=>structuredClone(initialData);
const at=(iso:string)=>new Date(iso).getTime();
const base=(over:Partial<PortalEvent>={}):PortalEvent=>({...makeData().events[0],id:"qa-event",status:"published",
  startsAt:"2026-12-10T09:00:00.000Z",endsAt:"2026-12-10T12:00:00.000Z",deadline:"",capacity:2,waitlistEnabled:true,...over});

test("public mailbox providers are never accepted as an organization's work domain",()=>{
  for(const domain of ["gmail.com","GMAIL.com"," outlook.com","yahoo.co.in","googlemail.com","icloud.com"])assert.equal(isPersonalDomain(domain),true,domain);
  for(const domain of ["elixirindia.org","northwind.example","gmail.company.com"])assert.equal(isPersonalDomain(domain),false,domain);
  const data=makeData();
  data.companies[0].domains.push("gmail.com");
  assert.ok(signupCompany("stranger@gmail.com",data).error,"a company that lists gmail.com must still not accept gmail signups");
});

test("cards report closed registration instead of spots left once the deadline passes",()=>{
  const data=makeData();
  const event=base({deadline:"2026-11-05T10:00:00.000Z"});
  data.events.push(event);
  assert.equal(registrationState(event,data,at("2026-11-04T00:00:00Z")),"open");
  assert.equal(registrationState(event,data,at("2026-11-11T00:00:00Z")),"closed");
  assert.equal(registrationLabel(event,data,at("2026-11-11T00:00:00Z")),"Registration closed");
  assert.equal(registrationState(event,data,at("2026-12-10T10:00:00Z")),"started");
});

test("full events say whether a waitlist is open, drafts and cancellations are labelled",()=>{
  const data=makeData();
  const event=base({capacity:1});
  data.events.push(event);
  data.registrations.push({id:"r-qa",eventId:event.id,userId:"employee",status:"going",createdAt:"2026-11-01T00:00:00Z"});
  const now=at("2026-11-04T00:00:00Z");
  assert.equal(registrationLabel(event,data,now),"Full · waitlist open");
  assert.equal(registrationLabel({...event,waitlistEnabled:false},data,now),"Full");
  assert.equal(registrationLabel({...event,status:"draft"},data,now),"Not published");
  assert.equal(registrationLabel({...event,status:"cancelled"},data,now),"Cancelled");
  assert.equal(registrationLabel({...event,capacity:5},data,now),"4 spots left");
});
