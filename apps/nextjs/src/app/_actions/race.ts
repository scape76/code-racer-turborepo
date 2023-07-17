"use server";

import { z } from "zod";
import { action } from "@/lib/actions";

/**
 * This should create a private room for the user
 * Not implemented. Need to decide on the multiplayer architecture
 **/
export const createPrivateRaceRoom = action(z.object({}), async () => {
  throw new Error("Not implemented");
});

export const joinRace = action(
  z.object({
    raceId: z.string(),
  }),
  async ({ raceId }, { prisma, user }) => {
    if (!user) throw new Error("Unauthorized");

    const { participants } = await prisma.race.findUniqueOrThrow({
      where: {
        id: raceId,
      },
      select: {
        participants: {
          select: {
            id: true,
          },
        },
      },
    });

    if (participants.includes({ id: user.id }))
      throw new Error("Already joined");

    return await prisma.race.update({
      where: {
        id: raceId,
      },
      data: {
        participants: {
          ...participants,
          connect: {
            id: user.id,
          },
        },
      },
    });
  },
);

export const leaveRace = action(
  z.object({
    raceId: z.string(),
  }),
  async ({ raceId }, { prisma, user }) => {
    if (!user) throw new Error("Unauthorized");

    const { participants } = await prisma.race.findUniqueOrThrow({
      where: {
        id: raceId,
      },
      select: {
        participants: {
          select: {
            id: true,
          },
        },
      },
    });

    if (!participants.includes({ id: user.id })) throw new Error("Not joined");

    return await prisma.race.update({
      where: {
        id: raceId,
      },
      data: {
        participants: {
          ...participants,
          disconnect: {
            id: user.id,
          },
        },
      },
    });
  },
);
