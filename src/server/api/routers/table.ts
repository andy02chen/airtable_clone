import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/src/server/api/trpc";

export const tableRouter = createTRPCRouter({
  // getByBaseId: protectedProcedure
  //   .input(z.object({ baseId: z.number() }))
  //   .query(async ({ input, ctx }) => {
  //     const userId = ctx.session.user.id;

  //     const base = await ctx.db.base.findUnique({
  //       where: { id: input.baseId },
  //     });

  //     if (!base || base.userId !== userId) {
  //       throw new Error("Base not found or access denied");
  //     }

  //     const table = await ctx.db.table.findFirst({
  //       where: { baseId: input.baseId },
  //       include: {
  //         columns: {
  //           orderBy: { order: 'asc' },
  //         },
  //         rows: {
  //           orderBy: { order: 'asc' },
  //           include: {
  //             cells: {
  //               include: {
  //                 column: true,
  //               },
  //             },
  //           },
  //         },
  //       },
  //     });

  //     if (!table) {
  //       return null;
  //     }

  //     const transformedData = table.rows.map((row) => {
  //       const rowData: Record<string, string | number> = {
  //         id: row.id,
  //         order: row.order,
  //       };

  //       table.columns.forEach((column) => {
  //         const cell = row.cells.find((cell) => cell.columnId === column.id);
          
  //         // Use numericValue if it exists, otherwise use value, otherwise empty string
  //         const displayValue = cell?.numericValue ?? cell?.value ?? "";
          
  //         rowData[`column_${column.id}`] = displayValue;
  //       });

  //       return rowData;
  //     });

  //     return {
  //       id: table.id,
  //       name: table.name,
  //       columns: table.columns,
  //       rows: transformedData,
  //     };
  //   }),

  getByBaseId: protectedProcedure
    .input(z.object({ baseId: z.number() }))
    .query(async ({ input, ctx }) => {
      const userId = ctx.session.user.id;

      const base = await ctx.db.base.findUnique({
        where: { id: input.baseId },
      });

      if (!base || base.userId !== userId) {
        throw new Error("Base not found or access denied");
      }

      // Get ALL tables for this base (not just the first one)
      const tables = await ctx.db.table.findMany({
        where: { baseId: input.baseId },
        orderBy: { id: 'asc' }, // Or whatever order you prefer
        select: {
          id: true,
          name: true,
        }
      });

      return tables;
    }),

    getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input, ctx }) => {
      const userId = ctx.session.user.id;

      const table = await ctx.db.table.findUnique({
        where: { id: input.id },
        include: {
          base: true, // Include base to check ownership
          columns: {
            orderBy: { order: 'asc' },
          },
          rows: {
            orderBy: { order: 'asc' },
            include: {
              cells: {
                include: {
                  column: true,
                },
              },
            },
          },
        },
      });

      if (!table || table.base.userId !== userId) {
        throw new Error("Table not found or access denied");
      }

      // Transform the data structure for react-table
      const transformedData = table.rows.map((row) => {
        const rowData: Record<string, string | number> = {
          id: row.id,
          order: row.order,
        };

        table.columns.forEach((column) => {
          const cell = row.cells.find((cell) => cell.columnId === column.id);
          
          // Use numericValue if it exists, otherwise use value, otherwise empty string
          const displayValue = cell?.numericValue ?? cell?.value ?? "";
          
          rowData[`column_${column.id}`] = displayValue;
        });

        return rowData;
      });

      return {
        id: table.id,
        name: table.name,
        baseId: table.baseId,
        columns: table.columns,
        rows: transformedData,
      };
    }),
});