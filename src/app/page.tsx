'use client'

import { useSession, signOut } from "next-auth/react";
import GoogleButton from "~/app/_components/googlebutton";

export default function Home() {
  const { data: session, status } = useSession();

  if (!session) {
    return (
      <main className="h-screen w-screen flex items-center justify-center">
        <GoogleButton />
      </main>
    );
  }

  return (
    <main className="">
      <p>Welcome, {session.user?.name}</p>
    </main>
  );
}
