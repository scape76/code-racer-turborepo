import { z } from "zod"

export const participantRacePayloadSchema = z.object({
    participantId: z.string(),
    socketId: z.string(),
    raceId: z.string(),
})

export type ParticipantRacePayload = z.infer<
    typeof participantRacePayloadSchema
>

export const raceParticipantNotificationSchema = z.object({
    participantId: z.string(),
    socketId: z.string(),
})

export type RaceParticipantNotification = z.infer<
    typeof raceParticipantNotificationSchema
>

export const gameStateUpdatePayloadSchema = z.object({
    raceState: z.object({
        id: z.string(),
        status: z.enum(["waiting", "running", "finished"]),
        participants: z.array(
            z.object({
                id: z.string(),
                socketId: z.string(),
                position: z.number(),
            }),
        ),
    }),
})

export type GameStateUpdatePayload = z.infer<
    typeof gameStateUpdatePayloadSchema
>

export const gameStartCountdownPayloadSchema = z.object({
    countdown: z.number().int(),
})

export type GameStartCountdownPayload = z.infer<
    typeof gameStartCountdownPayloadSchema
>
