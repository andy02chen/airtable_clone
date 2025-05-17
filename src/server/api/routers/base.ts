import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";

export const baseRouter = createTRPCRouter({
  ping: publicProcedure.query(() => {
    return "pong";
  }),
});
