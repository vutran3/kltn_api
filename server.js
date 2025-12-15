require("dotenv").config();
const fs = require("fs");
const path = require("path");
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const cron = require("node-cron");
const morgan = require("morgan");
const routes = require("./src/routes");
const { PORT } = require("./src/config");
const connectMongoDB = require("./src/databases/mongodb.database");
const app = express();

const http = require("http");
const server = http.createServer(app);

const { initSocket } = require("./src/socket");
const deviceMonitorService = require("./src/services/device.monitor.service");
initSocket(server);

const WebSocket = require("ws");
const wss = new WebSocket.Server({
    server: server,
    path: "/ws/camera-stream"
});

wss.on("connection", function connection(ws) {
    console.log("[WS] Client connected to Camera Stream");

    ws.on("message", function incoming(data, isBinary) {
        wss.clients.forEach(function each(client) {
            if (client !== ws && client.readyState === WebSocket.OPEN) {
                client.send(data, { binary: isBinary });
            }
        });
    });

    ws.on("close", () => {
        console.log("[WS] Client disconnected");
    });
});

// ===== Cấu hình Express Middleware =====
const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

app.use(helmet());
app.use(cors());
app.use(morgan("dev"));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(
    cors({
        origin: "*"
    })
);
app.use("/api", routes);

app.use((err, req, res, next) => {
    console.error(err);
    res.status(err.status || 500).json({
        msg: err.message || "Server occurs error",
        status: err.status || 500
    });
});

// ===== Khởi chạy Server =====
server.listen(PORT, () => {
    connectMongoDB();
    cron.schedule("0 * * * *", async () => {
        console.log("Running Offline Check...");
        await deviceMonitorService.checkOfflineDevices();
    });
    console.log("Server is listening on port", PORT);
    console.log(`- Socket.IO path: /socket.io/`);
    console.log(`- WebSocket Stream path: /ws/camera-stream`);
});
