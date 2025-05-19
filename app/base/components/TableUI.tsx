'use client';

import Link from "next/link";
import LogOut from "~/app/_components/Logout";
import { getBaseColorClass } from "~/app/utils/colours";

interface TableUIProps {
  baseName: string;
  baseID: number;
}

export default function TableUI({ baseName, baseID } : TableUIProps) {

  return(
    <main className="h-screen w-screen">
      <nav className={`w-full p-4 flex justify-between items-center border-b border-gray-300 shadow sticky ${getBaseColorClass(baseID)} text-white`}>
        <div className="flex items-center gap-2">
          <Link href="/">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="cursor-pointer"
            width={24}
            height={24}>
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 15 3 9m0 0 6-6M3 9h12a6 6 0 0 1 0 12h-3" />
          </svg>
          </Link>
          <h1 className="text-2xl text-center">{baseName}</h1>
        </div>
        <LogOut/>
      </nav>
    </main>
  );
}