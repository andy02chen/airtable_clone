'use client';

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import LogOut from "~/app/_components/Logout";
import { getBaseColorClass } from "~/app/utils/colours";
import { api } from "~/src/trpc/react";
import TableCells from "./TableCells";
import Loading from "~/app/_components/Loading";
import ColumnVisibilityPanel from "./ColumnVisibilityPanel";
import SortPanel from "./SortPanel";
import FilterPanel from "./FilterPanel";
import { type FilterConfig } from "./FilterPanel"; 
import React from "react";

interface TableUIProps {
  baseName: string;
  baseID: number;
}

type SortConfig = {
  columnId: number;
  direction: 'asc' | 'desc';
  priority: number;
}

export default function TableUI({ baseName, baseID } : TableUIProps) {
  const [activeTab, setActiveTab] = useState<number>(0);
  const [showViews, setShowViews] = useState<boolean>(true);
  const [newTableName, setNewTableName] = useState<string>("");
  const [showCreateForm, setShowCreateForm] = useState<boolean>(false);
  const [newViewName, setNewViewName] = useState<string>("");
  
  // Column visibility state
  const [hiddenColumns, setHiddenColumns] = useState<Set<string>>(new Set());
  const [showColumnPanel, setShowColumnPanel] = useState<boolean>(false);

  const [showSortPanel, setShowSortPanel] = useState<boolean>(false);
  const [showFilterPanel, setShowFilterPanel] = useState<boolean>(false);

  const [sortConfigs, setSortConfigs] = useState<SortConfig[]>([]);
  const [filterConfigs, setFilterConfigs] = useState<FilterConfig[]>([]);

  const [showCreateViewForm, setShowCreateViewForm] = useState<boolean>(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchInput, setSearchInput] = useState("");
  
  const [activeView, setActiveView] = useState<number | null>(null);

  const [pendingViewSelection, setPendingViewSelection] = useState<string | null>("Default View");

  const debounceTimeout = React.useRef<NodeJS.Timeout | null>(null);

  const utils = api.useUtils();

  // Get all tables for this base
  const { data: tableData, isLoading: tablesLoading } = api.table.getByBaseId.useQuery(
    { baseId: baseID },
    { enabled: !!baseID }
  );

  // Get current table ID
  const currentTableId = tableData?.[activeTab]?.id;

  const { data: columnsData, isLoading: columnsLoading } = api.table.getColumns.useQuery(
    { tableId: currentTableId ?? 0 },
    { enabled: !!currentTableId }
  );

  const { data: viewsData, isLoading: viewsLoading } = api.table.getViews.useQuery(
    { tableId: currentTableId ?? 0 },
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

  // Create View Mutation
  const createViewMutation = api.table.createView.useMutation({
    onSuccess: async () => {
      if (currentTableId) {
        setPendingViewSelection(newViewName.trim()); // Store the name for selection
        await utils.table.getViews.invalidate({ tableId: currentTableId });
      }
      setShowCreateViewForm(false);
      setNewViewName("");
    },
    onError: (error) => {
      console.error("Failed to create view:", error);
    }
  });

  // Create table mutation
  const createTableMutation = api.table.create.useMutation({
    onSuccess: async (newTable) => {
      // Refetch tables after successful creation
      await utils.table.getByBaseId.invalidate({ baseId: baseID });

      await createViewMutation.mutateAsync({
        tableId: newTable.id,
        name: "Default View"
      });
      
      if (tableData) {
        setActiveTab(tableData.length);
      }

      setShowCreateForm(false);
      setNewTableName("");
      setPendingViewSelection("Default View");
    },
    onError: (error) => {
      console.error("Failed to create table:", error);
      // You might want to show a toast notification here
    }
  });

  const editViewMutation = api.table.editView.useMutation({
    onSuccess: async () => {
      await utils.table.getViews.invalidate({ tableId: currentTableId });
    },
    onError: (error) => {
      console.error("Failed to update view:", error);
    }
  });

  const { baseColour, dark, darker } = getBaseColorClass(baseID);

  // Reset active tab if it's out of bounds
  useEffect(() => {
    if (tableData && activeTab >= tableData.length) {
      setActiveTab(Math.max(0, tableData.length - 1));
    }
  }, [tableData, activeTab]);

  // Reset hidden columns and sort when switching tables
  useEffect(() => {
    setHiddenColumns(new Set());
    setSortConfigs([]);
    setFilterConfigs([]);
    setActiveView(null);
    setPendingViewSelection("Default View");
  }, [activeTab]);

  useEffect(() => {
  if (pendingViewSelection && viewsData) {
      const newView = viewsData.find(view => view.name === pendingViewSelection);
      if (newView) {
        handleViewClick(newView);
        setPendingViewSelection(null); // Clear the pending selection
      }
    }
  }, [viewsData, pendingViewSelection]);

  useEffect(() => {
    
    return () => {
      if (debounceTimeout.current) {
        clearTimeout(debounceTimeout.current);
      }
    };
  }, []);

  const handleViewClick = (view: NonNullable<typeof viewsData>[0]) => {
  setActiveView(view.id);
  
  // Apply the view's search query
  setSearchQuery(view.searchQuery ?? '');
  
  // Apply the view's sort configuration
  if (view.sortConfig && view.sortConfig.length > 0) {
    const sortConfigs = view.sortConfig.map((sort: {
      columnId: number;
      direction: string;
      priority: number;
    }) => ({
      columnId: sort.columnId,
      direction: sort.direction as 'asc' | 'desc',
      priority: sort.priority
    }));
    setSortConfigs(sortConfigs);
  } else {
    setSortConfigs([]);
  }
  
  // Apply the view's filter configuration
  if (view.filterConfig && view.filterConfig.length > 0) {
    const filterConfigs = view.filterConfig.map((filter: {
      columnId: number;
      operator: string;
      value: string;
    }) => ({
      columnId: filter.columnId,
      operator: filter.operator as FilterConfig['operator'],
      value: filter.value
    }));
    setFilterConfigs(filterConfigs);
  } else {
    setFilterConfigs([]);
  }
};

  const handleCreateView = () => {
    if (newViewName.trim() && currentTableId) {
      createViewMutation.mutate({
        tableId: currentTableId,
        name: newViewName.trim(),
        searchQuery: undefined
      });
    }
  };

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

  const handleSearch = (query: string) => {
    setSearchInput(query);

    if(debounceTimeout.current) {
      clearTimeout(debounceTimeout.current);
    }

    debounceTimeout.current = setTimeout(() => {
      setSearchQuery(query);
    }, 500);
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
      <div className={`relative flex items-center px-4 py-2 border-b bg-white text-gray-700 justify-between`}>
        <button className={`px-4 py-1 rounded border-2 transition cursor-pointer ${
          showViews
            ? 'bg-gray-200 text-black hover:border-gray-300'
            : 'hover:bg-gray-100 text-gray-700 border-transparent'
        }`}
        onClick={() => setShowViews(prev => !prev)}
        >Views</button>
        
        <div 
          className="px-4 py-1 rounded hover:bg-gray-100 transition cursor-pointer relative"
          onClick={() => setShowColumnPanel(prev => !prev)}
        >
          Hide Columns
          {hiddenColumns.size > 0 && (
            <span className="absolute -top-1 -right-1 bg-blue-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center cursor-auto">
              {hiddenColumns.size}
            </span>
          )}
          {showColumnPanel && columnsData && (
            <div className="cursor-auto">
            <ColumnVisibilityPanel
              columns={columnsData}
              hiddenColumns={hiddenColumns}
              onToggleColumn={handleToggleColumn}
              onClose={() => setShowColumnPanel(false)}
            />
            </div>
          )}
        </div>
        
        <div className="px-4 py-1 rounded hover:bg-gray-100 transition relative cursor-pointer"
          onClick={() => setShowFilterPanel(prev => !prev)}>
          Filter

          {filterConfigs.length > 0 && (
            <span className="absolute -top-1 -right-1 bg-blue-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center cursor-auto">
              {filterConfigs.length}
            </span>
          )}

          {showFilterPanel && columnsData && (
            <div className="cursor-auto">
            <FilterPanel
              columns={columnsData.map(col => ({
                id: col.id,
                name: col.name,
                type: col.type === "TEXT" ? "text" : "number",
              }))}
              onDone={async(filterConfigs) => {
                setFilterConfigs(filterConfigs);
                setShowFilterPanel(false);
                if(activeView && currentTableId) {
                  console.log(activeView, currentTableId);
                  await editViewMutation.mutateAsync({
                    id: activeView,
                    tableId: currentTableId,
                    searchQuery: searchQuery,
                    sortConfig: sortConfigs,
                    filterConfig: filterConfigs
                  });
                }
              }}
              onClose={() => setShowFilterPanel(false)}
              initialFilterConfigs={filterConfigs}
              />
            </div>
          )}
        </div>
        <div className="px-4 py-1 rounded hover:bg-gray-100 transition relative text-center cursor-pointer"
          onClick={() => setShowSortPanel(prev => !prev)}
        >
          Sort
          {sortConfigs.length > 0 && (
            <span className="absolute -top-1 -right-1 bg-blue-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center cursor-auto">
              {sortConfigs.length}
            </span>
          )}

          {showSortPanel && columnsData && (
            <div className="cursor-auto">
            <SortPanel
              columns={columnsData.map(col => ({
                id: col.id,
                name: col.name,
                type: col.type === "TEXT" ? "text" : "number",
              }))}
              onDone={async (newSortConfigs) => {
                setSortConfigs(newSortConfigs);
                setShowSortPanel(false);
                if(activeView && currentTableId) {
                  console.log(activeView, currentTableId);
                  await editViewMutation.mutateAsync({
                    id: activeView,
                    tableId: currentTableId,
                    searchQuery: searchQuery,
                    sortConfig: newSortConfigs,
                    filterConfig: filterConfigs
                  });
                }
              }}
              onClose={() => setShowSortPanel(false)}
              initialSortConfigs={sortConfigs}
            />
            </div>
          )}
        </div>


        <div className="flex ml-auto">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={searchInput}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Search..."
              className="px-3 py-1 rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button className="px-4 py-1 rounded hover:bg-gray-100 transition cursor-pointer disabled:cursor-not-allowed"
          onClick={() => {
            if(currentTableId) {
              spamRows.mutate({
                tableId: currentTableId,
                count: 5000
              });
            }
          }}
          disabled={spamRows.isPending || !currentTableId}
          >
            {spamRows.isPending ? "Adding..." : "Add 5k rows"}
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
              onClick={() => setShowCreateViewForm(true)}
            >
              Create View +
            </button>
            { showCreateViewForm && (
              <div className="flex items-center bg-white rounded-t-lg">
                <input
                  type="text"
                  value={newViewName}
                  onChange={(e) => setNewViewName(e.target.value)}
                  placeholder="View name"
                  className="px-2 py-1 text-sm border border-gray-300 rounded text-black focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />

                <button
                  onClick={handleCreateView}
                  disabled={!newViewName.trim() || createViewMutation.isPending
                  }
                  className="ml-2 px-2 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {createViewMutation.isPending ? '...' : '✓'}
                </button>

                <button
                  onClick={() => {
                    setShowCreateViewForm(false);
                    setNewViewName("");
                  }}
                  className="ml-1 px-2 py-1 text-sm bg-gray-500 text-white rounded hover:bg-gray-600 cursor-pointer"
                >
                  ✕
                </button>
              </div>
            )}

            <div className="w-full h-px bg-gray-200 my-2"></div>
            <div>
              {/* <div
                className={`p-2 hover:bg-gray-100 cursor-pointer rounded transition-colors ${
                  activeView === null ? "border-l-4 border-blue-500 bg-gray-50" : ""
                }`}
                onClick={() => {
                  setActiveView(null);
                  setSearchQuery('');
                  setFilterConfigs([]);
                  setSortConfigs([]);
                }}
              >
                Default View
              </div> */}
              
              {viewsData?.map((view) => (
                <div
                  key={view.id}
                  className={`p-2 hover:bg-gray-100 cursor-pointer rounded transition-colors ${
                    activeView === view.id ? "border-l-4 border-blue-500 bg-gray-50" : ""
                  }`}
                  onClick={() => handleViewClick(view)}
                >
                  {view.name}
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="flex-1 bg-gray-200 overflow-y-auto">
          {currentTableId && (
            <TableCells 
              tableId={currentTableId}
              hiddenColumns={hiddenColumns}
              onToggleColumn={handleToggleColumn}
              sortConfigs={sortConfigs}
              filterConfigs={filterConfigs}
              searchQuery={searchQuery}
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

      {showSortPanel && (
        <div 
          className="fixed inset-0 z-40"
          onClick={() => setShowSortPanel(false)}
        />
      )}

      {showFilterPanel && (
        <div 
          className="fixed inset-0 z-40"
          onClick={() => setShowFilterPanel(false)}
        />
      )}
    </main>
  );
}