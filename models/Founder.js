const mongoose = require('mongoose');

const founderSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    title: { type: String, required: true, trim: true },
    bio: { type: String, required: true, trim: true },
    imageUrl: { type: String, default: '/assets/founder/my-photo.jpg' }, // مسار أوضح زي ما اقترح ChatGPT
    socialLinks: {
        email: String,
        facebook: String,
        linkedin: String
    }
}, { 
    timestamps: true // ده لوحده كفاية هيعمل createdAt و updatedAt أوتوماتيك
});

module.exports = mongoose.model('Founder', founderSchema);