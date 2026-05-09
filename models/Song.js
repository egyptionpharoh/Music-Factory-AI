const mongoose = require('mongoose');

const songSchema = new mongoose.Schema({
   userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true // ⚡ إضافة اندكس عشان البحث عن أغاني المستخدم يكون طلقة
    },
    sunoTaskId: {
        type: String, // رقم المهمة اللي هيرجع من سونو عشان نتابع بيه الأغنية
        required: false 
    },
    title: {
        type: String,
        default: 'أغنية جديدة'
    },
    prompt: {
        type: String, // الكلمات أو الوصف اللي المستخدم كتبه
        required: true
    },
    audioUrl: {
        type: String, // رابط الأغنية النهائي
        default: ''
    },
    imageUrl: {
        type: String, // رابط صورة الغلاف اللي سونو بيعملها
        default: ''
    },
    status: {
        type: String,
        enum: ['pending', 'processing', 'completed', 'failed'], // حالة الأغنية
        default: 'pending'
    }, // 👈 الفاصلة دي هي اللي كانت ناقصة وموقفة الكود
    errorMessage: {
        type: String, // 🚩 عشان لو سونو رفض الطلب نعرف السبب ونعرضه للمستخدم
        default: ''
    },
}, { timestamps: true }); // timestamps بتعمل تلقائياً تاريخ الإنشاء والتعديل

module.exports = mongoose.model('Song', songSchema);