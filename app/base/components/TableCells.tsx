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

type TableCellsProps = {
  tableId: number;
};

type TableData = Record<string, string | number>;

// Separate component to handle individual cell input with local state
function CellInput({ 
  initialValue, 
  rowId, 
  columnId, 
  onUpdate 
}: {
  initialValue: string;
  rowId: number;
  columnId: number;
  onUpdate: (rowId: number, columnId: number, value: string) => void;
}) {
  const [localValue, setLocalValue] = React.useState(initialValue);

  // Update local state when server value changes
  React.useEffect(() => {
    setLocalValue(initialValue);
  }, [initialValue]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setLocalValue(newValue);
    onUpdate(rowId, columnId, newValue);
  };

  return (
    <input
      type="text"
      value={localValue}
      onChange={handleChange}
      className="w-full bg-transparent border-none outline-none px-2 py-1 focus:bg-blue-50"
    />
  );
}

export default function TableCells({ tableId }: TableCellsProps) {

  const utils = api.useUtils();
  const debounceTimeout = React.useRef<NodeJS.Timeout | null>(null);

  // Fetch the specific table data
  const { data: tableData, isLoading } = api.table.getById.useQuery(
    { id: tableId },
    { enabled: !!tableId }
  );

  // Create row
  const createRowMutation = api.base.createRow.useMutation({
    onSuccess: async () => {
      // Invalidate the specific table data query
      await utils.table.getById.invalidate({ id: tableId });
    },
    onError: (error) => {
      console.error("Failed to create row:", error);
    }
  });

  const createColumnMutation = api.base.createColumn.useMutation({
    onSuccess: async () => {
      // Invalidate the specific table data query
      await utils.table.getById.invalidate({ id: tableId });
    },
    onError: (error) => {
      console.error("Failed to create row:", error);
    }
  });

  const updateCellMutation = api.base.updateCell.useMutation({
    onMutate: async ({ rowId, column: columnId, value }) => {
      // Cancel any outgoing refetches
      await utils.table.getById.cancel({ id: tableId });

      // Snapshot the previous value
      const previousData = utils.table.getById.getData({ id: tableId });

      // Optimistically update the cache
      utils.table.getById.setData({ id: tableId }, (old) => {
        if (!old) return old;
        
        const updatedRows = old.rows?.map(row => {
          if (row.id === rowId) {
            return {
              ...row,
              [`column_${columnId}`]: value
            };
          }
          return row;
        });

        return {
          ...old,
          rows: updatedRows
        };
      });

      return { previousData };
    },
    onError: (err, variables, context) => {
      console.error("Failed to update cell:", err);
      // Revert on error
      if (context?.previousData) {
        utils.table.getById.setData({ id: tableId }, context.previousData);
      }
    },
    onSettled: async () => {
      // Always refetch after error or success to ensure we have the latest data
      await utils.table.getById.invalidate({ id: tableId });
    }
  });

  const handleCellUpdate = React.useCallback((rowId: number, columnKey: number, value: string) => {
    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current);
    }

    debounceTimeout.current = setTimeout(() => {
      updateCellMutation.mutate({
        rowId,
        column: columnKey,
        value,
      });
    }, 1500);
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
    if (tableData?.columns) {
      const dynamicColumns = tableData.columns.map((column) => ({
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
          const cellKey = `${rowId}_${columnId}`;
          
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
              onUpdate={handleCellUpdate}
            />
          );
        },
        size: 150,
      }));

      return [...baseColumns, ...dynamicColumns];
    }

    return baseColumns;
  }, [tableData?.columns, handleCellUpdate]);

  const table = useReactTable({
    data: tableData?.rows ?? [],
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

  if (isLoading || createRowMutation.isPending || createColumnMutation.isPending) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loading />
      </div>
    );
  }

  return(
    <table className="border border-gray-300 select-none">
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
                className="border border-gray-300 px-3 py-2 text-sm text-gray-800"
              >
                {flexRender(cell.column.columnDef.cell, cell.getContext())}
              </td>
            ))}
          </tr>
        ))}

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
  )
}