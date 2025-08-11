module.exports = {
    validateApiKey(req, res, next) {
        try {
            const key = req.header("x-api-key");
            if (!API_KEY) return res.status(500).json({ error: "Server missing API_KEY" });
            if (key !== API_KEY) return res.status(401).json({ error: "Invalid API key" });
            next();
        } catch (error) {
            next(error);
        }
    }
};
