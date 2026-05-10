const mongoose = require('mongoose');

/**
 * Founder Schema - Music Factory AI
 * هذا المخطط يحدد هيكل بيانات المؤسس في قاعدة البيانات
 */
const founderSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'يجب إدخال اسم المؤسس'],
        trim: true
    },
    title: {
        type: String,
        required: [true, 'يجب إدخال المسمى الوظيفي'],
        trim: true
    },
    bio: {
        type: String,
        required: [true, 'يجب إدخال النبذة الشخصية (Bio)'],
        trim: true
    },
    imageUrl: {
        type: String,
        default: 'my-photo.jpg', // اسم الصورة الافتراضية في فولدر public
        trim: true
    },
    socialLinks: {
        email: { type: String, trim: true },
        facebook: { type: String, trim: true },
        twitter: { type: String, trim: true },
        linkedin: { type: String, trim: true }
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true // بيضيف أوتوماتيك وقت الإنشاء (createdAt) ووقت التحديث (updatedAt)
});

// تصدير الموديل لاستخدامه في ملفات الـ Routes
module.exports = mongoose.model('Founder', founderSchema);