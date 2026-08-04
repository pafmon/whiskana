const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  date: String,
  time: String,
  distillery: String,
  whiskyName: String,
  year: String,
  abv: String,
  type: String,
  region: String,
  nose: String,
  palate: String,
  finish: String,
  overall: String,
  score: Number,
  price: String,
  place: String,
  transcript: String,
  tags: [String],
  latitude: Number,
  longitude: Number,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { strict: false });

module.exports = mongoose.model('Review', reviewSchema, 'reviews');
