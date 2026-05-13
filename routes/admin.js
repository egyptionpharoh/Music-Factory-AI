const express = require('express');
const router = express.Router();
const User = require('../models/User'); // استدعاء الموديل
const verifyAdmin = require('../middleware/verifyAdmin'); // استدعاء الحماية

// مسار عرض المستخدمين
// التعديل ده في ملف routes/admin.js
router.get('/users', verifyAdmin, async (req, res) => {
    try {
        const users = await User.find({}, 'email role status createdAt').sort({ createdAt: -1 });
        // بنحط users بين أقواس {} عشان الفرونت إند في admin.html يقرأها صح
        res.json({ users }); 
    } catch (error) {
        res.status(500).json({ message: "خطأ في السيرفر" });
    }
});

// مسار البلوك/تغيير الحالة
router.patch('/change-status', verifyAdmin, async (req, res) => {
    const { userId, newStatus } = req.body;
    try {
        await User.findByIdAndUpdate(userId, { status: newStatus });
        res.json({ message: `تم تغيير الحالة لـ ${newStatus}` });
    } catch (error) {
        res.status(500).json({ message: "حصل خطأ" });
    }
});

module.exports = router;