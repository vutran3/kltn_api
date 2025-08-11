const dev = {
    PORT: process.env.DEV_PORT,
    API_KEY: process.env.API_KEY,
    MONGODB_URI: process.env.DEV_MONGODB_URI
};

const pro = {
    PORT: process.env.PROD_PORT,
    API_KEY: process.env.API_KEY,
    MONGODB_URI: process.env.PROD_MONGODB_URI
};

const config = {
    dev,
    pro
};

module.exports = config[process.env.NODE_ENV || "dev"];
