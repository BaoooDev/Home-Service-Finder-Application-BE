const mongoose = require('mongoose')
const { Schema } = mongoose

const ServiceSchema = new Schema(
  {
    name: { type: String, required: true },
    code: { type: String, required: true },
    description: { type: String, required: true },
    base_price: { type: Number },
    price_per_hour: { type: Number},
    front_load: { type: Number }, 
    top_load: { type: Number },  
  },
  {
    timestamps: true,
  }
)

module.exports = mongoose.model('Service', ServiceSchema)
