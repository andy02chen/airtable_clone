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
    count: z.number().min(1).max(5000).default(5000)
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
    const chunkSize = 500;
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
        const batchSize = 50;
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
  .input(
    z.object({
      tableId: z.number(),
      limit: z.number().min(1).max(100).default(50),
      cursor: z.number().optional(),
      sort: z.object({
        columnId: z.number(),
        direction: z.enum(['asc', 'desc']),
      }).optional(),
    })
  )
  .query(async ({ ctx, input }) => {
    const { tableId, limit, cursor, sort } = input;
    const userId = ctx.session.user.id;

    // Verify table access
    const table = await ctx.db.table.findFirst({
      where: {
        id: tableId,
        base: { userId },
      },
    });

    if (!table) {
      throw new Error("Table not found or access denied");
    }

    // Get columns for this table
    const columns = await ctx.db.column.findMany({
      where: { tableId },
      orderBy: { order: 'asc' },
    });

    // Determine sort configuration
    let sortColumn = null;
    if (sort) {
      sortColumn = columns.find(col => col.id === sort.columnId);
    }

    // Build the query based on whether we're sorting or not
    let rawQuery: string;
    const queryParams: (number | string | null)[] = [tableId];

    if (sortColumn) {
      const direction = sort!.direction.toUpperCase();
      const sortField = sortColumn.type === 'NUMBER' ? 'numericValue' : 'value';
      
      if (cursor) {
        rawQuery = `
          SELECT r."id", r."order"
          FROM "Row" r
          LEFT JOIN "Cell" sort_cell ON sort_cell."rowId" = r."id" AND sort_cell."columnId" = $2
          WHERE r."tableId" = $1 AND r."id" > $3
          ORDER BY sort_cell."${sortField}" ${direction} NULLS LAST, r."order" ASC
          LIMIT $4
        `;
        queryParams.push(sort!.columnId, cursor, limit + 1);
      } else {
        rawQuery = `
          SELECT r."id", r."order"
          FROM "Row" r
          LEFT JOIN "Cell" sort_cell ON sort_cell."rowId" = r."id" AND sort_cell."columnId" = $2
          WHERE r."tableId" = $1
          ORDER BY sort_cell."${sortField}" ${direction} NULLS LAST, r."order" ASC
          LIMIT $3
        `;
        queryParams.push(sort!.columnId, limit + 1);
      }
    } else {
      // Default ordering by row order
      if (cursor) {
        rawQuery = `
          SELECT r."id", r."order"
          FROM "Row" r
          WHERE r."tableId" = $1 AND r."id" > $2
          ORDER BY r."order" ASC
          LIMIT $3
        `;
        queryParams.push(cursor, limit + 1);
      } else {
        rawQuery = `
          SELECT r."id", r."order"
          FROM "Row" r
          WHERE r."tableId" = $1
          ORDER BY r."order" ASC
          LIMIT $2
        `;
        queryParams.push(limit + 1);
      }
    }

    // Execute the query
    const rows = await ctx.db.$queryRawUnsafe<Array<{ id: number; order: number }>>(
      rawQuery,
      ...queryParams
    );

    const hasNextPage = rows.length > limit;
    const items = hasNextPage ? rows.slice(0, -1) : rows;

    // Get all cells for these rows
    const rowIds = items.map(row => row.id);
    
    if (rowIds.length === 0) {
      return {
        items: [],
        nextCursor: undefined,
        columns,
      };
    }

    const cells = await ctx.db.cell.findMany({
      where: {
        rowId: { in: rowIds },
        column: { tableId },
      },
      include: {
        column: true,
      },
    });

    // Transform data into the expected format
    const transformedItems = items.map(row => {
      const rowData: Record<string, string | number | null> = {
        id: row.id,
        order: row.order,
      };

      // Add cell data for each column
      columns.forEach(column => {
        const cell = cells.find(c => c.rowId === row.id && c.columnId === column.id);
        const key = `column_${column.id}`;
        
        if (cell) {
          // Use numericValue for NUMBER columns, value for TEXT columns
          rowData[key] = column.type === 'NUMBER' 
            ? (cell.numericValue?.toString() ?? '') 
            : (cell.value ?? '');
        } else {
          rowData[key] = '';
        }
      });

      return rowData;
    });

    return {
      items: transformedItems,
      nextCursor: hasNextPage ? items[items.length - 1]?.id : undefined,
      columns,
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