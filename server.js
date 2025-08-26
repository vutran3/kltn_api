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

const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

app.use(helmet());
app.use(cors());
app.use(morgan("dev"));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

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

app.listen(PORT, () => {
    connectMongoDB();
    console.log("Server is listening on port", PORT);
});
