import {NextResponse} from "next/server";
import {databaseEnabled} from "@/lib/db/server";
import {checkMediaStorage} from "@/lib/media/server";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export async function GET(){
 const ready=databaseEnabled()&&await checkMediaStorage();
 return NextResponse.json({storage:"neon-private",ready},{status:ready?200:503,headers:{"Cache-Control":"no-store"}});
}
