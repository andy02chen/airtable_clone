'use client';

import Link from "next/link";
import { useEffect, useState } from "react";
import LogOut from "~/app/_components/Logout";
import { getBaseColorClass } from "~/app/utils/colours";
import { api } from "~/src/trpc/react";
import TableCells from "./TableCells";
import Loading from "~/app/_components/Loading";
import ColumnVisibilityPanel from "./ColumnVisibilityPanel";

interface TableUIProps {
  baseName: string;
  baseID: number;
}

export default function TableUI({ baseName, baseID } : TableUIProps) {
  const [activeTab, setActiveTab] = useState<number>(0);
  const [showViews, setShowViews] = useState<boolean>(true);
  const [newTableName, setNewTableName] = useState<string>("");
  const [showCreateForm, setShowCreateForm] = useState<boolean>(false);
  
  // Column visibility state
  const [hiddenColumns, setHiddenColumns] = useState<Set<string>>(new Set());
  const [showColumnPanel, setShowColumnPanel] = useState<boolean>(false);

  const utils = api.useUtils();

  // Get all tables for this base
  const { data: tableData, isLoading: tablesLoading } = api.table.getByBaseId.useQuery(
    { baseId: baseID },
    { enabled: !!baseID }
  );

  // Get current table data for column visibility panel
  const currentTableId = tableData?.[activeTab]?.id;
  const { data: currentTableData } = api.table.getById.useQuery(
    { id: currentTableId ?? 0 },
    { enabled: !!currentTableId }
  );

  const spamRows = api.table.add100krows.useMutation({
    onSuccess: async (data) => {
    console.log(`Successfully added ${data.count} rows`);

    if(currentTableId) {
      await utils.table.infiniteScroll.invalidate({ tableId: currentTableId });
    }
  },
  onError: (error) => {
    console.error("Failed to add rows:", error);
  }
  })

  // Create table mutation
  const createTableMutation = api.table.create.useMutation({
    onSuccess: async () => {
      // Refetch tables after successful creation
      await utils.table.getByBaseId.invalidate({ baseId: baseID });
      setShowCreateForm(false);
      setNewTableName("");
      // Set active tab to the newly created table (it will be the last one)
      if (tableData) {
        setActiveTab(tableData.length);
      }
    },
    onError: (error) => {
      console.error("Failed to create table:", error);
      // You might want to show a toast notification here
    }
  });

  const { baseColour, dark, darker } = getBaseColorClass(baseID);

  // Reset active tab if it's out of bounds
  useEffect(() => {
    if (tableData && activeTab >= tableData.length) {
      setActiveTab(Math.max(0, tableData.length - 1));
    }
  }, [tableData, activeTab]);

  // Reset hidden columns when switching tables
  useEffect(() => {
    setHiddenColumns(new Set());
  }, [activeTab]);

  const handleCreateTable = () => {
    if (newTableName.trim()) {
      createTableMutation.mutate({
        baseId: baseID,
        name: newTableName.trim()
      });
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleCreateTable();
    } else if (e.key === 'Escape') {
      setShowCreateForm(false);
      setNewTableName("");
    }
  };

  const handleToggleColumn = (columnId: string) => {
    setHiddenColumns(prev => {
      const newSet = new Set(prev);
      if (newSet.has(columnId)) {
        newSet.delete(columnId);
      } else {
        newSet.add(columnId);
      }
      return newSet;
    });
  };

  if (tablesLoading || !tableData || tableData.length === 0) {
    return(
      <div className='h-screen w-screen flex items-center justify-center'>
        <Loading/>
      </div>
    )
  }

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
        {tableData.map((table, index) => (
          <div
            key={table.id}
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
            {table.name}
          </div>
        ))}
        
        {/* Add table button or form */}
        {showCreateForm ? (
          <div className="flex items-center px-2 py-1 bg-white rounded-t-lg">
            <input
              type="text"
              value={newTableName}
              onChange={(e) => setNewTableName(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Table name"
              className="px-2 py-1 text-sm border border-gray-300 rounded text-black focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
            <button
              onClick={handleCreateTable}
              disabled={!newTableName.trim() || createTableMutation.isPending}
              className="ml-2 px-2 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {createTableMutation.isPending ? '...' : '✓'}
            </button>
            <button
              onClick={() => {
                setShowCreateForm(false);
                setNewTableName("");
              }}
              className="ml-1 px-2 py-1 text-sm bg-gray-500 text-white rounded hover:bg-gray-600"
            >
              ✕
            </button>
          </div>
        ) : (
          <div
            className={`px-4 py-2 rounded-t-lg cursor-pointer ${dark} text-gray-200 hover:text-gray-300`}
            onClick={() => setShowCreateForm(true)}
          >
            + Add table
          </div>
        )}
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
        
        <button 
          className="px-4 py-1 rounded hover:bg-gray-100 transition cursor-pointer relative"
          onClick={() => setShowColumnPanel(prev => !prev)}
        >
          Hide Columns
          {hiddenColumns.size > 0 && (
            <span className="absolute -top-1 -right-1 bg-blue-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
              {hiddenColumns.size}
            </span>
          )}
          {showColumnPanel && currentTableData?.columns && (
            <ColumnVisibilityPanel
              columns={currentTableData.columns}
              hiddenColumns={hiddenColumns}
              onToggleColumn={handleToggleColumn}
              onClose={() => setShowColumnPanel(false)}
            />
          )}
        </button>
        
        <button className="px-4 py-1 rounded hover:bg-gray-100 transition cursor-pointer">Filter</button>
        <button className="px-4 py-1 rounded hover:bg-gray-100 transition cursor-pointer">Sort</button>

        <div className="ml-auto">
          <button className="px-4 py-1 rounded hover:bg-gray-100 transition cursor-pointer disabled:cursor-not-allowed"
          onClick={() => {
            if(currentTableId) {
              spamRows.mutate({
                tableId: currentTableId,
                count: 100000
              });
            }
          }}
          disabled={spamRows.isPending || !currentTableId}
          >
            {spamRows.isPending ? "Adding..." : "Add 100k rows"}
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
          {currentTableId && (
            <TableCells 
              tableId={currentTableId} 
              hiddenColumns={hiddenColumns}
              onToggleColumn={handleToggleColumn}
            />
          )}
        </div>
      </div>

      {/* Column visibility panel */}
      {showColumnPanel && (
        <div 
          className="fixed inset-0 z-40"
          onClick={() => setShowColumnPanel(false)}
        />
      )}
    </main>
  );
}