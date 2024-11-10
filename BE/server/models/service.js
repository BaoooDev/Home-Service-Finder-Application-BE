const mongoose = require('mongoose');
const { Schema } = mongoose;

const ServiceSchema = new Schema({
  name: { type: String, required: true },
  code: { type: String, required: true },
  description: { type: String, required: true },
  base_price: { type: Number, required: true },
  price_per_hour: { type: Number, required: true },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
})

module.exports = mongoose.model('Service', ServiceSchema)
