import "server-only";
import {createNeonAuth} from "@neondatabase/auth/next/server";

export function getEmailAuth(){
 const baseUrl=process.env.NEON_AUTH_BASE_URL;
 const secret=process.env.NEON_AUTH_COOKIE_SECRET;
 if(!baseUrl||!secret||secret.length<32)throw new Error("Neon email authentication is not configured");
 return createNeonAuth({baseUrl,cookies:{secret}});
}
