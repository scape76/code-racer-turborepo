//these are the events that are emitted by the server and listened to by the client
export const SocketEvents = {
    USER_RACE_ENTER: "USER_RACE_ENTER",
    USER_RACE_LEAVE: "USER_RACE_LEAVE",
    GAME_STATE_UPDATE: "GAME_STATE_UPDATE",
    GAME_START_COUNTDOWN: "GAME_START_COUNTDOWN",
    GAME_START: "GAME_START",
} as const

export type SocketEvent = (typeof SocketEvents)[keyof typeof SocketEvents]

export type SocketPayload = {
    type: SocketEvent
    payload: any
}
