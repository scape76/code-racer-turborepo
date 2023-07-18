import http from "node:http"
import express from "express"
import { Server } from "socket.io"

import { prisma, RaceParticipant, type Race } from "@code-racer/db"

// import { prisma } from "../../db/dist"
import { SocketEvents, SocketPayload } from "./events"
import { explode, RaceFullException } from "./exceptions"
import {
    GameStartCountdownPayload,
    gameStateUpdatePayloadSchema,
    ParticipantRacePayload,
    participantRacePayloadSchema,
    RaceParticipantNotification,
} from "./schemas"

const PORT = 3001
const app = express()
const server = http.createServer(app)
const io = new Server(server, {
    cors: {
        origin: "http://localhost:3000",
        methods: ["GET", "POST"],
    },
})

class Game {
    private static readonly START_GAME_COUNTDOWN = 5
    private static readonly MAX_PARTICIPANTS_PER_RACE = 4
    private static readonly GAME_LOOP_INTERVAL = 2000
    private activeCountdowns = new Map<Race["id"], Promise<void>>()

    private races = new Map<
        Race["id"],
        {
            status: "waiting" | "running" | "finished"
            participants: {
                id: RaceParticipant["id"]
                socketId: string
                // Position here is the % of the snippet this user completed.
                position: number
            }[]
        }
    >()

    constructor(
        private server: typeof io,
        private db: typeof prisma,
    ) {
        this.initialize()
    }

    private initialize() {
        this.server.on("connection", (socket) => {
            socket.on(SocketEvents.USER_RACE_ENTER, (payload) => {
                this.handlePlayerEnterRace(payload)
            })
            socket.on("disconnect", () => {
                // find the race where the participant's socketId matches socket.id
                for (const [raceId, race] of this.races.entries()) {
                    for (const participant of race.participants) {
                        if (participant.socketId === socket.id) {
                            this.handlePlayerLeaveRace({
                                participantId: participant.id,
                                raceId,
                                socketId: socket.id,
                            })
                        }
                    }
                }
            })
            socket.on(SocketEvents.USER_RACE_LEAVE, (payload) => {
                this.handlePlayerLeaveRace(payload)
            })
        })
    }

    private async handlePlayerEnterRace(payload: ParticipantRacePayload) {
        const parsedPayload = participantRacePayloadSchema.parse(payload)

        console.log("Player entering race:", payload)
        const race = this.races.get(parsedPayload.raceId)

        if (!race) {
            this.races.set(parsedPayload.raceId, {
                status: "waiting",
                participants: [
                    {
                        socketId: parsedPayload.socketId,
                        id: parsedPayload.participantId,
                        position: 0,
                    },
                ],
            })
        } else if (
            race.participants.length + 1 >
            Game.MAX_PARTICIPANTS_PER_RACE
        ) {
            //TODO: Handle this exception
            throw new RaceFullException()
        } else {
            race.participants.push({
                socketId: parsedPayload.socketId,
                id: parsedPayload.participantId,
                position: 0,
            })
            this.startRaceCountdown(parsedPayload.raceId)
        }

        // Attach an event listener to the "GAME_START" event to start the race.
        this.server.on(
            `RACE_${parsedPayload.raceId}`,
            (payload: SocketPayload) => {
                if (payload.type === "GAME_START") {
                    this.startRace(parsedPayload.raceId)
                }
            },
        )

        console.log("Races: ", this.races)

        // Emit to all players in the room that a new player has joined.
        this.server.emit(`RACE_${parsedPayload.raceId}`, {
            type: "USER_RACE_ENTER",
            payload: {
                participantId: parsedPayload.participantId,
                socketId: parsedPayload.socketId,
            } satisfies RaceParticipantNotification,
        } satisfies SocketPayload)
    }

    private async handlePlayerLeaveRace(payload: ParticipantRacePayload) {
        const parsedPayload = participantRacePayloadSchema.parse(payload)
        console.log("Player leaving race: ", parsedPayload)

        const race =
            this.races.get(parsedPayload.raceId) ??
            explode("Yippity iuppity this server is a pile of poopity")

        race.participants = race.participants.filter(
            (participant) => participant.id !== parsedPayload.participantId,
        )

        this.server.emit(`RACE_${parsedPayload.raceId}`, {
            type: "USER_RACE_LEAVE",
            payload: {
                participantId: parsedPayload.participantId,
                socketId: parsedPayload.socketId,
            } satisfies RaceParticipantNotification,
        } satisfies SocketPayload)

        if (race.participants.length === 0) {
            this.endRace(parsedPayload.raceId)
        }

        console.log("Races: ", this.races)
    }

    private startRace(raceId: string) {
        const interval = setInterval(() => {
            const race = this.races.get(raceId)
            if (race) {
                if (race.status !== "running") {
                    race.status = "running"
                }

                this.server.emit(`RACE_${raceId}`, {
                    type: "GAME_STATE_UPDATE",
                    payload: { raceState: { ...race, id: raceId } },
                } as SocketPayload)
            } else {
                clearInterval(interval)
            }
        }, Game.GAME_LOOP_INTERVAL)
    }

    private endRace(raceId: string) {
        const race =
            this.races.get(raceId) ?? explode("Why tf would this happen?")

        race.status = "finished"

        this.server.emit(`RACE_${raceId}`, {
            type: "GAME_STATE_UPDATE",
            payload: { raceState: race },
        } as SocketPayload)

        this.races.delete(raceId)
        this.db.race.update({
            where: {
                id: raceId,
            },
            data: {
                endedAt: new Date(),
            },
        })
    }

    private startRaceCountdown(raceId: string) {
        if (this.activeCountdowns.has(raceId)) {
            return
        }

        const countdownPromise = new Promise<void>((resolve) => {
            let countdown = Game.START_GAME_COUNTDOWN
            const interval = setInterval(() => {
                this.server.emit(`RACE_${raceId}`, {
                    type: "GAME_START_COUNTDOWN",
                    payload: { countdown },
                } satisfies SocketPayload)
                countdown--

                if (countdown === 0) {
                    clearInterval(interval)
                    this.server.emit(`RACE_${raceId}`, {
                        type: "GAME_START",
                        payload: undefined,
                    } satisfies SocketPayload)
                    resolve()
                }
            }, 1000)
        }).then(() => {
            this.activeCountdowns.delete(raceId)
        })

        this.activeCountdowns.set(raceId, countdownPromise)
    }
}

server.listen(PORT, () => {
    console.log(`WS Server listening on port ${PORT}`)
    new Game(io, prisma)
})
