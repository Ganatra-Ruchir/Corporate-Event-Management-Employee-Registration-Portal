import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./theme.css";
import "./obsidian.css";
const description="Volunteer days, workshops, talks and team celebrations from your organization. Find events, RSVP in a click and see who's going.";
export const metadata:Metadata={
  title:"Elixir Events · Your company's events in one place",
  description,
  applicationName:"Elixir Events",
  // Shared links show a title and summary instead of a bare URL.
  openGraph:{type:"website",siteName:"Elixir Events",title:"Elixir Events · Your company's events in one place",description},
  twitter:{card:"summary",title:"Elixir Events",description}
};
export const viewport:Viewport={themeColor:"#121212",colorScheme:"dark light"};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>;}
