import type {ReactNode} from "react";

type Scene="meet"|"impact"|"ideas"|"celebrate"|"learn"|"wellness";
const palette:Record<Scene,{bg:string;soft:string;accent:string;ink:string}> = {
 meet:{bg:"#dbeafe",soft:"#f4e8db",accent:"#2763ba",ink:"#243657"},
 impact:{bg:"#d9eade",soft:"#f6ead5",accent:"#3b8067",ink:"#245b4c"},
 ideas:{bg:"#e4e1f6",soft:"#f3e8d9",accent:"#6c62b9",ink:"#35315f"},
 celebrate:{bg:"#f8e5db",soft:"#dce8f9",accent:"#db805e",ink:"#693c52"},
 learn:{bg:"#ede6f8",soft:"#e2edf3",accent:"#7667b1",ink:"#443e69"},
 wellness:{bg:"#f1e9d6",soft:"#d8ebe4",accent:"#668f7a",ink:"#31574e"}
};
function Person({x,y,shirt,skin="#ce8c66",hair="#293d58",flip=false}:{x:number;y:number;shirt:string;skin?:string;hair?:string;flip?:boolean}){
 return <g transform={`translate(${x} ${y}) scale(${flip?-1:1} 1)`}>
 <path d="M-38 137 Q-35 67 -17 62 L19 62 Q39 76 43 137Z" fill={shirt}/>
 <path d="M-8 47 L-9 72 Q1 86 12 70 L10 47Z" fill={skin}/>
 <ellipse cx="0" cy="25" rx="28" ry="34" fill={skin}/>
 <path d="M-27 24 Q-35 -14 -2 -15 Q28 -14 28 16 Q16 0 -3 1 Q-20 -2 -27 24Z" fill={hair}/>
 <circle cx="-10" cy="28" r="2" fill="#283648"/><circle cx="11" cy="28" r="2" fill="#283648"/>
 <path d="M-8 43 Q0 49 9 42" fill="none" stroke="#8f5348" strokeWidth="2.2" strokeLinecap="round"/>
 </g>;
}
export function LandingArtwork({scene}:{scene:Scene}){
 const c=palette[scene];
 let story:ReactNode;
 switch(scene){
 case "meet":story=<><Person x={94} y={80} shirt="#315b9f"/><Person x={208} y={83} shirt="#d6a06b" skin="#b97c59" hair="#4b342e" flip/><path d="M125 184 Q153 160 179 185" fill="none" stroke="#f8fafc" strokeWidth="10" strokeLinecap="round"/><path d="M146 167 L159 182 L173 166" fill="none" stroke="#fff" strokeWidth="6" strokeLinecap="round"/></>;break;
 case "impact":story=<><Person x={95} y={93} shirt="#e5a866" hair="#493a30"/><Person x={214} y={91} shirt="#3e836c" skin="#b77352" flip/><path d="M112 196 Q149 156 190 193" fill="none" stroke="#9c674e" strokeWidth="10" strokeLinecap="round"/><path d="M155 190 V120 M154 146 Q119 135 126 112 Q151 111 154 146 M155 163 Q194 153 186 122 Q160 128 155 163" stroke="#316f54" strokeWidth="4" fill="#82b892" strokeLinejoin="round"/></>;break;
 case "ideas":story=<><Person x={99} y={87} shirt="#6774b4"/><Person x={222} y={106} shirt="#d18c74" skin="#b77b5e" flip/><rect x="126" y="18" width="69" height="42" rx="13" fill="#fff" stroke="#aab5dc" strokeWidth="3"/><path d="M143 40 H178 M154 48 H171" stroke="#6c62b9" strokeWidth="3" strokeLinecap="round"/><path d="M154 59 L144 70" stroke="#fff" strokeWidth="7" strokeLinecap="round"/></>;break;
 case "celebrate":story=<><Person x={93} y={99} shirt="#c47666"/><Person x={212} y={98} shirt="#6172ab" skin="#a86b50" flip/><path d="M125 165 Q145 135 156 153 Q170 135 191 161" stroke="#eab9a8" strokeWidth="9" fill="none" strokeLinecap="round"/>{[[65,34],[124,25],[192,37],[243,65],[175,15]].map(([x,y],i)=><g key={i} transform={`translate(${x} ${y}) rotate(${i*31})`}><rect width="13" height="5" rx="2" fill={["#d68b78","#5989b8","#9d81b5"][i%3]}/></g>)}</>;break;
 case "learn":story=<><Person x={92} y={91} shirt="#7962a5"/><Person x={211} y={91} shirt="#bb8b60" skin="#af7254" flip/><rect x="114" y="127" width="94" height="71" rx="7" fill="#faf9f4" stroke="#7280a7" strokeWidth="4"/><path d="M160 129 V196 M126 143 L147 150 M171 148 L193 140" fill="none" stroke="#b6b0d8" strokeWidth="3"/></>;break;
 case "wellness":story=<><Person x={96} y={95} shirt="#65927d"/><Person x={211} y={95} shirt="#dba781" skin="#bd7b5b" flip/><path d="M155 154 C135 136 119 154 155 184 C191 155 177 134 155 154Z" fill="#e6a8a1"/><path d="M142 168 H169 M155 156 V178" stroke="#fff8ed" strokeWidth="3" strokeLinecap="round"/></>;break;
 }
 return <svg className="landing-illustration" viewBox="0 0 310 235" role="img" aria-label={{meet:"Two colleagues meeting",impact:"Colleagues planting together",ideas:"Colleagues sharing ideas",celebrate:"Team celebration",learn:"Colleagues learning together",wellness:"Colleagues supporting wellness"}[scene]}>
 <rect x="8" y="10" width="294" height="218" rx="48" fill={c.bg}/>
 <path d="M27 137 Q8 58 86 34 Q196 -12 277 60 Q326 135 267 208 Q134 245 59 203Z" fill={c.soft} opacity=".72"/>
 <circle cx="44" cy="53" r="13" fill={c.accent} opacity=".23"/><circle cx="268" cy="171" r="21" fill={c.accent} opacity=".17"/>
 <path d="M37 205 Q155 186 273 205" stroke={c.ink} strokeWidth="3" opacity=".15" fill="none"/>
 {story}
 <path d="M258 43 l8 0 m-4 -4 v8" stroke={c.accent} strokeWidth="2.5" strokeLinecap="round"/>
 </svg>;
}
