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

  add100krows: protectedProcedure
  .input(z.object({
    tableId: z.number(),
    count: z.number().min(1).max(100000).default(100000)
  }))
  .mutation(async ({ ctx, input }) => {
    const { tableId, count } = input;
    const userId = ctx.session.user.id;

    // Verify user has access to the table
    const table = await ctx.db.table.findFirst({
      where: {
        id: tableId,
        base: { userId },
      },
      include: {
        columns: true
      }
    });

    if (!table) {
      throw new Error("Table not found or access denied");
    }

    // Get the current max order outside transaction
    const lastOrderResult = await ctx.db.$queryRaw<{ max_order: number | null }[]>`
      SELECT MAX("order") AS max_order FROM "Row" WHERE "tableId" = ${tableId};
    `;
    const lastOrder = lastOrderResult[0]?.max_order ?? -1;

    // Process in chunks of 10,000 rows
    const chunkSize = 10000;
    let processed = 0;

    while (processed < count) {
      const currentChunk = Math.min(chunkSize, count - processed);
      
      await ctx.db.$transaction(async (tx) => {
        // Create rows for this chunk
        const newRows = await tx.$queryRaw<{ id: number, order: number }[]>`
          INSERT INTO "Row" ("order", "tableId")
          SELECT 
            generate_series(${lastOrder + 1 + processed}, ${lastOrder + processed + currentChunk}), 
            ${tableId}
          RETURNING "id", "order";
        `;

        // Prepare cells with faker data for this chunk
        const cellsData: { rowId: number; columnId: number; value: string | null; numericValue: number | null }[] = [];
        
        for (const row of newRows) {
          for (const column of table.columns) {
            let value: string | null = null;
            let numericValue: number | null = null;

            // Generate faker data based on column name (matching your create logic)
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
                // For non-default columns, keep as null or set a default value
                value = null;
                numericValue = null;
            }

            cellsData.push({
              rowId: row.id,
              columnId: column.id,
              value,
              numericValue,
            });
          }
        }

        // Insert cells in smaller batches
        const batchSize = 2000;
        for (let i = 0; i < cellsData.length; i += batchSize) {
          const batch = cellsData.slice(i, i + batchSize);
          await tx.$queryRaw`
            INSERT INTO "Cell" ("rowId", "columnId", "value", "numericValue")
            SELECT
              unnest(${batch.map(c => c.rowId)}::int[]),
              unnest(${batch.map(c => c.columnId)}::int[]),
              unnest(${batch.map(c => c.value ?? null)}::text[]),
              unnest(${batch.map(c => c.numericValue ?? null)}::numeric[])
          `;
        }
      });

      processed += currentChunk;
    }

    return {
      count,
      firstOrder: lastOrder + 1,
      lastOrder: lastOrder + count
    };
  }),

  infiniteScroll: protectedProcedure
  .input(z.object({ 
    tableId: z.number(),
    limit: z.number().min(1).max(100).default(50),
    cursor: z.number().optional(),
  }))
  .query(async ({ input, ctx }) => {
    const { tableId, limit, cursor = 0 } = input;
    const userId = ctx.session.user.id;

    // Verify user has access to the table
    const table = await ctx.db.table.findFirst({
      where: {
        id: tableId,
        base: { userId },
      },
      include: {
        columns: {
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!table) {
      throw new Error("Table not found or access denied");
    }

    const rows = await ctx.db.row.findMany({
      where: { tableId },
      orderBy: { order: 'asc' },
      skip: cursor,
      take: limit + 1, // Take one extra to check if there are more
      include: {
        cells: {
          include: {
            column: true,
          },
        },
      },
    });

    const hasNextPage = rows.length > limit;
    const items = hasNextPage ? rows.slice(0, -1) : rows;

    // Transform the data
    const transformedData = items.map((row) => {
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
      items: transformedData,
      nextCursor: hasNextPage ? cursor + limit : undefined,
      columns: table.columns,
    };
  }),

  getColumns: protectedProcedure
    .input(z.object({ tableId: z.number() }))
    .query(async ({ input, ctx }) => {
      const userId = ctx.session.user.id;

      const table = await ctx.db.table.findFirst({
        where: {
          id: input.tableId,
          base: { userId },
        },
      });

      if (!table) {
        throw new Error("Table not found or access denied");
      }

      const columns = await ctx.db.column.findMany({
        where: { tableId: input.tableId },
        orderBy: { order: 'asc' },
        select: {
          id: true,
          name: true,
          type: true,
          order: true,
        },
      });

      return columns;
    }),
});