const { Server, Socket } = require("socket.io");

let io;

function initSocket(httpServer) {
    io = new Server(httpServer, {
        cors: { origin: "*", methods: ["GET", "POST"] }
    });

    io.on("connection", (socket) => {
        socket.on("auth:join", (userId) => {
            if (userId) socket.join(String(userId));
        });
        socket.on("disconnect", (_) => {});
        socket.on("esp32-stream", (base64String) => {
            socket.broadcast.volatile.emit("live-stream", base64String);
        });
    });

    return io;
}

function getIO() {
    if (!io) throw new Error("Socket.io not initialized");
    return io;
}

module.exports = { initSocket, getIO };
