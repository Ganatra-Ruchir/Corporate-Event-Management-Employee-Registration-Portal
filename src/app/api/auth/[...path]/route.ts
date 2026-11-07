import {NextRequest} from "next/server";
import {getEmailAuth} from "@/lib/auth/email-server";
export const runtime="nodejs";
export const dynamic="force-dynamic";
type RouteContext={params:Promise<{path:string[]}>};
async function proxy(method:"GET"|"POST"|"PUT"|"PATCH"|"DELETE",request:NextRequest,context:RouteContext){
 const routes=getEmailAuth().handler();
 return routes[method](request,context);
}
export const GET=(req:NextRequest,context:RouteContext)=>proxy("GET",req,context);
export const POST=(req:NextRequest,context:RouteContext)=>proxy("POST",req,context);
export const PUT=(req:NextRequest,context:RouteContext)=>proxy("PUT",req,context);
export const PATCH=(req:NextRequest,context:RouteContext)=>proxy("PATCH",req,context);
export const DELETE=(req:NextRequest,context:RouteContext)=>proxy("DELETE",req,context);
