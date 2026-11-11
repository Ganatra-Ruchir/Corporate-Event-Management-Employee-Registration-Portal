/** Accept up to 20 MiB JPG, PNG or WebP images and resize them client-side for Vercel's 4.5 MB
 * function payload limit. Result is always PNG and <= 2.5 MiB.
 * Uploading a 20 MB image unchanged to a Next.js function would fail with 413.
 */
export const MAX_AVATAR_SOURCE_BYTES=20*1024*1024;
export const MAX_AVATAR_UPLOAD_BYTES=Math.floor(2.5*1024*1024);
export async function optimizePngAvatar(file:File):Promise<File>{
 if(!["image/png","image/jpeg","image/webp"].includes(file.type)||file.size>MAX_AVATAR_SOURCE_BYTES||file.size===0)
  throw new Error("Choose a JPG, PNG or WebP image up to 20 MB.");
 let bitmap:ImageBitmap;
 try{bitmap=await createImageBitmap(file);}catch{throw new Error("The selected image could not be opened.");}
 try{
  if(bitmap.width<16||bitmap.height<16)throw new Error("Image dimensions must be at least 16 pixels.");
  if(file.type==="image/png"&&file.size<=MAX_AVATAR_UPLOAD_BYTES&&bitmap.width<=2048&&bitmap.height<=2048)return file;
  let ratio=Math.min(1,1024/Math.max(bitmap.width,bitmap.height));
  for(let attempt=0;attempt<12;attempt++){
   const width=Math.max(16,Math.round(bitmap.width*ratio));
   const height=Math.max(16,Math.round(bitmap.height*ratio));
   const canvas=document.createElement("canvas");
   canvas.width=width;canvas.height=height;
   const ctx=canvas.getContext("2d");
   if(!ctx)throw new Error("This browser cannot process this image.");
   ctx.imageSmoothingEnabled=true;
   ctx.imageSmoothingQuality="high";
   ctx.drawImage(bitmap,0,0,width,height);
   const blob=await new Promise<Blob|null>(resolve=>canvas.toBlob(resolve,"image/png"));
   canvas.width=0;canvas.height=0;
   if(!blob)throw new Error("Unable to process the PNG image.");
   if(blob.size<=MAX_AVATAR_UPLOAD_BYTES){
    return new File([blob],file.name.replace(/\.png$/i,"")+".png",{type:"image/png"});
   }
   ratio*=.8;
  }
  throw new Error("This image could not be reduced to a safe profile-photo size.");
 }finally{bitmap.close();}
}
