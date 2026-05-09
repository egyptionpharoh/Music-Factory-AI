const express = require('express');
const router = express.Router();
const Replicate = require('replicate');
const fetch = require('node-fetch'); 
const { GoogleGenerativeAI } = require("@google/generative-ai"); //
const { body, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');
const Song = require('../models/Song'); 
const User = require('../models/User');
const verifyToken = require('../middleware/auth');

// 1. إعداد المحركات
const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN });
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

// 2. وظيفة تحسين البرومبت (Prompt Architect) مع حماية التوقيت
const enhancePrompt = async (userPrompt) => {
    const systemPrompt = `Translate and enhance this music description into a professional English prompt for AI music generation. Include genre, mood, and instruments. Output ONLY the English text. User Request: "${userPrompt}"`;
    const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error("Gemini Timeout")), 4000));
    try {
        const result = await Promise.race([model.generateContent(systemPrompt), timeout]);
        return result.response.text().trim();
    } catch (err) {
        console.warn("⚠️ Gemini Slow/Failed, using original prompt.");
        return userPrompt; // العودة للأصلي لضمان استمرار الخدمة
    }
};

// 3. دالة التوقيت لمنع تعليق السيرفر
const requestWithTimeout = async (requestFn, timeoutMs = 20000) => {
    return Promise.race([
        requestFn(),
        new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), timeoutMs))
    ]);
};

// 4. نظام الكاش للـ Polling
class SafeMemory {
    constructor(maxUsers = 1000) {
        this.memory = new Map();
        this.maxUsers = maxUsers;
    }
    get(key) { return this.memory.get(key); }
    set(key, value) {
        if (this.memory.size >= this.maxUsers && !this.memory.has(key)) {
            const oldestKey = this.memory.keys().next().value;
            this.memory.delete(oldestKey);
        }
        this.memory.set(key, value);
    }
}
const pollingCache = new SafeMemory(1000);

const pollingLimiter = rateLimit({ windowMs: 60 * 1000, max: 40 }); 
const actionLimiter = rateLimit({ windowMs: 60 * 1000, max: 20 });  

const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });
    next();
};

const songValidation = [
    body('prompt').trim().notEmpty().withMessage('يجب كتابة وصف للأغنية').escape(),
    validate
];

const extractAudioUrl = (output) => {
    if (!output) return null;
    if (typeof output === 'string') return output;
    if (Array.isArray(output) && output.length > 0) {
        const item = output[0];
        return typeof item === 'string' ? item : (item.audio_url || item.audio || null);
    }
    return null;
};

// ==========================================
// 🎵 1. مسار التوليد المطور (الذكاء الاصطناعي الهجين)
// ==========================================
router.post('/generate', verifyToken, songValidation, async (req, res, next) => {
    let creditDeducted = false;
    try {
        const { prompt } = req.body;
        const userId = req.user.id;

        // تحسين الوصف فوراً
        const optimizedPrompt = await enhancePrompt(prompt);

        // الخصم وحماية الرصيد
        const user = await User.findOneAndUpdate(
            { _id: userId, credits: { $gt: 0 } },
            { $inc: { credits: -1 } },
            { new: true }
        );

        if (!user) return res.status(403).json({ success: false, error: "عذراً، رصيدك انتهى." });
        creditDeducted = true;

        const newSong = new Song({ userId, prompt: optimizedPrompt, status: 'processing' });
        await newSong.save();

        try {
            const pred = await requestWithTimeout(() => 
                replicate.predictions.create({
                    model: "google/lyria-2",
                    input: { prompt: optimizedPrompt }
                })
            );

            if (!pred || pred.status === "failed") throw new Error("Lyria Failed");

            newSong.sunoTaskId = pred.id;
            await newSong.save();
            return res.status(202).json({ success: true, songId: newSong._id });

        } catch (err) {
            // المحرك البديل
            try {
                const pred = await replicate.predictions.create({
                    version: "suno-ai/chirp-v3",
                    input: { prompt: optimizedPrompt }
                });
                newSong.sunoTaskId = pred.id;
                await newSong.save();
                return res.status(202).json({ success: true, songId: newSong._id });
            } catch (sunoErr) {
                if (creditDeducted) await User.findByIdAndUpdate(userId, { $inc: { credits: 1 } });
                newSong.status = 'failed';
                newSong.errorMessage = "عذراً، المحركات مشغولة حالياً.";
                await newSong.save();
                return res.status(502).json({ error: "فشل التوليد" });
            }
        }
    } catch (error) { next(error); }
});

// باقي المسارات (مكتبتي، تحميل، حذف، استعلام) - حافظنا عليها كما هي
router.get('/my-songs', verifyToken, async (req, res, next) => {
    try {
        const songs = await Song.find({ userId: req.user.id }).sort({ createdAt: -1 });
        res.json({ success: true, songs });
    } catch (error) { next(error); }
});

router.get('/:id/download', verifyToken, actionLimiter, async (req, res, next) => {
    try {
        const song = await Song.findOne({ _id: req.params.id, userId: req.user.id });
        if (!song || !song.audioUrl) return res.status(404).json({ error: "الملف غير متاح" });
        const fileRes = await fetch(song.audioUrl);
        res.setHeader('Content-Disposition', `attachment; filename=MusicFactory_${song._id}.mp3`);
        res.setHeader('Content-Type', 'audio/mpeg');
        fileRes.body.pipe(res); 
    } catch (err) { next(err); }
});

router.delete('/:id', verifyToken, actionLimiter, async (req, res, next) => {
    try {
        const song = await Song.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
        if (!song) return res.status(404).json({ success: false, error: "الأغنية غير موجودة." });
        res.json({ success: true, message: "تم حذف الأغنية بنجاح." });
    } catch (error) { next(error); }
});

router.get('/:songId', verifyToken, pollingLimiter, async (req, res, next) => {
    try {
        const { songId } = req.params;
        const userId = req.user.id;
        const now = Date.now();
        const cacheKey = `status_${songId}`;
        const cachedSong = pollingCache.get(cacheKey);

        if (cachedSong && String(cachedSong.userId) === String(userId) && cachedSong.lastChecked && (now - cachedSong.lastChecked < 4000)) {
            return res.json(cachedSong);
        }

        const song = await Song.findOne({ _id: songId, userId });
        if (!song) return res.status(404).json({ error: "الأغنية غير موجودة." });

        if (song.status === 'completed' || song.status === 'failed') {
            song.lastChecked = now;
            pollingCache.set(cacheKey, song);
            return res.json(song);
        }

        if (song.sunoTaskId) {
            let pred;
            try {
                const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("Replicate Timeout")), 8000));
                pred = await Promise.race([replicate.predictions.get(song.sunoTaskId), timeoutPromise]);
            } catch (err) {
                return res.json(song);
            }

            const updateData = { lastChecked: now };
            if (pred.status === 'succeeded') {
                updateData.status = 'completed';
                updateData.audioUrl = extractAudioUrl(pred.output);
            } else if (['failed', 'canceled'].includes(pred.status)) {
                updateData.status = 'failed';
                updateData.errorMessage = pred.error || "فشل من المصدر";
                const locked = await Song.findOneAndUpdate({ _id: songId, status: 'processing' }, { $set: updateData }, { new: true });
                if (locked) await User.findByIdAndUpdate(userId, { $inc: { credits: 1 } });
                return res.json(locked || await Song.findById(songId));
            }
            const finalSong = await Song.findByIdAndUpdate(songId, { $set: updateData }, { new: true });
            pollingCache.set(cacheKey, finalSong);
            return res.json(finalSong);
        }
        res.json(song);
    } catch (error) { next(error); }
});

module.exports = router;