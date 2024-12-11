const Job = require('../models/job')
const Service = require('../models/service')
const User = require('../models/user')
const moment = require('moment')
// AdminController.js

const getPendingWorkers = async (req, res) => {
  try {
    const pendingWorkers = await User.aggregate([
      {
        $match: {
          role: 'worker',
          'worker_profile.is_verified': 'pending', // Lọc nhân viên đang chờ xét duyệt
        },
      },
      {
        $lookup: {
          from: 'services', // Tên bảng dịch vụ (đảm bảo đúng tên trong MongoDB)
          localField: 'worker_profile.services', // Liên kết danh sách service IDs
          foreignField: '_id', // `_id` trong bảng Service
          as: 'services', // Lưu kết quả vào `services`
        },
      },
      {
        $project: {
          full_name: 1,
          phone_number: 1,
          email: 1,
          'worker_profile.identity_number': 1,
          'worker_profile.address': 1,
          services: { $map: { input: '$services', as: 'service', in: '$$service.name' } }, // Lấy tên dịch vụ
        },
      },
    ]);

    res.status(200).json({ success: true, data: pendingWorkers });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


const reviewWorker = async (req, res) => {
  try {
    const { id } = req.params
    const { action, rejection_reason } = req.body // Action: 'approve' hoặc 'reject'

    // Tìm user theo ID và kiểm tra vai trò
    const user = await User.findById(id)
    if (!user || user.role !== 'worker') {
      return res.status(404).json({ message: 'Không tìm thấy nhân viên' })
    }

    if (action === 'approve') {
      // Duyệt nhân viên
      user.worker_profile.is_verified = 'approved'
      user.worker_profile.status = 'approved'
      await user.save()

      return res.status(200).json({ success: true, message: 'Nhân viên đã được duyệt' })
    } else if (action === 'reject') {
      // Từ chối nhân viên và ghi lý do từ chối
      user.worker_profile.is_verified = 'rejected'
      user.worker_profile.status = 'rejected'
      user.worker_profile.rejection_reason = rejection_reason
      await user.save()

      return res.status(200).json({ success: true, message: 'Nhân viên đã bị từ chối' })
    } else {
      return res.status(400).json({ success: false, message: 'Hành động không hợp lệ' })
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

const updateServicePrice = async (req, res) => {
  try {
    const { id } = req.params; // ID of the service
    const { base_price, price_per_hour, front_load, top_load } = req.body; // Updated fields

    // Find the service by ID
    const service = await Service.findById(id);
    if (!service) {
      return res.status(404).json({ success: false, message: 'Dịch vụ không tồn tại' });
    }

    // Update fields based on service type
    if (service.code === 'cleaning') {
      if (base_price !== undefined) service.base_price = base_price;
      if (price_per_hour !== undefined) service.price_per_hour = price_per_hour;
    } else if (service.code === 'cleaning_wash') {
      if (front_load !== undefined) service.front_load = front_load;
      if (top_load !== undefined) service.top_load = top_load;
    } else if (service.code === 'cleaning_ac') {
      if (base_price !== undefined) service.base_price = base_price;
      if (price_per_hour !== undefined) service.price_per_hour = price_per_hour;
    } else {
      return res
        .status(400)
        .json({ success: false, message: 'Loại dịch vụ không hỗ trợ cập nhật giá này' });
    }

    // Save the updated service
    await service.save();

    res.status(200).json({
      success: true,
      message: 'Dịch vụ đã được cập nhật thành công',
      data: service,
    });
  } catch (error) {
    console.error('Error updating service price:', error);
    res.status(500).json({ success: false, message: 'Lỗi khi cập nhật dịch vụ', error });
  }
};


const getMonthlyRevenue = async (req, res) => {
  try {
    const stats = await Job.aggregate([
      {
        $match: {
          status: 'completed',
          payment_status: 'paid',
        }, // Chỉ lấy các job đã hoàn thành và được thanh toán
      },
      {
        $group: {
          _id: { $month: '$completion_time' }, // Nhóm theo tháng
          totalRevenue: { $sum: '$price' }, // Tính tổng doanh thu
          count: { $sum: 1 }, // Đếm số lượng job
        },
      },
      {
        $sort: { _id: 1 }, // Sắp xếp theo tháng
      },
    ])

    res.status(200).json({
      success: true,
      data: stats,
    })
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi khi lấy thống kê doanh thu', error })
  }
}

const getTotalRevenue = async (req, res) => {
  try {
    const totalRevenue = await Job.aggregate([
      {
        $match: { payment_status: 'paid' }, // Chỉ tính các job đã thanh toán
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$price' }, // Tổng cộng tất cả giá trị 'price'
        },
      },
    ])

    res.status(200).json({
      success: true,
      data: totalRevenue[0]?.totalRevenue || 0,
    })
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi khi tính tổng doanh thu', error })
  }
}
const getServiceRevenue = async (req, res) => {
  try {
    const serviceRevenue = await Job.aggregate([
      {
        $match: { payment_status: 'paid' }, 
      },
      {
        $group: {
          _id: '$service', 
          totalRevenue: { $sum: '$price' }, 
        },
      },
      {
        $sort: { totalRevenue: -1 }, 
      },
      {
        $lookup: {
          from: 'services', 
          localField: '_id', 
          foreignField: '_id', 
          as: 'serviceDetails', 
        },
      },
      {
        $unwind: '$serviceDetails', 
      },
      {
        $project: {
          _id: '$_id', 
          name: '$serviceDetails.name', 
          totalRevenue: 1, 
        },
      },
    ])

    res.status(200).json({
      success: true,
      data: serviceRevenue,
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi khi tính tổng doanh thu theo dịch vụ',
      error,
    })
  }
}

  const getMostBookedService = async (req, res) => {
    try {
      const serviceCounts = await Job.aggregate([
        {
          $group: {
            _id: '$service',
            count: { $sum: 1 }
          }
        },
        {
          $sort: { count: -1 }
        },
        {
          $lookup: {
            from: 'services', // Tên bảng dịch vụ
            localField: '_id',
            foreignField: '_id',
            as: 'serviceDetails'
          }
        },
        {
          $unwind: '$serviceDetails' 
        },
        {
          $project: {
            _id: 0,
            serviceId: '$_id',
            serviceName: '$serviceDetails.name',
            count: 1
          }
        }
      ]);
  
      res.status(200).json({
        success: true,
        data: serviceCounts
      });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Lỗi khi đếm số lượng dịch vụ được đặt', error });
    }
  };
  
  
  const getWorkerRankings = async (req, res) => {
    try {
      const rankings = await Job.aggregate([
        {
          $group: {
            _id: '$worker', // Nhóm các job theo worker
            jobCount: { $sum: 1 } // Đếm số lượng job của từng worker
          }
        },
        {
          $sort: { jobCount: -1 } // Sắp xếp theo số lượng job giảm dần
        },
        {
          $lookup: {
            from: 'users', // Bảng users để lấy thông tin nhân viên
            localField: '_id',
            foreignField: '_id',
            as: 'workerDetails'
          }
        },
        {
          $unwind: '$workerDetails' // Trích xuất thông tin nhân viên từ mảng workerDetails
        },
        {
          $project: {
            _id: 0,
            workerId: '$_id',
            fullName: '$workerDetails.full_name',
            email: '$workerDetails.email',
            jobCount: 1
          }
        }
      ]);
  
      res.status(200).json({
        success: true,
        data: rankings
      });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Lỗi khi xếp hạng nhân viên', error });
    }
  };
  
  const getTopClients = async (req, res) => {
    try {
      const topClients = await Job.aggregate([
        {
          $match: { payment_status: 'paid' }
        },
        {
          $group: {
            _id: '$client', 
            totalSpent: { $sum: '$price' }, 
            jobCount: { $sum: 1 } 
          }
        },
        {
          $sort: { totalSpent: -1 } 
        },
        {
          $lookup: {
            from: 'users',
            localField: '_id',
            foreignField: '_id',
            as: 'clientDetails'
          }
        },
        {
          $unwind: '$clientDetails'
        },
        {
          $project: {
            _id: 0,
            clientId: '$_id',
            fullName: '$clientDetails.full_name',
            email: '$clientDetails.email',
            totalSpent: 1,
            jobCount: 1
          }
        }
      ]);
  
      res.status(200).json({
        success: true,
        data: topClients
      });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Lỗi khi lấy khách hàng hàng đầu', error });
    }
  };
  const getAllJobs = async (req, res) => {
    try {
      const {
        status,
        payment_status,
        worker,
        client,
        page = 1, 
        limit = 10, 
        sortBy = 'createdAt', 
        order = 'desc', 
        service, 
      } = req.query;
  
      const filter = {};
      if (status) filter.status = status;
      if (payment_status) filter.payment_status = payment_status;
      if (worker) filter.worker = worker;
      if (client) filter.client = client;
      if (service) filter.service = service; 
  
      const pageLimit = parseInt(limit, 10);
      const skip = (parseInt(page, 10) - 1) * pageLimit;
  
      const jobs = await Job.find(filter)
        .sort({ [sortBy]: order === 'desc' ? -1 : 1 }) 
        .skip(skip) 
        .limit(pageLimit) 
        .populate('worker', 'full_name email') 
        .populate('client', 'full_name email') 
        .populate('service', 'name') 
        .select('-__v'); 
  
      const totalJobs = await Job.countDocuments(filter);
  
      res.status(200).json({
        success: true,
        data: jobs,
        total: totalJobs,
        currentPage: parseInt(page, 10),
        totalPages: Math.ceil(totalJobs / pageLimit),
      });
    } catch (error) {
      // Handle errors gracefully
      res.status(500).json({ success: false, message: 'Error fetching jobs', error: error.message });
    }
  };
  
  const getAllWorkers = async (req, res) => {
    try {
      const workers = await Job.aggregate([
        {
          $group: {
            _id: '$worker', 
            jobCount: { $sum: 1 }, 
            averageRating: { $avg: '$rating' }, 
            totalEarnings: { $sum: '$price' }, 
          },
        },
        {
          $lookup: {
            from: 'users', 
            localField: '_id', 
            foreignField: '_id', 
            as: 'workerDetails',
          },
        },
        {
          $unwind: '$workerDetails', 
        },
        {
          $project: {
            _id: 0, 
            workerId: '$_id', 
            fullName: '$workerDetails.full_name', 
            email: '$workerDetails.email', 
            phoneNumber: '$workerDetails.phone_number', 
            address: '$workerDetails.worker_profile.address', 
            jobCount: 1, 
            averageRating: { $round: ['$workerDetails.worker_profile.rating', 2] }, 
            totalEarnings: 1, 
            isVerified: '$workerDetails.worker_profile.is_verified',
            identity_number:'$workerDetails.worker_profile.identity_number', 
          },
        },
        {
          $sort: { jobCount: -1 }, 
        },
      ]);
  
      res.status(200).json({
        success: true,
        data: workers,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error fetching worker data',
        error: error.message,
      });
    }
  };
  const getJobReviews = async (req, res) => {
    try {
      const jobReviews = await Job.find(
        { rating: { $exists: true } }
      )
        .populate('service', 'name') 
        .select('service rating service_comments'); 
  
      res.status(200).json({
        success: true,
        data: jobReviews,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Lỗi khi lấy đánh giá từ công việc',
        error,
      });
    }
  };
  const getWorkerReviews = async (req, res) => {
    try {
      const workerReviews = await User.find(
        { role: 'worker' } 
      )
        .populate('worker_profile.reviews.job_id', 'service') 
        .select('full_name worker_profile.reviews'); 
  
      const formattedReviews = workerReviews.map((worker) => ({
        full_name: worker.full_name,
        reviews: worker.worker_profile.reviews.map((review) => ({
          job_id: review.job_id?._id,
          service: review.job_id?.service,
          rating: review.rating,
          comment: review.comment,
        })),
      }));
  
      res.status(200).json({
        success: true,
        data: formattedReviews,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Lỗi khi lấy đánh giá từ nhân viên',
        error,
      });
    }
  };
  const blockWorkerAccount = async (req, res) => {
    try {
      const { id } = req.params;
      const { action } = req.body;
  
      if (!id || !action) {
        return res.status(400).json({ success: false, message: 'Missing required parameters.' });
      }
  
      const worker = await User.findById(id);
  
      if (!worker) {
        return res.status(404).json({ success: false, message: 'Worker not found.' });
      }
  
      worker.worker_profile.is_verified = action === 'block' ? 'blocked' : 'approved';
      await worker.save();
  
      return res.status(200).json({ success: true, message: 'Worker status updated successfully.' });
    } catch (error) {
      console.error('Error updating worker status:', error);
      return res.status(500).json({ success: false, message: 'Error updating worker status.', error });
    }
  };
  
  module.exports = { getPendingWorkers, reviewWorker,updateServicePrice,
    getTotalRevenue,getServiceRevenue,getMostBookedService,getWorkerRankings,getWorkerReviews,
    getMonthlyRevenue,getTopClients,getAllJobs,getAllWorkers,getJobReviews,blockWorkerAccount  };
  