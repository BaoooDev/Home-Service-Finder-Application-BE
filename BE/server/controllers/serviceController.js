const Service = require('../models/service')

const queryServices = async (req, res) => {
  const services = await Service.find()
  return res.status(200).json({
    results: services,
  })
}

module.exports = {
  queryServices,
}
