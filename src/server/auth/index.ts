import NextAuth from "next-auth";
import { cache } from "react";
import { authConfig } from "./config";
import { signIn as nextAuthSignIn } from "next-auth/react";
import type { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth"; 

type NextAuthReturnType = {
  auth: () => Promise<void>;
  handlers: Record<string, (req: NextRequest) => Promise<NextResponse>>;
  signIn: (args?: Parameters<typeof nextAuthSignIn>[0]) => Promise<unknown>;
  signOut: () => Promise<void>;
};

const nextAuthResult = NextAuth(authConfig);

const { auth: authMiddleware, handlers, signIn, signOut } = nextAuthResult;

async function getAuthSession() {
  return getServerSession(authConfig); // ✅ Clean session object or null
}

export { getAuthSession, authMiddleware as auth, handlers, signIn, signOut };