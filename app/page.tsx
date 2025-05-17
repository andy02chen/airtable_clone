'use client'

import { useSession } from "next-auth/react";
import { useState } from "react";
import GoogleButton from "app/_components/googlebutton";
import TopNavBar from "./_components/TopNavBar";

export default function Home() {
  const { data: session, status } = useSession();

  const [showSidePanel, setShowSidePanel] = useState(true);

  if (!session) {
    return (
      <main className="h-screen w-screen flex items-center justify-center">
        <GoogleButton />
      </main>
    );
  }

  return (
    <main className="flex flex-col h-screen">
      <TopNavBar showSidePanel={showSidePanel} setShowSidePanel={setShowSidePanel} />
      <div className="flex flex-1 overflow-hidden">
        <div className={`bg-white border-r border-gray-300 shadow overflow-hidden transition-[width] duration-300 ease-in-out ${
          showSidePanel ? "w-64" : "w-0"}`}>
          {showSidePanel && 
            <div className="p-4">
              Side Panel
              </div>
          }
        </div>
        <div className="flex-1 p-4 overflow-y-auto">
          <h1>Home</h1>
        </div>
      </div>
    </main>
  );
}
