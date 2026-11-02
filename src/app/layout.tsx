import type { Metadata } from "next";
import "./globals.css";
export const metadata:Metadata={
  title:"Elixir Events Portal",
  description:"Corporate event management and employee registration — interactive draft."
};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>;}