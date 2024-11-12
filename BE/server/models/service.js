const mongoose = require('mongoose')
const { Schema } = mongoose

const ServiceSchema = new Schema(
  {
    name: { type: String, required: true },
    code: { type: String, required: true },
    description: { type: String, required: true },
    base_price: { type: Number, required: true },
    price_per_hour: { type: Number, required: true },
  },
  {
    timestamps: true,
  }
)

module.exports = mongoose.model('Service', ServiceSchema)
