const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');
const User = require('../models/User'); // لاحظ النقطتين للرجوع للفولدر الرئيسي
const { hashPassword, comparePassword } = require('../authUtils');
const verifyToken = require('../middleware/auth');

// 🛡️ فلتر التحقق
const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ error: errors.array()[0].msg });
    }
    next();
};

// 🛡️ قواعد البيانات
const registerValidation = [
    body('username').trim().notEmpty().withMessage('الاسم مطلوب').isLength({ min: 3 }).escape(),
    body('email').isEmail().withMessage('بريد إلكتروني غير صحيح').normalizeEmail(),
    body('password').isLength({ min: 6 }).withMessage('كلمة المرور 6 حروف على الأقل'),
    validate
];

const loginValidation = [
    body('email').isEmail().withMessage('بريد إلكتروني غير صحيح').normalizeEmail(),
    body('password').notEmpty().withMessage('كلمة المرور مطلوبة'),
    validate
];

// 🛡️ حماية المسارات (Rate Limiters)
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: { error: "محاولات دخول كثيرة، برجاء الانتظار 15 دقيقة." }
});

const registerLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, 
    max: 2, 
    message: { error: "عفواً، قمت بإنشاء حسابات كثيرة. جرب ثانية بعد ساعة." }
});

// 🛠️ مسار الدخول
router.post('/login', loginLimiter, loginValidation, async (req, res) => {
    try {
        let { email, password } = req.body;
        const cleanEmail = email.trim().toLowerCase();
        
        const user = await User.findOne({ email: cleanEmail });
        if (!user) return res.status(401).json({ error: "بيانات الدخول غير صحيحة" });

        const isMatch = await comparePassword(password.trim(), user.password);
        if (!isMatch) return res.status(401).json({ error: "بيانات الدخول غير صحيحة" });

        const token = jwt.sign(
            { userId: user._id, email: user.email },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.status(200).json({ 
            message: "تم تسجيل الدخول بنجاح",
            token: token,
            userData: { username: user.username, email: user.email, credits: user.credits } 
        });
    } catch (error) {
        console.error("خطأ في عملية الدخول:", error);
        res.status(500).json({ error: "حدث خطأ في السيرفر أثناء تسجيل الدخول" });
    }
});

// 🛠️ مسار التسجيل
router.post('/register', registerLimiter, registerValidation, async (req, res) => {
    try {
        const { email, password, username } = req.body;
        const cleanEmail = email.trim().toLowerCase();

        const existingUser = await User.findOne({ email: cleanEmail });
        if (existingUser) return res.status(400).json({ error: "الإيميل مستخدم بالفعل، جرّب تسجيل الدخول." }); 

        const hashedPassword = await hashPassword(password);
        const newUser = new User({ username, email: cleanEmail, password: hashedPassword, credits: 50 });
        await newUser.save();

        res.status(201).json({ message: "تم إنشاء الحساب بنجاح! يمكنك الآن تسجيل الدخول." });
    } catch (error) {
        if (error.code === 11000) return res.status(400).json({ error: "الإيميل مستخدم بالفعل، جرّب تسجيل الدخول." });
        console.error("خطأ في عملية التسجيل:", error);
        res.status(500).json({ error: "حدث خطأ داخلي في السيرفر أثناء إنشاء الحساب." });
    }
});

// 💰 فحص الرصيد (نقلناها هنا لأنها تابعة لحساب المستخدم)
router.get('/check-credits', verifyToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ error: "المستخدم غير موجود" });
        res.json({ credits: user.credits });
    } catch (error) {
        console.error("خطأ في فحص الرصيد:", error);
        res.status(500).json({ error: "خطأ في السيرفر أثناء فحص الرصيد" });
    }
});

module.exports = router;