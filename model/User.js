const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    username: { 
        type: String, 
        required: true 
    },
    email: { 
        type: String, 
        required: true, 
        unique: true // يمنع تكرار الإيميل
    },
    password: { 
        type: String, 
        required: true 
    },
    credits: { 
        type: Number, 
        default: 10 // الرصيد الافتراضي لأي مستخدم جديد
    }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);