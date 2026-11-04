import pg from "pg";
import {randomBytes,scrypt as scryptCallback} from "node:crypto";
import {promisify} from "node:util";

const email=(process.env.BOOTSTRAP_ADMIN_EMAIL||"").trim().toLowerCase();
const password=process.env.BOOTSTRAP_ADMIN_PASSWORD||"";
const direct=process.env.DATABASE_URL_UNPOOLED||process.env.DIRECT_URL;
if(process.env.VERCEL_ENV==="production"||process.env.ALLOW_STAGING_BOOTSTRAP!=="true"||
   !direct||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||password.length<14){
 console.error("Refusing bootstrap. Supply staging direct URL, administrator email, password (14+ chars), and ALLOW_STAGING_BOOTSTRAP=true. Never run in production.");
 process.exit(1);
}
const client=new pg.Client({connectionString:direct,ssl:{rejectUnauthorized:true}});
const scrypt=promisify(scryptCallback);
try{
 await client.connect();
 await client.query("BEGIN");
 const exists=await client.query("SELECT count(*)::int AS count FROM users WHERE role='platform_admin'");
 if(exists.rows[0].count>0)throw Error("Platform administrator already exists. Bootstrap refused.");
 const salt=randomBytes(16).toString("hex");
 const digest=await scrypt(password,salt,64);
 const hash="scrypt:"+salt+":"+digest.toString("hex");
 await client.query("INSERT INTO users(id,full_name,email,password_hash,role,organization_id,verified) VALUES(gen_random_uuid()::text,$1,$2,$3,'platform_admin',null,true)",["Elixir Administrator",email,hash]);
 await client.query("COMMIT");
 console.log("Initial staging administrator created. Remove bootstrap environment credentials now.");
}catch(e){await client.query("ROLLBACK").catch(()=>{});console.error("Bootstrap stopped:",e.message);process.exitCode=1;}
finally{await client.end().catch(()=>{});}
