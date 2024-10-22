const jwt = require('jsonwebtoken');
const secretKey = 'doan_n116';

const authenticateJWT = (req, res, next) => {
    const authHeader = req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Unauthorized, token not provided' });
    }

    const token = authHeader.split(' ')[1];  // Tách phần "Bearer" khỏi token
    jwt.verify(token, secretKey, (err, result) => {
        if (err) {
            return res.status(403).json({ message: 'Forbidden, token invalid' });
        }
        req.user = result.user|| result;
        next();
    });
};

module.exports = authenticateJWT;
