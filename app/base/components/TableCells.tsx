import React from "react";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  createColumnHelper,
  createTable,
  type ColumnDef,
} from "@tanstack/react-table";


type Data = {
  default_column1: string
  default_column2: string
  default_column3: number
}

const defaultData: Data[] = [
  { default_column1: "fdsafsda", default_column2: "fdsa", default_column3: 28 },
  { default_column1: "RAFAFE", default_column2: "420", default_column3: 69 },
];

const columnHelper = createColumnHelper<Data>()

const defaultColumns = [
  columnHelper.accessor("default_column1", {
    header: () => "default_column1",
    cell: info => info.getValue(),
  }),
  columnHelper.accessor("default_column2", {
    header: () => "default_column2",
    cell: info => info.getValue(),
  }),
  columnHelper.accessor("default_column3", {
    header: () => "default_column3",
    cell: info => info.getValue(),
  }),
];

const columns = [
  {
    id: "rowNumber",
    header: "#",
    cell: info => info.row.index + 1,
    size: 40,
  },
  ...defaultColumns,
] as ColumnDef<Data, unknown>[];


export default function TableCells() {

  const table = useReactTable({
    data: defaultData,
    columns: columns,
    getCoreRowModel: getCoreRowModel(),
    enableColumnResizing: true,
    columnResizeMode: 'onChange', 
  });

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
          <td className="text-center border border-gray-300 cursor-pointer hover:bg-gray-100">
            <button
              className="text-lg text-gray-600 hover:text-black"
              title="Add Row"
            >
              +
            </button>
          </td>

          {defaultColumns.map((_, index) => (
            <td key={index} className="border border-gray-300 px-2 py-1" />
          ))}
        </tr>
      </tbody>
    </table>
  )
}