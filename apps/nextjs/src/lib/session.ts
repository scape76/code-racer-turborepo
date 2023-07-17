import { getServerSession } from "next-auth";

import { nextAuthOptions } from "@code-racer/auth";

export function getSession() {
  return getServerSession(nextAuthOptions);
}

export async function getCurrentUser() {
  const session = await getSession();
  return session?.user;
}
