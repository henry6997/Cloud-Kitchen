import { getAuthUser } from "@blip/db/server";

export const currentUser = () => getAuthUser("customer");
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
