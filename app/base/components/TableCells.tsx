import React from "react";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type ColumnDef,
  type CellContext,
} from "@tanstack/react-table";
import { api } from "~/src/trpc/react"; 

import Loading from "~/app/_components/Loading";
import { AddColumnButton } from "./AddColumn";
import { type FilterConfig } from "./FilterPanel"; 

type SortConfig = {
  columnId: number;
  direction: 'asc' | 'desc';
  priority: number;
}

type TableCellsProps = {
  tableId: number;
  hiddenColumns: Set<string>;
  onToggleColumn: (columnId: string) => void;
  sortConfigs?: SortConfig[];
  filterConfigs?: FilterConfig[];
  searchQuery?: string;
  isPending: boolean;
};

type TableData = Record<string, string | number | null>;

// Separate component to handle individual cell input with local state
function CellInput({ 
  initialValue, 
  rowId, 
  columnId, 
  columnType,
  onUpdate 
}: {
  initialValue: string;
  rowId: number;
  columnId: number;
  columnType?: string;
  onUpdate: (rowId: number, columnId: number, value: string) => void;
}) {
  const [localValue, setLocalValue] = React.useState(initialValue);
  const [hasUnsavedChanges, setHasUnsavedChanges] = React.useState(false);
  const isNumberColumn = columnType && (columnType === 'NUMBER' || columnType === 'number' || String(columnType).toLowerCase() === 'number');

  // Helper function to validate and clean number input
  const validateNumberValue = (value: string): string => {
    if (!isNumberColumn || value === '') return value;

    const regex = /^-?\d*\.?\d*/;
    const match = regex.exec(value);
    return match ? match[0] : '';
  };

  // Update local state when server value changes, but preserve local changes
  React.useEffect(() => {
    if (!hasUnsavedChanges) {
      const validatedValue = validateNumberValue(initialValue);
      setLocalValue(validatedValue);
    }
  }, [initialValue, hasUnsavedChanges, isNumberColumn]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;

    if (isNumberColumn) {
      // For number columns, validate in real-time
      const validatedValue = validateNumberValue(newValue);
      setLocalValue(validatedValue);
      setHasUnsavedChanges(true);
      onUpdate(rowId, columnId, validatedValue);
    } else {
      // For non-number columns, accept any input
      setLocalValue(newValue);
      setHasUnsavedChanges(true);
      onUpdate(rowId, columnId, newValue);
    }
  };

  const handleBlur = () => {
    // On blur, ensure the value is still valid
    if (isNumberColumn) {
      const validatedValue = validateNumberValue(localValue);
      if (validatedValue !== localValue) {
        setLocalValue(validatedValue);
        onUpdate(rowId, columnId, validatedValue);
      }
    }
    
    // Mark as saved after blur
    setTimeout(() => {
      setHasUnsavedChanges(false);
    }, 500); // Small delay to allow mutation to complete
  };

  return (
    <input
      type="text"
      value={localValue}
      onChange={handleChange}
      onBlur={handleBlur}
      className="w-full bg-transparent border-none outline-none px-3 py-2 focus:bg-blue-50 focus:"
    />
  );
}

export default function TableCells({ tableId, hiddenColumns, onToggleColumn, sortConfigs, filterConfigs, searchQuery, isPending }: TableCellsProps) {
  const utils = api.useUtils();
  const debounceTimeout = React.useRef<NodeJS.Timeout | null>(null);
  const tableContainerRef = React.useRef<HTMLDivElement>(null);

  // Create the query key for consistent cache access
  const queryKey = React.useMemo(() => ({
    tableId,
    limit: 50,
    sorts: sortConfigs,
    filters: filterConfigs,
    search: searchQuery?.trim()
  }), [tableId, sortConfigs, filterConfigs, searchQuery]);

  // Fetch the specific table data
  const {
    data: infiniteData,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = api.table.infiniteScroll.useInfiniteQuery(
    queryKey,
    {
      enabled: !!tableId,
      getNextPageParam: (lastPage) => lastPage.nextCursor,
      staleTime: 1000 * 60 * 5, // 5 minutes
    }
  );

  const loadMoreRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const target = entries[0];
        if (target?.isIntersecting && hasNextPage && !isFetchingNextPage) {
          void fetchNextPage();
        }
      },
      { threshold: 0.1 }
    );

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const allRows = React.useMemo(() => {
    return infiniteData?.pages.flatMap(page => page.items) ?? [];
  }, [infiniteData]);

  const tableData = infiniteData?.pages[0]?.columns ?? [];

  const handleScroll = React.useCallback(() => {
    const container = tableContainerRef.current;
    if (!container || !hasNextPage || isFetchingNextPage) return;

    const { scrollTop, scrollHeight, clientHeight } = container;
    // Trigger when user scrolls to within 100px of the bottom
    if (scrollTop + clientHeight >= scrollHeight - 100) {
      void fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  React.useEffect(() => {
    const container = tableContainerRef.current;
    if (!container) return;

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  // Create row
  const createRowMutation = api.base.createRow.useMutation({
    onSuccess: async () => {
      // Invalidate the specific table data query
      await utils.table.infiniteScroll.invalidate({ tableId });
    },
    onError: (error) => {
      console.error("Failed to create row:", error);
    }
  });

  const createColumnMutation = api.base.createColumn.useMutation({
    onSuccess: async () => {
      // Invalidate the specific table data query
      await utils.table.infiniteScroll.invalidate({ tableId });
    },
    onError: (error) => {
      console.error("Failed to create column:", error);
    }
  });

  const updateCellMutation = api.base.updateCell.useMutation({
    onMutate: async ({ rowId, column: columnId, value }) => {
      // Cancel any outgoing refetches for the infinite query
      await utils.table.infiniteScroll.cancel(queryKey);

      // Snapshot the previous value
      const previousData = utils.table.infiniteScroll.getInfiniteData(queryKey);

      // Optimistically update the infinite query cache
      utils.table.infiniteScroll.setInfiniteData(queryKey, (old) => {
        if (!old) return old;
        
        return {
          ...old,
          pages: old.pages.map(page => ({
            ...page,
            items: page.items.map(row => {
              if (row.id === rowId) {
                return {
                  ...row,
                  [`column_${columnId}`]: value
                };
              }
              return row;
            })
          }))
        };
      });

      return { previousData };
    },
    onSuccess: (data, variables) => {
      console.log('Cell update successful:', { data, variables });
      // Optionally refresh data after successful update to ensure consistency
      // But don't invalidate immediately to preserve the optimistic update
    },
    onError: async (err, variables, context) => {
      console.error("Failed to update cell:", err, variables);
      
      // Revert optimistic update on error
      if (context?.previousData) {
        utils.table.infiniteScroll.setInfiniteData(queryKey, context.previousData);
      }
      
      // Always invalidate on error to get fresh data
      await utils.table.infiniteScroll.invalidate({ tableId });
    }
  });

  const handleCellUpdate = React.useCallback((rowId: number, columnKey: number, value: string) => {
    console.log('Handling cell update:', { rowId, columnKey, value });
    
    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current);
    }

    debounceTimeout.current = setTimeout(() => {
      updateCellMutation.mutate({
        rowId,
        column: columnKey,
        value,
      });
    }, 300);
  }, [updateCellMutation]);

  const columns = React.useMemo(() => {
    // Always return a consistent array structure
    const baseColumns: ColumnDef<TableData, unknown>[] = [
      {
        id: "rowNumber",
        header: "#",
        cell: (info: CellContext<TableData, unknown>) => info.row.index + 1,
        size: 40,
      }
    ];

    // Only add dynamic columns if tableData and columns exist
    if (tableData.length > 0) {
      const dynamicColumns = tableData
        .filter(column => !hiddenColumns.has(`column_${column.id}`)) // Filter out hidden columns
        .map((column) => ({
          id: `column_${column.id}`,
          accessorKey: `column_${column.id}`,
          header: column.name,
          cell: (info: CellContext<TableData, unknown>) => {
            const cellData = info.getValue();
            const rowId = info.row.original.id;
            const columnId = column.id;
            
            // Type check to ensure we have valid IDs
            if (typeof rowId !== "number" || typeof columnId !== "number") {
              return <span className="px-2 py-1 text-gray-400">Invalid cell</span>;
            }
            
            // Create a unique key for this cell to maintain local state
            // Include table ID to ensure uniqueness across different tables
            const cellKey = `${tableId}_${rowId}_${columnId}`;
            
            // Ensure we have a valid string or number for the input value
            const serverValue = typeof cellData === 'string' || typeof cellData === 'number' 
              ? String(cellData) 
              : '';

            return (
              <CellInput
                key={cellKey}
                initialValue={serverValue}
                rowId={rowId}
                columnId={columnId}
                columnType={column.type}
                onUpdate={handleCellUpdate}
              />
            );
          },
          size: 150,
        }));

      return [...baseColumns, ...dynamicColumns];
    }

    return baseColumns;
  }, [tableData, hiddenColumns, handleCellUpdate, tableId]);

  const table = useReactTable({
    data: allRows,
    columns: columns,
    getCoreRowModel: getCoreRowModel(),
    enableColumnResizing: true,
    columnResizeMode: 'onChange',
  });

  // Cleanup effect - always called
  React.useEffect(() => {
    return () => {
      if (debounceTimeout.current) {
        clearTimeout(debounceTimeout.current);
      }
    };
  }, []);

  if (isLoading || createRowMutation.isPending || createColumnMutation.isPending || isPending) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loading />
      </div>
    );
  }

  return(
    <div 
      ref={tableContainerRef}
    >
    <table className="border border-gray-300 select-none text-center">
      <thead className="bg-gray-100">
        {table.getHeaderGroups().map(headerGroup => (
          <tr key={headerGroup.id}>
            {headerGroup.headers.map(header => (
              <th
                key={header.id}
                className="border border-gray-300 px-3 py-2 text-left font-medium text-gray-700 relative"
                style={{ width: header.getSize() }}
              >
                {flexRender(header.column.columnDef.header, header.getContext())}

                {header.column.getCanResize() && (
                  <div
                    onMouseDown={header.getResizeHandler()}
                    onTouchStart={header.getResizeHandler()}
                    className="absolute right-0 top-0 h-full w-1 cursor-col-resize bg-gray-400 opacity-50"
                    style={{ transform: 'translateX(50%)' }}
                  />
                )}
              </th>
            ))}

            <AddColumnButton onAdd={(name, type) => {
              createColumnMutation.mutate({ tableId, name, type });
            }} />
          </tr>
        ))}
      </thead>
      <tbody className="bg-white">
        {table.getRowModel().rows.map(row => (
          <tr key={row.id}>
            {row.getVisibleCells().map(cell => (
              <td
                key={cell.id}
                className="border border-gray-300 text-sm text-gray-800"
              >
                {flexRender(cell.column.columnDef.cell, cell.getContext())}
              </td>
            ))}
          </tr>
        ))}

        <tr>
          <td colSpan={columns.length}>
            <div ref={loadMoreRef} className="h-1" />
          </td>
        </tr>

        {isFetchingNextPage && (
            <tr>
              <td colSpan={columns.length} className="text-center py-4">
                <Loading />
              </td>
            </tr>
          )}

        <tr>
          <td className="text-center border border-gray-300 cursor-pointer hover:bg-gray-100"
            onClick={() => {
              createRowMutation.mutate({ 
                tableId: tableId 
              });
            }}>
            <button
              className="text-lg text-gray-600 hover:text-black cursor-pointer"
            >
              +
            </button>
          </td>
        </tr>
      </tbody>
    </table>
    </div>
  )
}

// Export for use in parent component
export { type TableCellsProps, type SortConfig };