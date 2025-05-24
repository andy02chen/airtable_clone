'use client';

import Link from "next/link";
import { useEffect, useState } from "react";
import LogOut from "~/app/_components/Logout";
import { getBaseColorClass } from "~/app/utils/colours";
import { api } from "~/src/trpc/react";
import TableCells from "./TableCells";
import Loading from "~/app/_components/Loading";

interface TableUIProps {
  baseName: string;
  baseID: number;
}

export default function TableUI({ baseName, baseID } : TableUIProps) {
  const [activeTab, setActiveTab] = useState<number>(0);
  const [showViews, setShowViews] = useState<boolean>(true);

  const [selectedTableId, setSelectedTableId] = useState<number | null>(null);


  // For now, we'll work with a single table per base since your current API returns one table
  // You can extend this later to support multiple tables
  const { data: tableData, isLoading: tablesLoading } = api.table.getByBaseId.useQuery(
    { baseId: baseID },
    { enabled: !!baseID }
  );

  const { baseColour, dark, darker} = getBaseColorClass(baseID);

  // Since your API currently returns one table per base, we'll use static tabs for now
  const tabs = tableData ? tableData.map(t => t.name) : ["Table 1"];

  const addTab = () => {
    // TODO: Add logic to create a new table in the database
    // When implemented, this will call a createTable mutation
    console.log("Add new table functionality to be implemented");
  };

  if (tablesLoading || !tableData || !tableData[activeTab]) {
    return(
      <div className='h-screen w-screen flex items-center justify-center'>
        <Loading/>
      </div>
    )
  }

const currentTableId = tableData[activeTab].id;

  return(
    <main className="h-screen w-screen flex flex-col">
      {/* Nav */}
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

      {/* Table tabs */}
      <div className={`flex px-4 border-b ${dark} overflow-x-auto`} style={{ whiteSpace: 'nowrap' }}>
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

      {/* Buttons */}
      <div className={`flex px-4 py-2 border-b bg-white text-gray-700`}>
        <button className={`px-4 py-1 rounded border-2 transition cursor-pointer ${
          showViews
            ? 'bg-gray-200 text-black hover:border-gray-300'
            : 'hover:bg-gray-100 text-gray-700 border-transparent'
        }`}
        onClick={() => setShowViews(prev => !prev)}
        >Views</button>
        <button className="px-4 py-1 rounded hover:bg-gray-100 transition cursor-pointer">Hide Columns</button>
        <button className="px-4 py-1 rounded hover:bg-gray-100 transition cursor-pointer">Filter</button>
        <button className="px-4 py-1 rounded hover:bg-gray-100 transition cursor-pointer">Sort</button>

        <div className="ml-auto">
          <button className="px-4 py-1 rounded hover:bg-gray-100 transition cursor-pointer">
            Add 100k rows
          </button>
        </div>
      </div>
      
      {/* Table and side panel */}
      <div className="flex flex-1 overflow-hidden">
        <div
          className="bg-white border-r border-gray-300 transition-all duration-300 overflow-hidden"
          style={{ width: showViews ? '16rem' : '0' }}
        >
          {/* Side Panel Section */}
          <div className="p-2 border-t border-gray-300">
            <button
              className="w-full py-2 px-4 hover:bg-gray-200 text-black cursor-pointer rounded-md transition-colors duration-200 flex items-center justify-center"
            >
              Create View +
            </button>
          </div>
        </div>
        <div className="flex-1 bg-gray-200 overflow-y-auto">
          <TableCells tableId={currentTableId} />
        </div>
      </div>
    </main>
  );
}