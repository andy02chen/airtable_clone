// import type { NextAuthOptions } from "next-auth";
// import type { NextApiHandler } from "next";
import NextAuth from "next-auth";
import { authConfig } from "~/src/server/auth/config";

// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
const handler = NextAuth(authConfig);

export { handler as GET, handler as POST };
