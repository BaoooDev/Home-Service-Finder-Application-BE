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

    // Find the service by its code or ID
    const service = await Service.findOne({ _id: serviceType });

    if (!service) {
      return res.status(404).json({ success: false, message: 'Service not found' });
    }

    // Build the response with conditional fields for front_load and top_load
    const serviceDetails = {
      base_price: service.base_price,
      price_per_hour: service.price_per_hour,
      name: service.name,
      description: service.description,
      code:service.code,
    };

    // Include front_load and top_load if they exist
    if (service.front_load !== undefined) {
      serviceDetails.front_load = service.front_load;
    }
    if (service.top_load !== undefined) {
      serviceDetails.top_load = service.top_load;
    }

    // Respond with the service details
    res.status(200).json({
      success: true,
      service: serviceDetails,
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
