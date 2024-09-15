const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/user');
const validator = require("validator");

const createToken = (user) => {
  const jwtkey = process.env.JWT_SECRET_KEY;
  const payload = {
    id: user._id,          // Sử dụng _id thay vì id
    username: user.username,
    role: user.role        // Thêm role để phân quyền
  };
  return jwt.sign(payload, jwtkey, { expiresIn: "3d" });
};
const registerClient = async (req, res) => {
        try {
          // Lấy thông tin từ body
          const { password, email, full_name } = req.body;
      
          // Kiểm tra các trường có được cung cấp hay không
          if (!password || !full_name || !email) {
            return res
              .status(400)
              .json({ success: false, message: "Không để trống các trường" });
          }
      
          // Kiểm tra định dạng email
          if (!validator.isEmail(email)) {
            return res
              .status(400)
              .json({ success: false, message: "Email phải là email hợp lệ..." });
          }
      
          // Kiểm tra email đã tồn tại chưa
          let existingUser = await User.findOne({ email });
          if (existingUser) {
            return res
              .status(400)
              .json({ success: false, message: "Email đã tồn tại trong hệ thống" });
          }
      
          // Kiểm tra độ mạnh của mật khẩu (có thể bật nếu cần)
          // if (!validator.isStrongPassword(password)) {
          //   return res
          //     .status(400)
          //     .json({ success: false, message: "Mật khẩu phải đủ mạnh..." });
          // }
      
          // Khởi tạo profile client (nếu cần) hoặc để trống
          const client_profile = { jobs: [] };  // Mặc định client không có việc làm
      
          // Tạo người dùng mới
          let user = new User({
            password,
            email,
            full_name,
            role: 'client',
            client_profile,  // Thêm profile của client
          });
      
          // Mã hóa mật khẩu trước khi lưu
          const salt = await bcrypt.genSalt(10);
          user.password = await bcrypt.hash(password, salt);
      
          // Lưu người dùng vào cơ sở dữ liệu
          await user.save();
      
          // Tạo JWT token
          const token = createToken(user);  // Hàm này sẽ tạo JWT token
      
          // Gửi lại phản hồi cho client
          res.status(200).json({
            _id: user._id,
            email: user.email,
            full_name: user.full_name,
            token,  // Token để client sử dụng cho các yêu cầu tiếp theo
          });
        } catch (error) {
          console.log(error);
          res.status(500).json({ success: false, message: error.message });
        }
      };

    const registerWorker = async (req, res) => {
        try {
          // Lấy thông tin từ body
          const { password, email, full_name, identity_number, certifications } = req.body;
      
          // Kiểm tra các trường có được cung cấp hay không
          if (!password || !full_name || !identity_number || !email || !certifications || certifications.length === 0) {
            return res
              .status(400)
              .json({ success: false, message: "Không để trống các trường thông tin bắt buộc" });
          }
      
          // Kiểm tra định dạng email
          if (!validator.isEmail(email)) {
            return res
              .status(400)
              .json({ success: false, message: "Email phải là email hợp lệ..." });
          }
      
          // Kiểm tra độ mạnh của mật khẩu
        //   if (!validator.isStrongPassword(password)) {
        //     return res
        //       .status(400)
        //       .json({ success: false, message: "Mật khẩu phải đủ mạnh..." });
        //   }
      
          // Kiểm tra email đã tồn tại chưa
          let existingUser = await User.findOne({ email });
          if (existingUser) {
            return res
              .status(400)
              .json({ success: false, message: "Email đã tồn tại trong hệ thống" });
          }
      
          // Khởi tạo profile cho worker
          const worker_profile = {
            identity_number,
            certifications,  // Mảng các chứng chỉ
            is_verified: false,  // Chưa được xác thực
            status: "pending",  // Chờ duyệt
            kpi: {
              jobs_completed: 0,
              rating: 0
            }
          };
      
          // Tạo một user mới và lưu vào cơ sở dữ liệu
          let user = new User({
            password,
            email,
            full_name,
            role: 'worker',
            worker_profile,  // Đính kèm profile của worker
          });
      
          // Mã hóa mật khẩu trước khi lưu
          const salt = await bcrypt.genSalt(10);
          user.password = await bcrypt.hash(password, salt);
      
          // Lưu người dùng vào cơ sở dữ liệu
          await user.save();
      
          // Tạo JWT token
          const token = createToken(user);
      
          // Gửi phản hồi cho client
          res.status(200).json({
            _id: user._id,
            email,
            full_name,
            identity_number,
            certifications,
            token,  // JWT Token để client sử dụng cho các yêu cầu khác
          });
        } catch (error) {
          console.log(error);
          res.status(500).json({ success: false, message: error.message });
        }
      };
// Đăng nhập Client
const loginClient = async (req, res) => {
  const { email, password } = req.body;

  try {
    // Tìm người dùng với email và role là client
    const user = await User.findOne({ email, role: 'client' });
    if (!user) {
      return res.status(400).json({ msg: 'Invalid credentials or not a client' });
    }

    // So sánh mật khẩu
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ msg: 'Invalid credentials' });
    }

    // Tạo JWT
    const token = createToken(user);

    // Gửi phản hồi với token
    res.json({ token });
  } catch (error) {
    console.error(error.message);
    res.status(500).send('Server error');
  }
};


// Đăng nhập Worker
const loginWorker = async (req, res) => {
    const { email, password } = req.body;

    try {
        // Tìm người dùng với email
        const user = await User.findOne({ email, role: 'worker' });
        if (!user) {
            return res.status(400).json({ msg: 'Invalid credentials or not a worker' });
        }

        // So sánh mật khẩu
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ msg: 'Invalid credentials' });
        }

        // Tạo JWT
        const payload = {
            user: {
                id: user._id,
                role: user.role
            }
        };
        const token = jwt.sign(payload, process.env.JWT_SECRET_KEY, { expiresIn: '1h' });

        res.json({ token });
    } catch (error) {
        console.error(error.message);
        res.status(500).send('Server error');
    }
};
module.exports = {
    registerClient,
    registerWorker,
    loginClient,
    loginWorker
}