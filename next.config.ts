import type { NextConfig } from "next";
const nextConfig:NextConfig={
  reactStrictMode:true,
  async redirects(){
    return [
      {source:"/auth",destination:"/",permanent:false},
      {source:"/demo",destination:"/",permanent:false},
      {source:"/welcome",destination:"/",permanent:false},
      {source:"/dashboard",destination:"/",permanent:false},
      {source:"/my-registrations",destination:"/",permanent:false},
      {source:"/join",destination:"/",permanent:false},
      {source:"/settings",destination:"/",permanent:false},
      {source:"/organizations/:path*",destination:"/",permanent:false},
      {source:"/events/:path*",destination:"/",permanent:false}
    ];
  }
};
export default nextConfig;