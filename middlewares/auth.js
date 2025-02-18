const jwt = require("jsonwebtoken");
const auth = async (req, res, next) => {
    try {
        const token = req.cookies.token;
        if (!token) {
            return res.status(401).json({ status: false, message: "Access denied" });
        }
        const payload = jwt.verify(token, "jwtkey");
        req.user = payload;
        next();
    } catch (error) {
        res.status(401).json({ status: false, message: "Invalid token" });
    }
};

module.exports = auth;