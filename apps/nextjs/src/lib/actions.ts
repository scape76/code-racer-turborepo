import { createSafeActionClient } from "next-safe-action";
import { getCurrentUser } from "./session";
import { prisma } from "@code-racer/db";

export const action = createSafeActionClient({
  buildContext: async () => {
    return {
      user: await getCurrentUser(),
      prisma: prisma,
    };
  },
});
