require("dotenv").config();
const fs = require("fs");
const path = require("path");
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const routes = require("./src/routes");
const { PORT } = require("./src/config");
const connectMongoDB = require("./src/databases/mongodb.database");
const app = express();

// ===== Tạo http server & socket.io =====

const http = require("http");
const server = http.createServer(app);
const { initSocket } = require("./src/socket");
const io = initSocket(server);

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

app.use("/api/upload", express.raw({ type: "image/jpeg", limit: "20mb" }));

app.post("/api/upload", (req, res) => {
    try {
        const buf = req.body; // Buffer ảnh
        const filename = `frame_${Date.now()}.jpg`;
        const filepath = path.join(uploadDir, filename);

        fs.writeFileSync(filepath, buf);
        console.log(`Saved ${filename} (${buf.length} bytes)`);

        res.json({ ok: true, file: filename, size: buf.length });
    } catch (e) {
        console.error(e);
        res.status(500).json({ ok: false, error: String(e) });
    }
});

app.use((err, req, res, next) => {
    console.error(err);
    res.status(err.status || 500).json({
        msg: err.message || "Server occurs error",
        status: err.status || 500
    });
});

// schedules[devId] = { enabled, onTime, offTime, days }
const schedules = {};
// commands[devId] = { value: 'on'|'off', expireAt: epochSeconds }
const commands = {};
// device states (optional, để xem trạng thái hiện tại gửi về)
const deviceStates = {}; // { [devId]: { relay: 'on'|'off', at: epochSeconds } }

// Small helpers
const nowSec = () => Math.floor(Date.now() / 1000);

// ---------- Routes ----------

// Set/replace schedule for a device
app.post("/api/devices/:id/schedule", (req, res) => {
    const devId = req.params.id;
    const { enabled = false, onTime = "06:00", offTime = "06:10", days = [1, 2, 3, 4, 5] } = req.body || {};
    schedules[devId] = { enabled, onTime, offTime, days };
    return res.json({ ok: true, schedule: schedules[devId] });
});

// Get current schedule (for debugging / dashboard)
app.get("/api/devices/:id/schedule", (req, res) => {
    const devId = req.params.id;
    return res.json({ schedule: schedules[devId] || null });
});

// Push a manual command with TTL (seconds). Example body: { value:'on', ttl:30 }
app.post("/api/devices/:id/command", (req, res) => {
    const devId = req.params.id;
    const { value, ttl = 30 } = req.body || {};
    if (!["on", "off"].includes((value || "").toLowerCase())) {
        return res.status(400).json({ error: "value must be 'on'|'off'" });
    }
    const expireAt = nowSec() + Math.max(1, Number(ttl));
    commands[devId] = { value: value.toLowerCase(), expireAt };
    return res.json({ ok: true, command: commands[devId] });
});

// Device polls here to get control pack
// Response shape:
// { now: epoch, command: {value, expireAt}|null, schedule: {enabled,onTime,offTime,days}|null }
app.get("/api/devices/:id/control", (req, res) => {
    const devId = req.params.id;
    const cmd = commands[devId];
    const validCommand = cmd && cmd.expireAt > nowSec() ? cmd : null;
    if (cmd && !validCommand) delete commands[devId]; // auto clean expired
    return res.json({
        now: nowSec(),
        command: validCommand,
        schedule: schedules[devId] || null
    });
});

// Device can POST its live state (optional)
app.post("/api/devices/:id/state", (req, res) => {
    const devId = req.params.id;
    const { relay } = req.body || {};
    deviceStates[devId] = { relay, at: nowSec() };
    res.json({ ok: true });
});

// Quick dashboard
app.get("/api/_debug", (req, res) => {
    res.json({ schedules, commands, deviceStates, now: nowSec() });
});

server.listen(PORT, () => {
    connectMongoDB();
    console.log("Server is listening on port", PORT);
});
