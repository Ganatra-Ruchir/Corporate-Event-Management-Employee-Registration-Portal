export type Role = "platform_admin" | "company_admin" | "employee";
export type CompanyStatus = "active" | "suspended";
export type EventStatus = "draft" | "published" | "cancelled";
export type RegistrationStatus = "going" | "waitlisted" | "cancelled";
export type EventFormat = "in_person" | "online" | "hybrid";

export type Company = { id:string; name:string; domains:string[]; status:CompanyStatus; createdAt:string };
export type Person = { id:string; fullName:string; email:string; department:string; role:Role; companyId:string|null; status:CompanyStatus; verified:boolean; password:string; mustChangePassword?:boolean; showInAttendeeLists?:boolean; jobTitle?:string; phone?:string; avatarUrl?:string };
export type Speaker = {
 id:string; name:string; jobTitle:string; company:string; talkTitle:string;
 bio:string; agendaSlot?:string; linkedIn?:string; github?:string; website?:string;
 photoDataUrl?:string; photoAlt?:string; photoStorageKey?:string;
};
export function validateSpeakers(speakers:Speaker[]):string|null {
 if(speakers.length>12)return "Use no more than 12 speakers for one event.";
 for(let i=0;i<speakers.length;i++){
  const s=speakers[i],n="Speaker "+(i+1)+": ";
  if(s.name.trim().length<2)return n+"enter the speaker name.";
  if(!s.jobTitle.trim())return n+"enter a job title.";
  if(!s.company.trim())return n+"enter a company.";
  if(!s.talkTitle.trim())return n+"enter the talk title.";
  if(!s.bio.trim())return n+"enter a short bio.";
  for(const [label,url] of [["LinkedIn",s.linkedIn],["GitHub",s.github],["website",s.website]]){
   if(url&&(!/^https:\/\//i.test(url)||!isValidHttpsUrl(url)))return n+label+" must use a valid HTTPS link.";
  }
 }
 return null;
}
function isValidHttpsUrl(value:string){
 try{const u=new URL(value);return u.protocol==="https:"&&Boolean(u.hostname.includes("."));}catch{return false;}
}
export type PortalEvent = {
  id:string; companyId:string; title:string; summary:string; description:string; category:string; format:EventFormat;
  location:string; onlineLink:string; startsAt:string; endsAt:string; capacity:number; deadline:string;
  contactEmail:string; status:EventStatus; cancellationReason:string; createdBy:string;
  waitlistEnabled?:boolean;
  bannerDataUrl?:string;
  bannerStorageKey?:string;
  bannerAlt?:string;
  speakers?:Speaker[];
};
export type Registration = { id:string; eventId:string; userId:string; status:RegistrationStatus; createdAt:string; waitlistedAt?:string|null; promotedAt?:string|null };
export type Invitation = { id:string; email:string; companyId:string; role:"company_admin"; code:string; accepted:boolean };
export type PortalData = { companies:Company[]; users:Person[]; events:PortalEvent[]; registrations:Registration[]; invitations:Invitation[] };

export const DEMO_PASSWORD="Demo@2026!";
export const PERSONAL_DOMAINS = ["gmail.com","yahoo.com","outlook.com","hotmail.com","live.com","icloud.com","aol.com","proton.me","protonmail.com","rediffmail.com"];
export const CATEGORIES=["Volunteering","Environment","Education","Health","Community","Workshop","Social","Town Hall"];
export const organizationByEmail=(email:string,companies:Company[])=>{
  const domain=email.trim().toLowerCase().split("@")[1];
  return companies.find(c=>c.status==="active"&&c.domains.some(d=>d.toLowerCase()===domain))||null;
};
export function signupCompany(email:string,data:PortalData){
  const normalized=email.trim().toLowerCase();
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized))return {error:"Enter a valid work email address.",company:null};
  const invitation=data.invitations.find(i=>i.email===normalized&&!i.accepted);
  const company=invitation?data.companies.find(c=>c.id===invitation.companyId&&c.status==="active")||null:organizationByEmail(normalized,data.companies);
  if(PERSONAL_DOMAINS.includes(normalized.split("@")[1])||!company)return {error:"Use your work email. If your company isn't listed, ask your manager.",company:null};
  if(data.users.some(u=>u.email.toLowerCase()===normalized))return {error:"An account with this email already exists.",company:null};
  return {error:null,company};
}
export const activeRegistrations=(eventId:string,data:PortalData)=>data.registrations.filter(r=>r.eventId===eventId&&r.status==="going");
export const waitlistedRegistrations=(eventId:string,data:PortalData)=>data.registrations.filter(r=>r.eventId===eventId&&r.status==="waitlisted")
  .sort((a,b)=>(a.waitlistedAt||a.createdAt).localeCompare(b.waitlistedAt||b.createdAt)||a.id.localeCompare(b.id));
export const waitlistPosition=(eventId:string,userId:string,data:PortalData)=>waitlistedRegistrations(eventId,data).findIndex(r=>r.userId===userId)+1;
export const registrationsFor=(userId:string,data:PortalData)=>data.registrations.filter(r=>r.userId===userId);
export const remainingPlaces=(event:PortalEvent,data:PortalData)=>Math.max(0,event.capacity-activeRegistrations(event.id,data).length);
export function eventAccess(user:Person,event:PortalEvent,data:PortalData){
  const company=data.companies.find(c=>c.id===event.companyId);
  if(!company||company.status!=="active"||user.status!=="active"||!user.verified)return false;
  return user.role==="platform_admin"||user.companyId===event.companyId;
}
export function canRegister(user:Person,event:PortalEvent,data:PortalData,now=new Date()):string|null{
  if(!eventAccess(user,event,data))return "You cannot register for this company event.";
  if(user.role==="platform_admin")return "Platform administrators cannot register for company events.";
  if(event.status!=="published")return "Registration is not open.";
  if(new Date(event.startsAt)<=now)return "The event has already started.";
  if(event.deadline&&new Date(event.deadline)<=now)return "The registration deadline has passed.";
  if(data.registrations.some(r=>r.eventId===event.id&&r.userId===user.id&&(r.status==="going"||r.status==="waitlisted")))return "You already have an RSVP.";
  if(remainingPlaces(event,data)<=0&&event.waitlistEnabled===false)return "This event is full.";
  return null;
}
export function canCancel(user:Person,event:PortalEvent,data:PortalData,now=new Date()):string|null{
  if(!eventAccess(user,event,data))return "This registration is not available.";
  if(new Date(event.startsAt)<=now)return "You cannot cancel after the event starts.";
  if(!data.registrations.some(r=>r.eventId===event.id&&r.userId===user.id&&(r.status==="going"||r.status==="waitlisted")))return "You do not have an active RSVP.";
  return null;
}
export function validateEvent(event:PortalEvent,data:PortalData):string|null{
  if(event.title.trim().length<3)return "Enter an event title of at least 3 characters.";
  const speakerIssue=validateSpeakers(event.speakers||[]);if(speakerIssue)return speakerIssue;
  if(!event.description.trim())return "Enter an event description.";
  if(!event.location.trim()&&event.format!=="online")return "Enter an event location.";
  if(event.format!=="in_person"&&!/^https:\/\/\S+\.\S+/.test(event.onlineLink))return "Enter a valid HTTPS meeting link.";
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(event.contactEmail.trim()))return "Enter a valid organiser email.";
  if(!event.startsAt||!event.endsAt||new Date(event.endsAt)<=new Date(event.startsAt))return "End time must be after start time.";
  if(!Number.isInteger(event.capacity)||event.capacity<1)return "Capacity must be at least 1.";
  const booked=activeRegistrations(event.id,data).length;
  if(event.capacity<booked)return "Capacity cannot be below "+booked+" existing registrations.";
  if(event.deadline&&new Date(event.deadline)>new Date(event.startsAt))return "Registration deadline must be before the event starts.";
  return null;
}
/** Browser-only mirror of the Postgres queue rules. Not safe for cross-device concurrency. */
export function registerLocally(user:Person,event:PortalEvent,data:PortalData,now=new Date()){
  const issue=canRegister(user,event,data,now);
  if(issue)return {data,error:issue};
  const existing=data.registrations.find(r=>r.eventId===event.id&&r.userId===user.id);
  const status:RegistrationStatus=remainingPlaces(event,data)>0?"going":"waitlisted";
  const stamp=now.toISOString();
  const registrations=existing?data.registrations.map(r=>r.id===existing.id?{
    ...r,status,createdAt:stamp,waitlistedAt:status==="waitlisted"?stamp:null,promotedAt:null
  }:r):[...data.registrations,{
    id:"reg-"+Math.random().toString(36).slice(2),eventId:event.id,userId:user.id,status,
    createdAt:stamp,waitlistedAt:status==="waitlisted"?stamp:null,promotedAt:null
  }];
  return {data:{...data,registrations},error:null};
}
export function promoteWaitlistLocally(event:PortalEvent,data:PortalData,now=new Date()){
  if(event.status!=="published"||new Date(event.startsAt)<=now)return data;
  const queue=waitlistedRegistrations(event.id,data);
  const available=remainingPlaces(event,data);
  if(available===0||queue.length===0)return data;
  const chosen=new Set(queue.slice(0,available).map(r=>r.id));
  return {...data,registrations:data.registrations.map(r=>chosen.has(r.id)?{
    ...r,status:"going" as const,promotedAt:now.toISOString()
  }:r)};
}
export function cancelLocally(user:Person,event:PortalEvent,data:PortalData,now=new Date()){
  const issue=canCancel(user,event,data,now);
  if(issue)return {data,error:issue};
  const next={...data,registrations:data.registrations.map(r=>r.eventId===event.id&&r.userId===user.id&&(r.status==="going"||r.status==="waitlisted")?{...r,status:"cancelled" as const}:r)};
  return {data:promoteWaitlistLocally(event,next,now),error:null};
}
export const dateText=(s:string)=>new Date(s).toLocaleString("en-IN",{weekday:"short",day:"numeric",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"});
export const shortDate=(s:string)=>new Date(s).toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"});
export const toInput=(s:string)=>{if(!s)return "";const d=new Date(s);return new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,16);};
const date=(day:number,hour:number)=>new Date(Date.UTC(2026,10,day,hour-5,30)).toISOString();
export const initialData:PortalData={
  companies:[
    {id:"northwind",name:"Northwind Services",domains:["northwind.example"],status:"active",createdAt:date(1,9)},
    {id:"contoso",name:"Contoso Industries",domains:["contoso.example","contoso-group.example"],status:"active",createdAt:date(1,10)}
  ],
  users:[
    {id:"platform",fullName:"Elixir Platform Administrator",email:"admin@elixir.example",department:"Administration",role:"platform_admin",companyId:null,status:"active",verified:true,password:DEMO_PASSWORD},
    {id:"manager",fullName:"Alex Morgan",email:"alex@northwind.example",department:"Human Resources",role:"company_admin",companyId:"northwind",status:"active",verified:true,password:DEMO_PASSWORD},
    {id:"employee",fullName:"Priya Shah",email:"priya@northwind.example",department:"Operations",role:"employee",companyId:"northwind",status:"active",verified:true,password:DEMO_PASSWORD},
    {id:"employee2",fullName:"Rahul Mehta",email:"rahul@northwind.example",department:"Engineering",role:"employee",companyId:"northwind",status:"active",verified:true,password:DEMO_PASSWORD},
    {id:"manager2",fullName:"Jordan Lee",email:"jordan@contoso.example",department:"People Team",role:"company_admin",companyId:"contoso",status:"active",verified:true,password:DEMO_PASSWORD},
    {id:"employee3",fullName:"Aisha Khan",email:"aisha@contoso.example",department:"Marketing",role:"employee",companyId:"contoso",status:"active",verified:true,password:DEMO_PASSWORD}
  ],
  events:[
    {id:"event-1",companyId:"northwind",title:"Community Tree Planting",summary:"A morning helping plant trees in local community spaces.",description:"Join colleagues for a guided tree planting activity. Wear comfortable shoes and bring drinking water. The organiser will provide all planting equipment.",category:"Environment",format:"in_person",location:"Riverfront Park, Ahmedabad",onlineLink:"",startsAt:date(18,9),endsAt:date(18,12),capacity:30,deadline:date(17,18),contactEmail:"alex@northwind.example",status:"published",cancellationReason:"",createdBy:"manager"},
    {id:"event-2",companyId:"northwind",title:"Digital Skills Workshop",summary:"Help students practise basic computer skills.",description:"Employees will work alongside facilitators to guide students through short computer exercises. An orientation will be provided at the venue.",category:"Education",format:"in_person",location:"Northwind Training Centre",onlineLink:"",startsAt:date(24,10),endsAt:date(24,13),capacity:18,deadline:"",contactEmail:"alex@northwind.example",status:"published",cancellationReason:"",createdBy:"manager",
      speakers:[
       {id:"speaker-example-1",name:"Mira Patel",jobTitle:"Learning Facilitator",company:"Northwind Services",talkTitle:"Helping beginners learn digital skills",bio:"Mira guides introductory digital learning sessions and practical team workshops.",agendaSlot:"10:00 AM — Introduction and workshop goals"},
       {id:"speaker-example-2",name:"Arjun Shah",jobTitle:"Technology Mentor",company:"Northwind Services",talkTitle:"Practical computer activities",bio:"Arjun helps participants learn through short guided computer exercises.",agendaSlot:"11:00 AM — Guided computer practice"},
       {id:"speaker-example-3",name:"Leena Mehta",jobTitle:"Program Coordinator",company:"Northwind Services",talkTitle:"Questions and next steps",bio:"Leena coordinates community learning sessions and employee volunteering.",agendaSlot:"12:00 PM — Questions and next steps"}
      ]},
    {id:"event-3",companyId:"northwind",title:"Employee Town Hall",summary:"Quarterly conversation about team activities and volunteering plans.",description:"Join the management team for updates and an open discussion. A meeting link will be provided to participants.",category:"Town Hall",format:"online",location:"",onlineLink:"https://meet.example.com/town-hall",startsAt:date(27,15),endsAt:date(27,16),capacity:80,deadline:"",contactEmail:"alex@northwind.example",status:"draft",cancellationReason:"",createdBy:"manager"},
    {id:"event-4",companyId:"contoso",title:"Community Health Outreach",summary:"Help organise a community health awareness programme.",description:"Support the registration desk, distribute information and assist the programme team.",category:"Health",format:"in_person",location:"Contoso Community Hall",onlineLink:"",startsAt:date(21,10),endsAt:date(21,15),capacity:25,deadline:"",contactEmail:"jordan@contoso.example",status:"published",cancellationReason:"",createdBy:"manager2"},
    {id:"event-5",companyId:"northwind",title:"Volunteer Orientation",summary:"An orientation session for staff volunteering activities.",description:"Review the volunteering process, safety guidelines and upcoming activities.",category:"Volunteering",format:"in_person",location:"Northwind Head Office",onlineLink:"",startsAt:date(1,10),endsAt:date(1,12),capacity:40,deadline:"",contactEmail:"alex@northwind.example",status:"published",cancellationReason:"",createdBy:"manager"},
    {id:"event-6",companyId:"northwind",title:"Books and Reading Drive",summary:"Sort donated books and prepare reading kits for local schools.",description:"Join the company volunteer team to organise children's books, label reading kits and prepare delivery boxes for school libraries.",category:"Volunteering",format:"in_person",location:"Northwind Office, Ahmedabad",onlineLink:"",startsAt:date(5,9),endsAt:date(5,12),capacity:24,deadline:date(4,17),contactEmail:"alex@northwind.example",status:"published",cancellationReason:"",createdBy:"manager",waitlistEnabled:true},
    {id:"event-7",companyId:"northwind",title:"Practical AI for Everyday Work",summary:"A hands-on team workshop for exploring everyday AI tools.",description:"An internal learning session on evaluating simple AI tools, responsible use and hands-on exercises. Bring your laptop.",category:"Education",format:"hybrid",location:"Conference Room B",onlineLink:"https://meet.example.com/ai-workshop",startsAt:date(6,11),endsAt:date(6,13),capacity:20,deadline:date(5,18),contactEmail:"alex@northwind.example",status:"published",cancellationReason:"",createdBy:"manager",waitlistEnabled:true},
    {id:"event-8",companyId:"northwind",title:"Friday Team Social",summary:"Meet new colleagues and catch up with your team.",description:"An informal afternoon with conversations and simple games hosted at the office.",category:"Social",format:"in_person",location:"Northwind Terrace",onlineLink:"",startsAt:date(7,16),endsAt:date(7,18),capacity:45,deadline:"",contactEmail:"alex@northwind.example",status:"published",cancellationReason:"",createdBy:"manager",waitlistEnabled:true},
    {id:"event-9",companyId:"northwind",title:"Healthy Habits at Work",summary:"A practical talk on movement, rest and everyday wellbeing.",description:"Hear practical tips for staying active during the working day. Bring questions for our visiting facilitator.",category:"Health",format:"in_person",location:"Northwind Training Room",onlineLink:"",startsAt:date(10,10),endsAt:date(10,11),capacity:35,deadline:"",contactEmail:"alex@northwind.example",status:"published",cancellationReason:"",createdBy:"manager",waitlistEnabled:true},
    {id:"event-10",companyId:"northwind",title:"Community Clean-up Morning",summary:"A volunteer clean-up event with colleagues.",description:"Work together in small groups to clean a local community area. Equipment and safety guidance will be provided.",category:"Environment",format:"in_person",location:"Sabarmati Riverfront, Ahmedabad",onlineLink:"",startsAt:date(12,8),endsAt:date(12,11),capacity:45,deadline:"",contactEmail:"alex@northwind.example",status:"published",cancellationReason:"",createdBy:"manager",waitlistEnabled:true},
    {id:"event-11",companyId:"contoso",title:"Design Thinking Workshop",summary:"A facilitated workshop to solve team challenges.",description:"Practice problem framing and rapid idea exploration in small groups.",category:"Workshop",format:"in_person",location:"Contoso Campus",onlineLink:"",startsAt:date(13,11),endsAt:date(13,14),capacity:18,deadline:"",contactEmail:"jordan@contoso.example",status:"published",cancellationReason:"",createdBy:"manager2",waitlistEnabled:true},
    {id:"event-12",companyId:"contoso",title:"Volunteer School Supply Packing",summary:"Help pack school supplies for community partners.",description:"Sort school material and prepare packs for distribution.",category:"Volunteering",format:"in_person",location:"Contoso Community Hall",onlineLink:"",startsAt:date(14,9),endsAt:date(14,12),capacity:30,deadline:"",contactEmail:"jordan@contoso.example",status:"published",cancellationReason:"",createdBy:"manager2",waitlistEnabled:true}
  ],
  registrations:[
    {id:"reg-1",eventId:"event-1",userId:"employee",status:"going",createdAt:date(2,9)},
    {id:"reg-2",eventId:"event-1",userId:"employee2",status:"going",createdAt:date(2,10)},
    {id:"reg-3",eventId:"event-5",userId:"employee",status:"going",createdAt:date(1,8)}
  ],
  invitations:[]
};
export const makeId=(prefix:string)=>prefix+"-"+Math.random().toString(36).slice(2,12);
export function exportCsv(fileName:string,headings:string[],rows:(string|number)[][]){
  const esc=(value:string|number)=>{let s=String(value);if(/^[\s]*[=+\-@]/.test(s))s="'"+s;return '"'+s.replaceAll('"','""')+'"';};
  const blob=new Blob(["\uFEFF",[headings,...rows].map(row=>row.map(esc).join(",")).join("\r\n")],{type:"text/csv;charset=utf-8"});
  const uri=URL.createObjectURL(blob);const a=document.createElement("a");a.href=uri;a.download=fileName;a.click();URL.revokeObjectURL(uri);
}
