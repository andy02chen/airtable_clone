import NextAuth from "next-auth";
import { cache } from "react";
import { authConfig } from "./config";
import { signIn as nextAuthSignIn } from "next-auth/react";
import type { NextRequest, NextResponse } from "next/server";

type NextAuthReturnType = {
  auth: () => Promise<void>;
  handlers: Record<string, (req: NextRequest) => Promise<NextResponse>>;
  signIn: (args?: Parameters<typeof nextAuthSignIn>[0]) => Promise<unknown>;
  signOut: () => Promise<void>;
};

const nextAuthResult = NextAuth(authConfig) as NextAuthReturnType;

const { auth: uncachedAuth, handlers, signIn, signOut } = nextAuthResult;

const auth = cache(uncachedAuth);

export { auth, handlers, signIn, signOut };
