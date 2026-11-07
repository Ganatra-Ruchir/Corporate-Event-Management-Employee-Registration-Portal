import pg from "pg";
const url=process.env.DATABASE_URL;
if(!url){console.error("DATABASE_URL not set");process.exit(1);}
const client=new pg.Client({connectionString:url,ssl:{rejectUnauthorized:true}});
try{await client.connect();const r=await client.query("SELECT current_database() AS database, current_schema() AS schema, version() AS version");
 console.log({database:r.rows[0].database,schema:r.rows[0].schema,version:r.rows[0].version.split(" on ")[0]});}
catch(e){console.error("Connection failed:",e.message);process.exitCode=1;}
finally{await client.end().catch(()=>{});}
