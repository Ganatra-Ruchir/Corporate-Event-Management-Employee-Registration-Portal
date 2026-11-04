import {emailAuth} from "@/lib/auth/email-server";
export const {GET,POST,PUT,PATCH,DELETE}=emailAuth.handler();
