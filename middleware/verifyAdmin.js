const jwt = require('jsonwebtoken');

const verifyAdmin = (req, res, next) => {
    const token = req.header('Authorization')?.split(' ')[1];
    if (!token) return res.status(401).json({ message: "مفيش توكن يابا!" });

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (decoded.role !== 'admin') {
            return res.status(403).json({ message: "ممنوع الدخول لغير المديرين." });
        }
        req.user = decoded; 
        next(); // عدي يا باشا
    } catch (error) {
        res.status(401).json({ message: "التوكن بايظ." });
    }
};

module.exports = verifyAdmin;