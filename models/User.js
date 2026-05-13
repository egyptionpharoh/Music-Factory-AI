const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    username: { 
        type: String, 
        required: true 
    },
    email: { 
        type: String, 
        required: true, 
        unique: true 
    },
    password: { 
        type: String, 
        required: true 
    },
    // الصلاحيات: هل هو مستخدم عادي ولا أدمن؟
    role: { 
        type: String, 
        enum: ['user', 'admin'], 
        default: 'user' 
    },
    // الحالة: هل الحساب شغال ولا محظور؟
    status: { 
        type: String, 
        enum: ['active', 'blocked', 'suspended'], 
        default: 'active' 
    },
    credits: { 
        type: Number, 
        default: 10 
    },
    lastReset: {
        type: Date,
        default: Date.now 
    }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);