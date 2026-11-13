import type {NextRequest} from "next/server";

/** Return false for malformed or cross-origin browser requests without throwing. */
export function sameOrigin(req:NextRequest){
 const origin=req.headers.get("origin");
 if(!origin)return true;
 try{
  const url=new URL(origin);
  return (url.protocol==="https:"||url.protocol==="http:")&&url.host===req.headers.get("host");
 }catch{return false;}
}
