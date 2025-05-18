import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/src/server/api/trpc";

export const baseRouter = createTRPCRouter({
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      const base = await ctx.db.base.create({
        data: {
          name: input.name,
          userId,
        },
      });

      return base;
    }),

    list: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;

    return await ctx.db.base.findMany({
      where: { userId }
    });
  }),
});