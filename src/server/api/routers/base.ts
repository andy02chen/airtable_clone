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

        const columns = await Promise.all([
          tx.column.create({
            data: {
              name: "firstname",
              type: "TEXT",
              order: 0,
              tableId: table.id,
            },
          }),
          tx.column.create({
            data: {
              name: "lastname",
              type: "TEXT",
              order: 1,
              tableId: table.id,
            },
          }),
          tx.column.create({
            data: {
              name: "Age",
              type: "NUMBER",
              order: 2,
              tableId: table.id,
            },
          }),
        ]);

        const rows = await Promise.all(
          Array.from({ length: 5 }, (_, index) =>
            tx.row.create({
              data: {
                order: index,
                tableId: table.id,
              },
            })
          )
        );

        const cellPromises = [];
        for (const row of rows) {
          for (const column of columns) {
            let value: string | null = null;
            let numericValue: number | null = null;

            switch (column.name.toLowerCase()) {
              case "firstname":
                value = faker.person.firstName();
                break;
              case "lastname":
                value = faker.person.lastName();
                break;
              case "age":
                numericValue = faker.number.int({ min: 18, max: 99 });
                break;
              default:
                value = "N/A";
            }

            cellPromises.push(
              tx.cell.create({
                data: {
                  rowId: row.id,
                  columnId: column.id,
                  value,
                  numericValue,
                },
              })
            );
          }
        }

        await Promise.all(cellPromises);

        return base;
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