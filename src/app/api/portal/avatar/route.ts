import {NextRequest,NextResponse} from "next/server";
import {databaseEnabled,getSession,sqlPool,snapshot} from "@/lib/db/server";
import {avatarSignedUrl,deleteAvatar,uploadAvatarPng} from "@/lib/media/server";
import {sameOrigin} from "@/lib/http";
export const runtime="nodejs";
export const dynamic="force-dynamic";
const fail=(error:string,status:number)=>NextResponse.json({error},{status,headers:{"Cache-Control":"no-store"}});
async function currentUser(req:NextRequest){
 if(!databaseEnabled())return null;
 return getSession(req.cookies.get("elixir_session")?.value);
}
export async function POST(req:NextRequest){
 if(!sameOrigin(req))return fail("Invalid request origin",403);
 const user=await currentUser(req);
 if(!user)return fail("Sign in required",401);
 if(user.mustChangePassword)return fail("Change your temporary password first",403);
 if(Number(req.headers.get("content-length")||0)>3_500_000)return fail("The processed PNG exceeds the upload limit",413);
 try{
  const body=await req.formData(),file=body.get("avatar");
  if(!(file instanceof File)||file.type!=="image/png"||file.size>Math.floor(2.5*1024*1024))return fail("The processed PNG is too large. Re-select your image.",400);
  const bytes=Buffer.from(await file.arrayBuffer());
  const db=sqlPool(),previous=await db.query("SELECT avatar_storage_key FROM users WHERE id=$1",[user.id]);
  const oldKey=previous.rows[0]?.avatar_storage_key as string|null;
  const key=await uploadAvatarPng(user.id,bytes);
  try{await db.query("UPDATE users SET avatar_storage_key=$1 WHERE id=$2",[key,user.id]);}
  catch(e){await deleteAvatar(key).catch(()=>{});throw e;}
  if(oldKey)await deleteAvatar(oldKey).catch(()=>{});
  return NextResponse.json({success:true,avatarUrl:await avatarSignedUrl(key),data:await snapshot(user)},{headers:{"Cache-Control":"no-store"}});
 }catch(error){
  if(error instanceof Error&&/PNG|dimensions|image/.test(error.message))return fail(error.message,400);
  console.error("Avatar upload failed",error instanceof Error?error.name:"unknown");
  return fail("Unable to upload profile photo",503);
 }
}
export async function DELETE(req:NextRequest){
 if(!sameOrigin(req))return fail("Invalid request origin",403);
 const user=await currentUser(req);
 if(!user)return fail("Sign in required",401);
 if(user.mustChangePassword)return fail("Change your temporary password first",403);
 try{
  const db=sqlPool();
  const current=await db.query("SELECT avatar_storage_key FROM users WHERE id=$1",[user.id]);
  await db.query("UPDATE users SET avatar_storage_key=NULL WHERE id=$1",[user.id]);
  if(current.rows[0]?.avatar_storage_key)await deleteAvatar(current.rows[0].avatar_storage_key).catch(()=>{});
  return NextResponse.json({success:true,data:await snapshot(user)},{headers:{"Cache-Control":"no-store"}});
 }catch(error){
  console.error("Avatar removal failed",error instanceof Error?error.name:"unknown");
  return fail("Unable to remove profile photo",503);
 }
}
