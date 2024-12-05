const Job = require('../models/job')
const Service = require('../models/service')
const User = require('../models/user')
const moment = require('moment')
// AdminController.js

const getPendingWorkers = async (req, res) => {
  try {
    // Tìm tất cả user có vai trò là 'worker' và trạng thái xét duyệt là 'pending'
    const pendingWorkers = await User.find({
      role: 'worker',
      'worker_profile.is_verified': 'pending', // Lọc chỉ các hồ sơ đang chờ xét duyệt
    }).select('full_name phone_number email worker_profile.identity_number worker_profile.address') // Lấy các thông tin cần thiết

    res.status(200).json({ success: true, data: pendingWorkers })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

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
    const { id } = req.params // ID của dịch vụ
    const { base_price, price_per_hour, front_load, top_load } = req.body // Dữ liệu cập nhật

    // Tìm dịch vụ theo ID
    const service = await Service.findById(id)
    if (!service) {
      return res.status(404).json({ success: false, message: 'Dịch vụ không tồn tại' })
    }

    // Kiểm tra các trường cần cập nhật tùy thuộc vào loại dịch vụ
    if (service.code === 'cleaning' || service.code === 'cleaning_ac') {
      if (base_price !== undefined) service.base_price = base_price
      if (price_per_hour !== undefined) service.price_per_hour = price_per_hour
    } else if (service.code === 'cleaning_wash') {
      if (front_load !== undefined) service.front_load = front_load
      if (top_load !== undefined) service.top_load = top_load
    } else {
      return res
        .status(400)
        .json({ success: false, message: 'Loại dịch vụ không hỗ trợ cập nhật giá này' })
    }

    // Lưu dịch vụ sau khi cập nhật
    await service.save()

    res.status(200).json({
      success: true,
      message: 'Dịch vụ đã được cập nhật thành công',
      data: service,
    })
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi khi cập nhật dịch vụ', error })
  }
}

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
  
  const getWorkerReviews = async (req, res) => {
    try {
      const { workerId } = req.params; // ID của nhân viên
  
      const worker = await User.findById(workerId).select('worker_profile.reviews');
      if (!worker) {
        return res.status(404).json({ success: false, message: 'Nhân viên không tồn tại' });
      }
  
      res.status(200).json({
        success: true,
        data: worker.worker_profile.reviews,
      });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Lỗi khi lấy đánh giá nhân viên', error });
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
            _id: '$client', // Nhóm theo khách hàng
            totalSpent: { $sum: '$price' }, // Tổng số tiền khách đã chi
            jobCount: { $sum: 1 } // Số lượng công việc khách đã đặt
          }
        },
        {
          $sort: { totalSpent: -1 } // Sắp xếp theo số tiền chi giảm dần
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
      // Extract optional query parameters
      const {
        status,
        payment_status,
        worker,
        client,
        page = 1, // Default to the first page
        limit = 10, // Default to 10 items per page
        sortBy = 'createdAt', // Default sorting field
        order = 'desc', // Default sorting order
        service, // Service filter
      } = req.query;
  
      // Build the dynamic filter object based on query params
      const filter = {};
      if (status) filter.status = status;
      if (payment_status) filter.payment_status = payment_status;
      if (worker) filter.worker = worker;
      if (client) filter.client = client;
      if (service) filter.service = service; // Add service filter
  
      // Pagination settings
      const pageLimit = parseInt(limit, 10);
      const skip = (parseInt(page, 10) - 1) * pageLimit;
  
      // Fetch jobs with filtering, pagination, and sorting
      const jobs = await Job.find(filter)
        .sort({ [sortBy]: order === 'desc' ? -1 : 1 }) // Sorting based on field and order
        .skip(skip) // Pagination: skip items
        .limit(pageLimit) // Pagination: limit items
        .populate('worker', 'full_name email') // Populate worker details
        .populate('client', 'full_name email') // Populate client details
        .populate('service', 'name') // Populate service details
        .select('-__v'); // Exclude `__v` field
  
      // Count total jobs matching the filter for pagination
      const totalJobs = await Job.countDocuments(filter);
  
      // Return response with jobs and pagination info
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
      // Aggregate workers data
      const workers = await Job.aggregate([
        {
          $group: {
            _id: '$worker', // Group jobs by worker ID
            jobCount: { $sum: 1 }, // Count total jobs per worker
            averageRating: { $avg: '$rating' }, // Calculate average rating
            totalEarnings: { $sum: '$price' }, // Sum up all job prices (earnings)
          },
        },
        {
          $lookup: {
            from: 'users', // Lookup worker details from User collection
            localField: '_id', // Match worker ID in Job collection
            foreignField: '_id', // Match user ID in User collection
            as: 'workerDetails',
          },
        },
        {
          $unwind: '$workerDetails', // Flatten worker details array
        },
        {
          $project: {
            _id: 0, // Exclude MongoDB _id
            workerId: '$_id', // Include worker ID
            fullName: '$workerDetails.full_name', // Worker name
            email: '$workerDetails.email', // Worker email
            phoneNumber: '$workerDetails.phone_number', // Worker phone
            address: '$workerDetails.worker_profile.address', // Worker address
            jobCount: 1, // Total number of jobs
            averageRating: { $round: ['$workerDetails.worker_profile.rating', 2] }, // Average rating (rounded)
            totalEarnings: 1, // Total earnings from jobs
            isVerified: '$workerDetails.worker_profile.is_verified',
            identity_number:'$workerDetails.worker_profile.identity_number', // Verification status
          },
        },
        {
          $sort: { jobCount: -1 }, // Sort by number of jobs (highest first)
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
  
  module.exports = { getPendingWorkers, reviewWorker,updateServicePrice,
    getTotalRevenue,getServiceRevenue,getMostBookedService,getWorkerRankings,getWorkerReviews,
    getMonthlyRevenue,getTopClients,getAllJobs,getAllWorkers  };
  