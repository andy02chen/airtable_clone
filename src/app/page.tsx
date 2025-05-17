import { api, HydrateClient } from "~/trpc/server";
import GoogleButton from "~/app/_components/googlebutton";

export default function Home() {
  return (
    <main style={{ padding: 20 }}>
      <GoogleButton/>
    </main>
  );
}
