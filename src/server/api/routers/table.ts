import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/src/server/api/trpc";
import { faker } from '@faker-js/faker';
import { Prisma } from "@prisma/client";

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

    // Get the current max order
    const lastOrderResult = await ctx.db.$queryRaw<{ max_order: number | null }[]>`
      SELECT MAX("order") AS max_order FROM "Row" WHERE "tableId" = ${tableId}
    `;
    const lastOrder = lastOrderResult[0]?.max_order ?? -1;

    // Single transaction with optimized bulk insert
    await ctx.db.$transaction(async (tx) => {
      // Create all rows at once
      const newRows = await tx.$queryRaw<{ id: number, order: number }[]>`
        INSERT INTO "Row" ("order", "tableId")
        SELECT 
          generate_series(${lastOrder + 1}, ${lastOrder + count}), 
          ${tableId}
        RETURNING "id", "order"
      `;

      // Prepare all cell data
      type CellData = {
        rowId: number;
        columnId: number;
        value: string | null;
        numericValue: number | null;
      };
      
      const cellsData: CellData[] = [];
      
      for (const row of newRows) {
        for (const column of table.columns) {
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
              value = null;
              numericValue = null;
          }

          cellsData.push({
            rowId: row.id,
            columnId: column.id,
            value,
            numericValue
          });
        }
      }

      // Single bulk insert for all cells
      if (cellsData.length > 0) {
        const values = cellsData.map(cell => 
          `(${cell.rowId}, ${cell.columnId}, ${cell.value ? `'${cell.value.replace(/'/g, "''")}'` : 'NULL'}, ${cell.numericValue ?? 'NULL'})`
        ).join(',');

        await tx.$executeRaw`
          INSERT INTO "Cell" ("rowId", "columnId", "value", "numericValue")
          VALUES ${Prisma.raw(values)}
        `;
      }
    }, {
      timeout: 30000, // 30 seconds timeout
    });

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
      sorts: z.array(z.object({
        columnId: z.number(),
        direction: z.enum(['asc', 'desc']),
        priority: z.number(),
      })).optional(),
    })
  )
  .query(async ({ ctx, input }) => {
    const { tableId, limit, cursor, sorts } = input;
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

    // Define proper types for sort columns using the actual column type from database
    type ColumnWithSort = {
      column: typeof columns[0]; // Use the actual type from the query
      direction: string;
    };

    // Process multiple sorts
    let sortColumns: ColumnWithSort[] = [];
    if (sorts && sorts.length > 0) {
      // Sort by priority and validate columns exist
      const validSorts = sorts
        .sort((a, b) => a.priority - b.priority) // Sort by priority
        .map(sort => {
          const column = columns.find(col => col.id === sort.columnId);
          return column ? { column, direction: sort.direction.toUpperCase() } : null;
        })
        .filter((item): item is NonNullable<typeof item> => item !== null); // Better type guard
      
      sortColumns = validSorts;
    }

    // Build the query with multiple sorts
    let rawQuery: string;
    const queryParams: (number | string | null)[] = [tableId];

    if (sortColumns.length > 0) {
      // Build ORDER BY clause with multiple columns
      const orderByParts = sortColumns.map((sortCol, index) => {
        const sortField = sortCol.column.type === 'NUMBER' ? 'numericValue' : 'value';
        const joinAlias = `sort_cell_${index}`;
        return `${joinAlias}."${sortField}" ${sortCol.direction} NULLS LAST`;
      });
      
      // Build JOIN clauses
      const joinParts = sortColumns.map((sortCol, index) => {
        queryParams.push(sortCol.column.id);
        const joinAlias = `sort_cell_${index}`;
        const paramIndex = queryParams.length;
        return `LEFT JOIN "Cell" ${joinAlias} ON ${joinAlias}."rowId" = r."id" AND ${joinAlias}."columnId" = $${paramIndex}`;
      });

      const orderByClause = orderByParts.join(', ') + ', r."order" ASC';
      const joinClause = joinParts.join(' ');

      if (cursor) {
        const cursorParamIndex = queryParams.length + 1;
        const limitParamIndex = queryParams.length + 2;
        rawQuery = `
          SELECT r."id", r."order"
          FROM "Row" r
          ${joinClause}
          WHERE r."tableId" = $1 AND r."id" > $${cursorParamIndex}
          ORDER BY ${orderByClause}
          LIMIT $${limitParamIndex}
        `;
        queryParams.push(cursor, limit + 1);
      } else {
        const limitParamIndex = queryParams.length + 1;
        rawQuery = `
          SELECT r."id", r."order"
          FROM "Row" r
          ${joinClause}
          WHERE r."tableId" = $1
          ORDER BY ${orderByClause}
          LIMIT $${limitParamIndex}
        `;
        queryParams.push(limit + 1);
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

      columns.forEach(column => {
        const cell = cells.find(c => c.rowId === row.id && c.columnId === column.id);
        const key = `column_${column.id}`;
        
        if (cell) {
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