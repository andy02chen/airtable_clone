import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/src/server/api/trpc";
import { faker } from '@faker-js/faker';

export const baseRouter = createTRPCRouter({
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      const result = await ctx.db.$transaction(async (tx) => {

        const base = await tx.base.create({
          data: {
            name: input.name,
            userId,
          },
        });

        const table = await tx.table.create({
          data: {
            name: "Table 1",
            baseId: base.id,
          },
        });

        const columns = await tx.column.createMany({
          data: [
            {
              name: "First Name",
              type: "TEXT",
              order: 0,
              tableId: table.id,
            },
            {
              name: "Last Name",
              type: "TEXT",
              order: 1,
              tableId: table.id,
            },
            {
              name: "Age",
              type: "NUMBER",
              order: 2,
              tableId: table.id,
            },
          ],
        });

        const createdColumns = await tx.column.findMany({
          where: { tableId: table.id },
          orderBy: { order: 'asc' },
        });

        const rows = await tx.row.createMany({
          data: Array.from({ length: 5 }, (_, index) => ({
            order: index,
            tableId: table.id,
          })),
        });

        const createdRows = await tx.row.findMany({
          where: { tableId: table.id },
          orderBy: { order: 'asc' },
        });

        const cellsData = [];
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

        await tx.cell.createMany({
          data: cellsData,
        });

        return base;
      });

      return result;
    }),

  createRow: protectedProcedure.input(
    z.object({
      tableId: z.number()
    })
  )
  .mutation(async ({ctx, input}) => {
    const userId = ctx.session.user.id;

    const result = await ctx.db.$transaction(async (tx) => {
      const table = await tx.table.findFirst({
          where: { 
            id: input.tableId,
            base: { userId }
          },
        });

      const lastRow = await tx.row.findFirst({
          where: { tableId: input.tableId },
          orderBy: { order: 'desc' },
        });

      const newOrder = (lastRow?.order ?? -1) + 1;

      const newRow = await tx.row.create({
        data: {
          order: newOrder,
          tableId: input.tableId,
        },
      });

      const columns = await tx.column.findMany({
        where: { tableId: input.tableId },
        orderBy: { order: 'asc' },
      });

      const cellsData = columns.map(column => ({
        rowId: newRow.id,
        columnId: column.id,
        value: null,
        numericValue: null,
      }));

      if (cellsData.length > 0) {
          await tx.cell.createMany({
            data: cellsData,
          });
        }

        return newRow;
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