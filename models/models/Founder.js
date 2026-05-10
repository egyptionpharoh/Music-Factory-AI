const mongoose = require('mongoose');
const founderSchema = new mongoose.Schema({
    name: String,
    bio: String,
    imageUrl: String,
    title: String
});
module.exports = mongoose.model('Founder', founderSchema);