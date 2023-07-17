import http from "node:http";
import cors from "cors";
import express from "express";
import { Server } from "socket.io";

const PORT = 3001;
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
  },
});

io.on("connection", (socket) => {
  console.log("A user connected: ", socket.id);
});

server.listen(PORT, () => {
  console.log(`WS Server listening on port ${PORT}`);
});
