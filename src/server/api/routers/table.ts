import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/src/server/api/trpc";
import { faker } from '@faker-js/faker';
import { Prisma } from "@prisma/client";

export const tableRouter = createTRPCRouter({
  getViews: protectedProcedure
  .input(z.object({
    tableId: z.number()
  }))
  .query(async ({ input, ctx }) => {
    const userId = ctx.session.user.id;

    const table = await ctx.db.table.findFirst({
      where : {
        id: input.tableId,
        base: {
          userId: userId
        }
      }
    });

    if (!table) {
      throw new Error("Table not found or access denied");
    }

    const views = await ctx.db.view.findMany({
      where: { tableId: input.tableId },
      include: {
        sortConfig: {
          orderBy: { priority: 'asc' }
        },
        filterConfig: true
      },
      orderBy: { id: 'asc' }
    });

    return views;
  }),

  createView: protectedProcedure
  .input(z.object({ 
      tableId: z.number(),
      name: z.string().min(1),
      searchQuery: z.string().optional(),
      sortConfig: z.array(z.object({
        columnId: z.number(),
        direction: z.enum(['asc', 'desc']),
        priority: z.number()
      })).optional(),
      filterConfig: z.array(z.object({
        columnId: z.number(),
        operator: z.enum(['gt', 'lt', 'not_empty', 'empty', 'contains', 'not_contains', 'eq']),
        value: z.string()
      })).optional()
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      const table = await ctx.db.table.findFirst({
        where : {
          id: input.tableId,
          base: {
            userId: userId
          }
        }
      });

      if (!table) {
        throw new Error("Table not found or access denied");
      }

      const view = await ctx.db.$transaction(async (tx) => {
        // Create the main view record
        const newView = await tx.view.create({
          data: {
            tableId: input.tableId,
            name: input.name,
            searchQuery: input.searchQuery ?? null
          }
        });

        // Create sort configurations if provided
        if (input.sortConfig && input.sortConfig.length > 0) {
          await tx.sortConfig.createMany({
            data: input.sortConfig.map(sort => ({
              viewId: newView.id,
              columnId: sort.columnId,
              direction: sort.direction,
              priority: sort.priority
            }))
          });
        }

        // Create filter configurations if provided
        if (input.filterConfig && input.filterConfig.length > 0) {
          await tx.filterConfig.createMany({
            data: input.filterConfig.map(filter => ({
              viewId: newView.id,
              columnId: filter.columnId,
              operator: filter.operator,
              value: filter.value
            }))
          });
        }

        // Return the complete view with its configurations
        return await tx.view.findUnique({
          where: { id: newView.id },
          include: {
            sortConfig: {
              orderBy: { priority: 'asc' }
            },
            filterConfig: true
          }
        });
      });

      return view;
    }),

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
      filters: z.array(z.object({
        columnId: z.number(),
        operator: z.enum(['gt', 'lt', 'not_empty', 'empty', 'contains', 'not_contains', 'eq']),
        value: z.string(),
      })).optional(),
      search: z.string().optional(),
    })
  )
  .query(async ({ ctx, input }) => {
    const { tableId, limit, cursor, sorts, filters, search } = input;
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
      column: typeof columns[0];
      direction: string;
    };

    type ColumnWithFilter = {
      column: typeof columns[0];
      operator: string;
      value: string;
    };

    // Process multiple sorts
    let sortColumns: ColumnWithSort[] = [];
    if (sorts && sorts.length > 0) {
      const validSorts = sorts
        .sort((a, b) => a.priority - b.priority)
        .map(sort => {
          const column = columns.find(col => col.id === sort.columnId);
          return column ? { column, direction: sort.direction.toUpperCase() } : null;
        })
        .filter((item): item is NonNullable<typeof item> => item !== null);
      
      sortColumns = validSorts;
    }

    // Process filters
    let filterColumns: ColumnWithFilter[] = [];
    if (filters && filters.length > 0) {
      const validFilters = filters
        .map(filter => {
          const column = columns.find(col => col.id === filter.columnId);
          return column ? { column, operator: filter.operator, value: filter.value } : null;
        })
        .filter((item): item is NonNullable<typeof item> => item !== null);
      
      filterColumns = validFilters;
    }

    // Build the query with multiple sorts, filters, and search
    const queryParams: (number | string | null)[] = [tableId];

    // Build JOIN clauses for sorting
    const sortJoinParts = sortColumns.map((sortCol, index) => {
      queryParams.push(sortCol.column.id);
      const joinAlias = `sort_cell_${index}`;
      const paramIndex = queryParams.length;
      return `LEFT JOIN "Cell" ${joinAlias} ON ${joinAlias}."rowId" = r."id" AND ${joinAlias}."columnId" = $${paramIndex}`;
    });

    // Build JOIN clauses for filtering
    const filterJoinParts = filterColumns.map((filterCol, index) => {
      queryParams.push(filterCol.column.id);
      const joinAlias = `filter_cell_${index}`;
      const paramIndex = queryParams.length;
      return `LEFT JOIN "Cell" ${joinAlias} ON ${joinAlias}."rowId" = r."id" AND ${joinAlias}."columnId" = $${paramIndex}`;
    });

    // Build JOIN clauses for search (if search term provided)
    let searchJoinParts: string[] = [];
    if (search?.trim()) {
      searchJoinParts = columns.map((col, index) => {
        queryParams.push(col.id);
        const joinAlias = `search_cell_${index}`;
        const paramIndex = queryParams.length;
        return `LEFT JOIN "Cell" ${joinAlias} ON ${joinAlias}."rowId" = r."id" AND ${joinAlias}."columnId" = $${paramIndex}`;
      });
    }

    // Build WHERE clauses for filtering
    const filterWhereParts = filterColumns.map((filterCol, index) => {
      const joinAlias = `filter_cell_${index}`;
      const field = filterCol.column.type === 'NUMBER' ? 'numericValue' : 'value';
      
      switch (filterCol.operator) {
        case 'gt':
          queryParams.push(parseFloat(filterCol.value));
          return `${joinAlias}."${field}" > $${queryParams.length}`;
        case 'lt':
          queryParams.push(parseFloat(filterCol.value));
          return `${joinAlias}."${field}" < $${queryParams.length}`;
        case 'not_empty':
          return `(${joinAlias}."${field}" IS NOT NULL AND ${joinAlias}."${field}" != '')`;
        case 'empty':
          return `(${joinAlias}."${field}" IS NULL OR ${joinAlias}."${field}" = '')`;
        case 'contains':
          queryParams.push(`%${filterCol.value}%`);
          return `${joinAlias}."${field}" ILIKE $${queryParams.length}`;
        case 'not_contains':
          queryParams.push(`%${filterCol.value}%`);
          return `(${joinAlias}."${field}" IS NULL OR ${joinAlias}."${field}" NOT ILIKE $${queryParams.length})`;
        case 'eq':
          if (filterCol.column.type === 'NUMBER') {
            queryParams.push(parseFloat(filterCol.value));
          } else {
            queryParams.push(filterCol.value);
          }
          return `${joinAlias}."${field}" = $${queryParams.length}`;
        default:
          return '1=1'; // Always true fallback
      }
    });

    // Build WHERE clause for search
    let searchWhereParts: string[] = [];
    if (search?.trim()) {
      const searchTerm = `%${search.trim()}%`;
      
      searchWhereParts = columns.map((col, index) => {
        const joinAlias = `search_cell_${index}`;
        const field = col.type === 'NUMBER' ? 'numericValue' : 'value';
        
        // For both NUMBER and TEXT columns, convert to text and use ILIKE for partial matching
        queryParams.push(searchTerm);
        return `${joinAlias}."${field}"::text ILIKE $${queryParams.length}`;
      });
    }

    // Build SELECT clause - include sorting columns to fix DISTINCT issue
    let selectClause = 'r."id", r."order"';
    const sortSelectParts = sortColumns.map((sortCol, index) => {
      const sortField = sortCol.column.type === 'NUMBER' ? 'numericValue' : 'value';
      const joinAlias = `sort_cell_${index}`;
      return `${joinAlias}."${sortField}" as sort_${index}`;
    });
    
    if (sortSelectParts.length > 0) {
      selectClause += ', ' + sortSelectParts.join(', ');
    }

    // Build ORDER BY clause
    let orderByClause = 'r."order" ASC';
    if (sortColumns.length > 0) {
      const orderByParts = sortColumns.map((sortCol, index) => {
        return `sort_${index} ${sortCol.direction} NULLS LAST`;
      });
      orderByClause = orderByParts.join(', ') + ', r."order" ASC';
    }

    // Combine all JOIN clauses
    const allJoinClauses = [...sortJoinParts, ...filterJoinParts, ...searchJoinParts].join(' ');

    // Build WHERE clause
    let whereClause = 'r."tableId" = $1';
    if (cursor) {
      queryParams.push(cursor);
      whereClause += ` AND r."id" > $${queryParams.length}`;
    }
    if (filterWhereParts.length > 0) {
      whereClause += ' AND ' + filterWhereParts.join(' AND ');
    }
    if (searchWhereParts.length > 0) {
      // Use OR to search across all columns
      whereClause += ' AND (' + searchWhereParts.join(' OR ') + ')';
    }

    // Add limit
    queryParams.push(limit + 1);
    const limitClause = `LIMIT $${queryParams.length}`;

    // Construct final query
    const rawQuery = `
      SELECT DISTINCT ${selectClause}
      FROM "Row" r
      ${allJoinClauses}
      WHERE ${whereClause}
      ORDER BY ${orderByClause}
      ${limitClause}
    `;

    // Execute the query
    const queryResult = await ctx.db.$queryRawUnsafe<Array<{ id: number; order: number; [key: string]: unknown }>>(
      rawQuery,
      ...queryParams
    );

    const hasNextPage = queryResult.length > limit;
    const items = hasNextPage ? queryResult.slice(0, -1) : queryResult;

    // Extract just the row info we need
    const rows = items.map(item => ({ id: item.id, order: item.order }));

    // Get all cells for these rows
    const rowIds = rows.map(row => row.id);
    
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
    const transformedItems = rows.map(row => {
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
      nextCursor: hasNextPage ? rows[rows.length - 1]?.id : undefined,
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