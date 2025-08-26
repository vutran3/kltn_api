require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const routes = require("./src/routes");
const { PORT } = require("./src/config");
const connectMongoDB = require("./src/databases/mongodb.database");
const app = express();

app.use(helmet());
app.use(cors());
app.use(morgan("dev"));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use("/api", routes);

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
