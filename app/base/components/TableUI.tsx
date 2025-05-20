'use client';

import Link from "next/link";
import { useState } from "react";
import LogOut from "~/app/_components/Logout";
import { getBaseColorClass } from "~/app/utils/colours";

interface TableUIProps {
  baseName: string;
  baseID: number;
}

export default function TableUI({ baseName, baseID } : TableUIProps) {

  const [tabs, setTabs] = useState<string[]>(["Table 1"]);
  const [activeTab, setActiveTab] = useState<number>(0);

  const addTab = () => {
    const newTab = `Table ${tabs.length + 1}`;
    setTabs([...tabs, newTab]);
    setActiveTab(tabs.length);
  };

  const { baseColour, dark, darker} = getBaseColorClass(baseID);

  return(
    <main className="h-screen w-screen">
      <nav className={`w-full p-4 flex justify-between items-center shadow sticky ${baseColour} text-white`}>
        <div className="flex items-center gap-2">
          <Link href="/">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="cursor-pointer"
            width={24}
            height={24}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 15 3 9m0 0 6-6M3 9h12a6 6 0 0 1 0 12h-3" />
          </svg>
          </Link>
          <h1 className="text-2xl text-center">{baseName}</h1>
        </div>
        <LogOut/>
      </nav>

      <div className={`flex px-4 border-b ${dark}`}>
        {tabs.map((tab, index) => (
          <div
            key={index}
            className={`px-4 py-2 rounded-t-lg cursor-pointer transition-colors duration-200 ${
              activeTab === index ? 'bg-white text-black' : `${dark} text-gray-200`
            }`}
            style={{
              backgroundColor: activeTab === index
                ? 'white'
                : `var(--${dark})`
            }}
            onMouseEnter={e => {
              if (activeTab !== index) {
                e.currentTarget.style.backgroundColor = `var(--${darker})`;
              }
            }}
            onMouseLeave={e => {
              if (activeTab !== index) {
                e.currentTarget.style.backgroundColor = `var(--${dark})`;
              }
            }}
            onClick={() => setActiveTab(index)}
          >
            {tab}
          </div>
        ))}
        <div
          className={`px-4 py-2 rounded-t-lg cursor-pointer ${dark} text-gray-200 hover:text-gray-300`}
          onClick={addTab}
        >
          + Add table
        </div>
      </div>
    </main>
  );
}