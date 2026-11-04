import {readFile} from "node:fs/promises";
import {fileURLToPath} from "node:url";
import pg from "pg";
const value=process.env.DATABASE_URL_UNPOOLED||process.env.DIRECT_URL;
if(!value){console.error("Missing DATABASE_URL_UNPOOLED (direct staging connection).");process.exit(1);}
if(process.env.VERCEL_ENV==="production"||process.env.ALLOW_STAGING_MIGRATIONS!=="true"){
 console.error("Migration refused. Set ALLOW_STAGING_MIGRATIONS=true only for an isolated staging branch.");
 process.exit(1);
}
const client=new pg.Client({connectionString:value,ssl:{rejectUnauthorized:true}});
try{
 await client.connect();
 const sql=await readFile(fileURLToPath(new URL("../db/migrations/001_init.sql",import.meta.url)),"utf8");
 await client.query(sql);
 console.log("Staging schema migration applied.");
}catch(error){console.error("Migration failed:",error.message);process.exitCode=1;}
finally{await client.end().catch(()=>{});}
