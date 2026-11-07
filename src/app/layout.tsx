import type { Metadata } from "next";
import "./globals.css";
import "./theme.css";
export const metadata:Metadata={
  title:"Elixir Events Portal",
  description:"Secure organization events, team experiences and employee registration."
};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>;}