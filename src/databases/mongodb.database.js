const mongoose = require("mongoose");
const { MONGODB_URI } = require("../config");

const connectMongoDB = () => {
    try {
        mongoose.connection.on("connected", function () {
            console.log(`MongoDB: ${this.name} connected`);
        });

        mongoose.connection.on("error", (error) => {
            console.error(error);
        });

        mongoose.connect(MONGODB_URI);
    } catch (error) {
        console.error(error);
    }
};

module.exports = connectMongoDB;
