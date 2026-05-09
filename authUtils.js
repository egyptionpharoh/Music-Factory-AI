const bcrypt = require('bcrypt');

// قوة التشفير (كل ما زاد الرقم زاد الأمان وزاد الضغط على المعالج)
const SALT_ROUNDS = 12;

/**
 * تشفير كلمة المرور
 */
async function hashPassword(password) {
    if (!password || password.length < 6) {
        throw new Error('كلمة المرور ضعيفة أو فارغة');
    }
    return await bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * مقارنة كلمة المرور بالنص المشفر (الهاش)
 */
async function comparePassword(plainPassword, hashedPassword) {
    return await bcrypt.compare(plainPassword, hashedPassword);
}

// تصدير الدوال عشان نستخدمها في ملف السيرفر
module.exports = {
    hashPassword,
    comparePassword
};