const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    username: { 
        type: String, 
        required: true 
    },
    email: { 
        type: String, 
        required: true, 
        unique: true // الإيميل لازم يكون غير مكرر
    },
    password: { 
        type: String, 
        required: true 
    },
    credits: { 
        type: Number, 
        default: 10 // الرصيد الافتراضي لأي مستخدم جديد
    },
    lastReset: {
        type: Date,
        default: Date.now // عشان نجدد له النقاط كل 24 ساعة
    }
}, { timestamps: true }); // بيسجل تلقائيا وقت إنشاء الحساب وتحديثه

module.exports = mongoose.model('User', userSchema);