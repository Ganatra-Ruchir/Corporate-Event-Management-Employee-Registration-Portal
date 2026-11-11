import {notFound} from "next/navigation";
import Home from "../page";
const known=new Set(["overview","events","registrations","people","companies","invitations","accounts","profile"]);
export default async function PortalSection({params}:{params:Promise<{section:string}>}){
 const {section}=await params;
 if(!known.has(section))notFound();
 return <Home/>;
}
