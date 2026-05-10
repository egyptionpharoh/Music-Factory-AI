const mongoose = require('mongoose');

const founderSchema = new mongoose.Schema({
  name: { 
      type: String, 
      required: true, 
      trim: true,
      default: 'حسين الملك'
  },
  bio: { 
      type: String, 
      default: 'شاعر غنائي وملحن وباحث موسيقي وعازف لآلة الكونترباص، مبرمج للتطبيقات الموسيقية و متخصص في تطويع الذكاء الاصطناعي لخدمة الإبداع الفني.' 
  },
  imageUrl: { 
      type: String, 
      default: 'my-photo.jpg' 
  },
  title: { 
      type: String, 
      default: 'Founder & Lead Architect' 
  }
}, { timestamps: true }); // هيسجل وقت إنشاء وتعديل البيانات أوتوماتيك

module.exports = mongoose.model('Founder', founderSchema);