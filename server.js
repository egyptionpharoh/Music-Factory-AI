require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
const rateLimit = require('express-rate-limit');

// 1. استيراد المسارات (Routes) - خلي كل الـ Requires فوق مع بعضها
const authRoutes = require('./routes/authRoutes');
const songRoutes = require('./routes/songRoutes');
const chatRoutes = require('./routes/chatRoutes');
const founderRoutes = require('./routes/founderRoutes');
const adminRoutes = require('./routes/admin'); // نديناها هنا عشان الترتيب

const app = express();
app.set('trust proxy', 1);
const isProd = process.env.NODE_ENV === 'production';

// 2. إعدادات الحماية والـ Middleware الأساسية
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdnjs.cloudflare.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
            imgSrc: ["'self'", "data:", "blob:"],
            connectSrc: ["'self'", "https://cdnjs.cloudflare.com", "https://api.replicate.com"],
            workerSrc: ["'self'", "blob:"]
        }
    }
}));
app.use(cors());
app.use(express.json({ limit: '100kb' }));

// 3. حراس البوابة (Rate Limiters)
const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 150,
    message: { error: "⚠️ طلبات كتير جداً، ارتاح 15 دقيقة وجرب تاني." }
});

// حماية خاصة للـ Auth (تسجيل الدخول) عشان الهكرز
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20, 
    message: { error: "⚠️ محاولات دخول كتير، جرب كمان شوية." }
});

app.use('/api/chat', globalLimiter);
app.use('/api/auth', authLimiter);

// 4. مجلد الصوتيات
const publicAudioDir = path.join(__dirname, 'public', 'audio');
if (!fs.existsSync(publicAudioDir)) {
    fs.mkdirSync(publicAudioDir, { recursive: true });
}
app.use('/audio', express.static(publicAudioDir));

// 5. عامل النظافة التلقائي
setInterval(() => {
    fs.readdir(publicAudioDir, (err, files) => {
        if (err) return;
        const now = Date.now();
        files.forEach(file => {
            const filePath = path.join(publicAudioDir, file);
            fs.stat(filePath, (err, stats) => {
                if (!err && (now - stats.mtimeMs > 3600000)) {
                    fs.unlink(filePath, () => console.log(`🗑️ تم تنظيف الملف القديم: ${file}`));
                }
            });
        });
    });
}, 3600000);

// 6. الاتصال بـ MongoDB
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('✅ تم الاتصال بقاعدة البيانات بنجاح'))
    .catch((err) => {
        console.error('🔥 خطأ حرج في قاعدة البيانات:', err.message);
        process.exit(1); 
    });

// 7. توجيه المرور (Routing) - الترتيب هنا "حياة أو موت"
app.use('/api/auth', authRoutes);    
app.use('/api/songs', songRoutes); 
app.use('/api/chat', chatRoutes);    
app.use('/api/founder', founderRoutes);
app.use('/api/admin', adminRoutes); // حطيناها هنا قبل الـ 404 عشان السيرفر يشوفها

// عرض ملفات الفرونت إند
app.use(express.static(path.join(__dirname, 'public')));

// 8. التعامل مع المسارات غير الموجودة (404)
app.use((req, res) => {
    if (req.originalUrl.startsWith('/api')) {
        res.status(404).json({ success: false, error: "❌ المسار المطلوب غير موجود." });
    } else {
        const indexPath = path.join(__dirname, 'public', 'index.html');
        if (fs.existsSync(indexPath)) {
            res.sendFile(indexPath);
        } else {
            res.status(404).send("واجهة المستخدم غير متوفرة حالياً.");
        }
    }
});

// 9. صمام الأمان الشامل (Error Handler)
app.use((err, req, res, next) => {
    console.error("🔥 خطأ حرج تم اصطياده:", err.stack);
    res.status(500).json({
        success: false,
        error: "⚠️ حدث خطأ داخلي في الخادم.",
        message: isProd ? "Internal error" : err.message
    });
});

// 10. تشغيل المحرك
const PORT_NUMBER = process.env.PORT || 8080;
app.listen(PORT_NUMBER, '0.0.0.0', () => {
    console.log(`🚀 Smart Maestro is LIVE on Port: ${PORT_NUMBER}`);
});