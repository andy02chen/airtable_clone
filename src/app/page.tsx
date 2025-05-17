'use client'

import { useSession, signOut } from "next-auth/react";
import GoogleButton from "~/app/_components/googlebutton";

export default function Home() {
  const { data: session, status } = useSession();

  if (!session) {
    return (
      <main style={{ padding: 20 }}>
        <GoogleButton />
      </main>
    );
  }

  return (
    <main style={{ padding: 20 }}>
      <p>Welcome, {session.user?.email}</p>
    </main>
  );
}
