import NextAuth from "next-auth";
import { authOptions } from "./authOptions";
import type { NextRequest, NextResponse } from "next/server";

const handler = NextAuth(authOptions) as (req: NextRequest) => Promise<NextResponse>;

export { handler as GET, handler as POST };
