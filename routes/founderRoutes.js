const express = require('express');
const router = express.Router();
const Founder = require('../models/Founder'); // استدعاء الموديل اللي لسه مجهزين أكواده

// مسار جلب بيانات المؤسس
router.get('/', async (req, res) => {
    try {
        const founderData = await Founder.findOne();
        if (!founderData) {
            // لو الداتابيز فاضية، يبعت البيانات الافتراضية
            return res.json({
                name: "حسين الملك",
                bio: "مؤسس المنصة وموسيقي متخصص",
                imageUrl: "my-photo.jpg",
                title: "Founder & Lead Architect"
            });
        }
        res.json(founderData);
    } catch (err) {
        res.status(500).json({ message: "خطأ في السيرفر" });
    }
});

module.exports = router;