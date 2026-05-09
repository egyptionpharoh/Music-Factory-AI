const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: "خطأ في التوكن أو غير موجود. يرجى تسجيل الدخول." });
    }

    const token = authHeader.split(' ')[1];
    
    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) {
            return res.status(403).json({ error: "انتهت الجلسة أو التوكن غير صالح." });
        }
        // توحيد الـ ID عشان نمنع أي لخبطة في باقي الملفات
        req.user = decoded;
        req.user.id = decoded.userId || decoded.id || decoded._id; 
        next();
    });
};

module.exports = verifyToken;