require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function listMyModels() {
    try {
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        // بنطلب من جوجل لستة الموديلات المتاحة لمفتاحك ده بالذات
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}`);
        const data = await response.json();
        
        console.log("--- الموديلات المتاحة لمفتاحك هي: ---");
        if (data.models) {
            data.models.forEach(m => console.log("- " + m.name.replace('models/', '')));
        } else {
            console.log("❌ المفتاح ده مش شايف أي موديلات! غالباً فيه مشكلة في الـ Project نفسه.");
            console.log("الرد من جوجل:", data);
        }
    } catch (e) {
        console.error("خطأ في الاتصال:", e);
    }
}

listMyModels();