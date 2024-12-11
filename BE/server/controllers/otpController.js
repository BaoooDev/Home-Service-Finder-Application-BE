const otpGenerator = require("otp-generator");
const OTP = require("../models/otpModel");
const User = require("../models/user");
const nodemailer = require("nodemailer");

exports.sendOTP = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, message: "Email rỗng" });
    }

    const emailRegex = /^[\w-]+(\.[\w-]+)*@([\w-]+\.)+[a-zA-Z]{2,7}$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ success: false, message: "Email không hợp lệ" });
    }

    // const checkUserPresent = await User.findOne({ email });
    // if (checkUserPresent) {
    //   return res.status(401).json({ success: false, message: "Người dùng đã được đăng ký" });
    // }

    let otp = otpGenerator.generate(6, { upperCaseAlphabets: false, lowerCaseAlphabets: false, specialChars: false });
    let result = await OTP.findOne({ otp: otp });
    while (result) {
      otp = otpGenerator.generate(6, { upperCaseAlphabets: false });
      result = await OTP.findOne({ otp: otp });
    }

    const otpPayload = { email, otp, expiresAt: new Date(Date.now() + 5 * 60 * 1000) }; // Hết hạn sau 5 phút
    await OTP.create(otpPayload);

    // Gửi email OTP
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER, // Email của bạn
        pass: process.env.EMAIL_PASS, // Mật khẩu email
      },
    });

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Your OTP Code",
      text: `Your OTP code is ${otp}. It is valid for 5 minutes.`,
    });

    res.status(200).json({ success: true, message: "OTP đã được gửi thành công" });
  } catch (error) {
    console.log(error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
};
exports.verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ success: false, message: "Email và OTP không được để trống" });
    }

    const response = await OTP.find({ email }).sort({ createdAt: -1 }).limit(1);
    if (response.length === 0) {
      return res.status(400).json({ success: false, message: "Không tìm thấy OTP cho email này" });
    }

    const latestOTP = response[0];

    // Kiểm tra OTP đã hết hạn hay chưa
    if (new Date() > new Date(latestOTP.expiresAt)) {
      return res.status(400).json({ success: false, message: "OTP đã hết hạn" });
    }

    if (otp !== latestOTP.otp) {
      return res.status(400).json({ success: false, message: "Sai mã OTP" });
    }

    // Xóa OTP sau khi xác thực thành công
    await OTP.deleteOne({ _id: latestOTP._id });

    res.status(200).json({ success: true, message: "OTP verified successfully" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, error: error.message });
  }
};
