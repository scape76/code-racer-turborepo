import fastify from "fastify";
import fastifyIO from "fastify-socket.io";
import cors from "@fastify/cors";

const server = fastify();
server.register(fastifyIO);
server.register(cors, {
    origin: "*"
});

server.get("/", (req, reply) => {
    server.io.emit("hello");
});

server.ready().then(() => {
    // we need to wait for the server to be ready, else `server.io` is undefined
    server.io.on("connection", (socket) => {
        // ...
        console.log("connected:", socket.id);
    });
});


console.log("Server listening on port 3001");
server.listen({
    port: 3001,
    host: "0.0.0.0"
});
