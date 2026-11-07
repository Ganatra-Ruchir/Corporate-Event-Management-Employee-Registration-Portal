import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import "./theme.css";
import "./obsidian.css";

// Self-hosted by next/font: no layout shift, no request to Google at runtime.
const inter=Inter({subsets:["latin"],display:"swap",variable:"--font-sans"});

export const metadata:Metadata={
  title:"Elixir Events Portal",
  description:"Secure organization events, team experiences and employee registration."
};
export const viewport:Viewport={themeColor:"#101011"};

export default function RootLayout({children}:{children:React.ReactNode}){
  return <html lang="en" className={inter.variable}><body>{children}</body></html>;
}
