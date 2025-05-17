import { createTRPCRouter, publicProcedure } from "~/src/server/api/trpc";

export const baseRouter = createTRPCRouter({
  ping: publicProcedure.query(() => {
    return "pong";
  }),
});
