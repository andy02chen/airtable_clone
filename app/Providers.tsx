'use client';

import { SessionProvider } from "next-auth/react";
import type { ReactNode } from "react";
import { TRPCReactProvider } from "~/src/trpc/react";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <TRPCReactProvider>{children}</TRPCReactProvider>
    </SessionProvider>
  );
}
