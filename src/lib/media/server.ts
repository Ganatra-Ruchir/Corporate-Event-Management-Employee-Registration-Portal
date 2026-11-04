import "server-only";
import {randomUUID} from "node:crypto";
import {S3Client,PutObjectCommand,GetObjectCommand} from "@aws-sdk/client-s3";
import {getSignedUrl} from "@aws-sdk/s3-request-presigner";
import type {PortalEvent,Speaker} from "@/lib/portal-model";

const BUCKET="event-media";
let client:S3Client|undefined;
const storageConfigured=()=>Boolean(process.env.AWS_ACCESS_KEY_ID&&process.env.AWS_SECRET_ACCESS_KEY&&process.env.AWS_ENDPOINT_URL_S3&&process.env.AWS_REGION);
function s3(){
 if(!storageConfigured())throw Error("Neon private object storage is not configured");
 if(!client)client=new S3Client({
   region:process.env.AWS_REGION!,
   endpoint:process.env.AWS_ENDPOINT_URL_S3!,
   forcePathStyle:true,
   credentials:{accessKeyId:process.env.AWS_ACCESS_KEY_ID!,secretAccessKey:process.env.AWS_SECRET_ACCESS_KEY!}
 });
 return client;
}
const prefix="data:image/";
function parseImage(value:string){
 if(!value.startsWith(prefix))throw Error("Expected an uploaded image");
 const match=/^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$/.exec(value);
 if(!match)throw Error("Only JPEG, PNG and WebP uploads are supported");
 const bytes=Buffer.from(match[2],"base64");
 if(!bytes.length||bytes.length>5_000_000)throw Error("Image must be between 1 byte and 5 MB");
 const mime="image/"+match[1];
 const type=match[1]==="jpeg"?"jpg":match[1];
 return {bytes,mime,type};
}
async function writeImage(value:string,org:string,event:string,part:string){
 const img=parseImage(value);
 const key="organizations/"+encodeURIComponent(org)+"/events/"+encodeURIComponent(event)+"/"+part+"/"+randomUUID()+"."+img.type;
 await s3().send(new PutObjectCommand({Bucket:BUCKET,Key:key,Body:img.bytes,ContentType:img.mime,CacheControl:"private, max-age=3600"}));
 return key;
}
export async function storeEventImages(event:PortalEvent,previous?:PortalEvent):Promise<PortalEvent>{
 const next={...event};
 // Never accept storage object keys from the client. Existing keys are taken from DB.
 next.bannerStorageKey=previous?.bannerStorageKey;
 if(next.bannerDataUrl?.startsWith(prefix)){
  next.bannerStorageKey=await writeImage(next.bannerDataUrl,next.companyId,next.id,"banner");
 }
 delete next.bannerDataUrl;
 const before=new Map((previous?.speakers||[]).map(s=>[s.id,s]));
 next.speakers=await Promise.all((event.speakers||[]).map(async(sp):Promise<Speaker>=>{
  const prior=before.get(sp.id);
  const item={...sp,photoStorageKey:prior?.photoStorageKey};
  if(sp.photoDataUrl?.startsWith(prefix)){
   item.photoStorageKey=await writeImage(sp.photoDataUrl!,next.companyId,next.id,"speakers");
  }
  delete item.photoDataUrl;
  return item;
 }));
 return next;
}
export async function hydrateEventImages(event:PortalEvent):Promise<PortalEvent>{
 const next={...event};
 if(next.bannerStorageKey)next.bannerDataUrl=await getSignedUrl(s3(),new GetObjectCommand({Bucket:BUCKET,Key:next.bannerStorageKey}),{expiresIn:3600});
 next.speakers=await Promise.all((event.speakers||[]).map(async(s):Promise<Speaker>=>{
  const sp={...s};
  if(sp.photoStorageKey)sp.photoDataUrl=await getSignedUrl(s3(),new GetObjectCommand({Bucket:BUCKET,Key:sp.photoStorageKey}),{expiresIn:3600});
  return sp;
 }));
 return next;
}
