import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/src/server/api/trpc";
import { faker } from '@faker-js/faker';

export const baseRouter = createTRPCRouter({
  create: protectedProcedure
  .input(z.object({ name: z.string().min(1) }))
  .mutation(async ({ ctx, input }) => {
    const userId = ctx.session.user.id;

    const result = await ctx.db.$transaction(async (tx) => {
      const base = await tx.base.create({
        data: { name: input.name, userId },
      });

      const table = await tx.table.create({
        data: { name: "Table 1", baseId: base.id },
      });

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

      const createdRows = await tx.$queryRaw<{ id: number }[]>`
        INSERT INTO "Row" ("order", "tableId")
        SELECT generate_series(0, 4), ${table.id}
        RETURNING "id";
      `;

      // Generate all cells for each row x column
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

      // Bulk insert using createMany (good enough here)
      await tx.cell.createMany({ data: cellsData });

      return base;
    });

    return result;
  }),
  
  createRow: protectedProcedure
  .input(z.object({ tableId: z.number() }))
  .mutation(async ({ ctx, input }) => {
    const userId = ctx.session.user.id;
    const { tableId } = input;

    const table = await ctx.db.table.findFirst({
      where: {
        id: tableId,
        base: { userId },
      },
    });

    const result = await ctx.db.$transaction(async (tx) => {
      const lastOrderResult = await tx.$queryRaw<{ max_order: number | null }[]>`
        SELECT MAX("order") AS max_order FROM "Row" WHERE "tableId" = ${tableId};
      `;
      const lastOrder = lastOrderResult[0]?.max_order ?? -1;
      const newOrder = lastOrder + 1;

      const newRowResult = await tx.$queryRaw<{ id: number }[]>`
        INSERT INTO "Row" ("order", "tableId")
        VALUES (${newOrder}, ${tableId})
        RETURNING "id";
      `;

      if (!newRowResult[0]) {
        throw new Error("Failed to insert new row");
      }

      const newRowId = newRowResult[0].id;

      await tx.$executeRaw`
        INSERT INTO "Cell" ("rowId", "columnId", "value", "numericValue")
        SELECT ${newRowId}, "id", NULL, NULL FROM "Column" WHERE "tableId" = ${tableId};
      `;

      return { id: newRowId, order: newOrder, tableId };
    });

    return result;
  }),

  list: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;

    return await ctx.db.base.findMany({
      where: { userId }
    });
  }),

  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input, ctx }) => {
      const base = await ctx.db.base.findUnique({
        where: { id: input.id },
      });

      if (!base || base.userId !== ctx.session.user.id) {
        return null;
      }

      return base;
    }),
});