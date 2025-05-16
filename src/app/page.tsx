import Link from "next/link";

import { LatestPost } from "~/app/_components/post";
import { auth } from "~/server/auth";
import { api, HydrateClient } from "~/trpc/server";

export default function Home() {
  return (
    <main style={{ padding: 20 }}>
      <h1>Welcome</h1>
    </main>
  );
}
