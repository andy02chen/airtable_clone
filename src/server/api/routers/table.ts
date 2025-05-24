import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/src/server/api/trpc";
import { faker } from '@faker-js/faker';

export const tableRouter = createTRPCRouter({
  create: protectedProcedure
    .input(z.object({ 
      baseId: z.number(),
      name: z.string().min(1) 
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      const base = await ctx.db.base.findFirst({
        where: {
          id: input.baseId,
          userId,
        },
      });

      if (!base) {
        throw new Error("Base not found or access denied");
      }

      const result = await ctx.db.$transaction(async (tx) => {
        const table = await tx.table.create({
          data: { 
            name: input.name, 
            baseId: input.baseId 
          },
        });

        // Create default columns
        const createdColumns = await tx.$queryRaw<
          { id: number; name: string }[]
        >`
          INSERT INTO "Column" ("name", "type", "order", "tableId")
          VALUES
            ('First Name', 'TEXT', 0, ${table.id}),
            ('Last Name', 'TEXT', 1, ${table.id}),
            ('Age', 'NUMBER', 2, ${table.id})
          RETURNING "id", "name";
        `;

        // Create a few default rows
        const createdRows = await tx.$queryRaw<{ id: number }[]>`
          INSERT INTO "Row" ("order", "tableId")
          SELECT generate_series(0, 2), ${table.id}
          RETURNING "id";
        `;

        // Create empty cells for all row x column combinations
        const cellsData: { rowId: number; columnId: number; value: string | null; numericValue: number | null }[] = [];

      for (const row of createdRows) {
        for (const column of createdColumns) {
          let value: string | null = null;
          let numericValue: number | null = null;

          switch (column.name.toLowerCase()) {
            case "first name":
              value = faker.person.firstName();
              break;
            case "last name":
              value = faker.person.lastName();
              break;
            case "age":
              numericValue = faker.number.int({ min: 18, max: 99 });
              break;
            default:
              value = "N/A";
          }

          cellsData.push({
            rowId: row.id,
            columnId: column.id,
            value,
            numericValue,
          });
        }
      }

        await tx.cell.createMany({ data: cellsData });

        return table;
      });

      return result;
    }),

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

      const tables = await ctx.db.table.findMany({
        where: { baseId: input.baseId },
        orderBy: { id: 'asc' }, 
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
          base: true, 
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

      const transformedData = table.rows.map((row) => {
        const rowData: Record<string, string | number> = {
          id: row.id,
          order: row.order,
        };

        table.columns.forEach((column) => {
          const cell = row.cells.find((cell) => cell.columnId === column.id);
          
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