const Service = require('../models/service')

const queryServices = async (req, res) => {
  const services = await Service.find()
  return res.status(200).json({
    results: services,
  })
}
const getServiceDetails = async (req, res) => {
  try {
    const { serviceType } = req.params;

    // Find the service by its code
    const service = await Service.findOne({ _id: serviceType });

    if (!service) {
      return res.status(404).json({ success: false, message: 'Service not found' });
    }

    // Respond with the necessary details
    res.status(200).json({
      success: true,
      service: {
        base_price: service.base_price,
        price_per_hour: service.price_per_hour,
        name: service.name,
        description: service.description,
      },
    });
  } catch (error) {
    console.error('Error fetching service details:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
module.exports = {
  queryServices,
  getServiceDetails
}
