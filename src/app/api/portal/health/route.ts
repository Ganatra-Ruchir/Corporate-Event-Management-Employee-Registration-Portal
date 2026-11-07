import {NextResponse} from "next/server";
import {databaseEnabled,sqlPool} from "@/lib/db/server";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export async function GET(){
 if(!databaseEnabled())return NextResponse.json({mode:"local",ready:false},{status:503,headers:{"Cache-Control":"no-store"}});
 try{
  const r=await sqlPool().query("SELECT (to_regclass('public.organizations') IS NOT NULL AND to_regclass('public.users') IS NOT NULL AND to_regclass('public.events') IS NOT NULL AND to_regclass('public.registrations') IS NOT NULL) AS ready");
  const ready=r.rows[0]?.ready===true;
  return NextResponse.json({mode:"postgresql",ready},{status:ready?200:503,headers:{"Cache-Control":"no-store"}});
 }catch{
  return NextResponse.json({mode:"postgresql",ready:false},{status:503,headers:{"Cache-Control":"no-store"}});
 }
}
