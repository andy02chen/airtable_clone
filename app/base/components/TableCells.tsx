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

type TableCellsProps = {
  tableId: number;
};

type TableData = Record<string, string | number>;

export default function TableCells({ tableId }: TableCellsProps) {

  const utils = api.useUtils();

  // Fetch the specific table data
  const { data: tableData, isLoading } = api.table.getById.useQuery(
    { id: tableId },
    { enabled: !!tableId }
  );

  // Create row
  const createRowMutation = api.base.createRow.useMutation({
    onSuccess: () => {
      // Invalidate the specific table data query
      utils.table.getById.invalidate({ id: tableId });
    },
    onError: (error) => {
      console.error("Failed to create row:", error);
    }
  });

  const columns = React.useMemo(() => {
    if (!tableData?.columns) return [];

    const dynamicColumns = tableData.columns.map((column) => ({
      id: `column_${column.id}`,
      accessorKey: `column_${column.id}`,
      header: column.name,
      cell: (info: CellContext<TableData, unknown>) => {
        const cellData = info.getValue();
        
        // Ensure we have a valid string or number for the input value
        const displayValue = typeof cellData === 'string' || typeof cellData === 'number' 
          ? cellData 
          : '';

        return (
          <input
            type="text"
            value={String(displayValue)}
            onChange={(e) => {
              // TODO: Implement cell update logic
              const newValue = e.target.value;
              
              console.log("Cell update:", {
                rowId: info.row.original.id,
                columnId: column.id,
                value: newValue,
              });
            }}
            className="w-full bg-transparent border-none outline-none px-2 py-1 focus:bg-blue-50"
          />
        );
      },
      size: 150,
    }));

    return [
      {
        id: "rowNumber",
        header: "#",
        cell: (info: CellContext<TableData, unknown>) => info.row.index + 1,
        size: 40,
      },
      ...dynamicColumns,
    ] as ColumnDef<TableData, unknown>[];
  }, [tableData?.columns]);

  const table = useReactTable({
    data: tableData?.rows ?? [],
    columns: columns,
    getCoreRowModel: getCoreRowModel(),
    enableColumnResizing: true,
    columnResizeMode: 'onChange',
  });

  if (isLoading) {
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

          <th className="w-[50px] border border-gray-300 text-center cursor-pointer hover:bg-gray-50">
            <button
              className="text-lg text-gray-600 hover:text-black cursor-pointer"
              title="Add Column"
            >
              +
            </button>
          </th>
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