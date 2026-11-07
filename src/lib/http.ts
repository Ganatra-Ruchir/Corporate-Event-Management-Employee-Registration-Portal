import type {NextRequest} from "next/server";

/**
 * CSRF guard: accept requests with no Origin header (same-origin GET/navigations)
 * or an Origin whose host matches this server. A malformed Origin such as "null"
 * (sent by sandboxed iframes and some privacy tools) is rejected instead of throwing.
 */
export function sameOrigin(req:NextRequest){
 const origin=req.headers.get("origin");
 if(!origin)return true;
 try{return new URL(origin).host===req.headers.get("host");}
 catch{return false;}
}
