const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const verifyToken = require('../middleware/auth');

// 1. إعداد محرك Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
// 2. قراءة قاعدة المعرفة (مره واحدة عند تشغيل السيرفر لسرعة الاستجابة)
let knowledgeBase = "";
try {
    const kbPath = path.join(__dirname, '../knowledge_base.json');
    const kbData = JSON.parse(fs.readFileSync(kbPath, 'utf8'));
    // تحويل الكائن لنص مفهوم للذكاء الاصطناعي
    knowledgeBase = JSON.stringify(kbData);
    console.log("✅ تم تحميل قاعدة المعرفة بنجاح في محرك الدردشة");
} catch (err) {
    console.error("⚠️ فشل تحميل knowledge_base.json:", err.message);
    knowledgeBase = "لا توجد معلومات إضافية حالياً.";
}

router.post('/', verifyToken, async (req, res, next) => {
    try {
        const { message } = req.body;
        if (!message) return res.status(400).json({ error: "الرسالة فارغة" });

        // 3. دمج قاعدة المعرفة مع رسالة المستخدم (System Prompt)
        const fullPrompt = `
            إليك معلومات أساسية عن مشروع "Music Factory AI":
            ${knowledgeBase}
            
            بناءً على هذه المعلومات، أجب على سؤال المستخدم التالي بصفتك "المايسترو الذكي":
            User Message: ${message}
        `;

        const result = await model.generateContent(fullPrompt);
        const aiReply = result.response.text();

        res.json({ reply: aiReply });
    } catch (error) {
        console.error("❌ خطأ في محرك المايسترو:", error);
        next(error); 
    }
});

module.exports = router;