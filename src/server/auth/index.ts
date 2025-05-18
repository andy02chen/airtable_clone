import NextAuth from "next-auth";
import { authConfig } from "./config";
import { getServerSession } from "next-auth";

// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
const authHandler = NextAuth(authConfig);

async function getAuthSession() {
  return await getServerSession(authConfig);
}

export { getAuthSession, authHandler };
