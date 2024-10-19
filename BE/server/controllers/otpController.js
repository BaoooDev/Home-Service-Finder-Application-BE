// controllers/otpController.js
const otpGenerator = require("otp-generator");
const OTP = require("../models/otpModel");
const User = require("../models/user");

exports.sendOTP = async (req, res) => {
  try {
    const { email } = req.body;

    // Kiểm tra xem email có được cung cấp không
    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email rỗng",
      });
    }

    // Kiểm tra xem email có hợp lệ không
    const emailRegex = /^[\w-]+(\.[\w-]+)*@([\w-]+\.)+[a-zA-Z]{2,7}$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Email không hợp lệ",
      });
    }

    const checkUserPresent = await User.findOne({ email });
    if (checkUserPresent) {
      return res.status(401).json({
        success: false,
        message: "Người dùng đã được đăng ký",
      });
    }
    let otp = otpGenerator.generate(6, {
      upperCaseAlphabets: false,
      lowerCaseAlphabets: false,
      specialChars: false,
    });
    let result = await OTP.findOne({ otp: otp });
    while (result) {
      otp = otpGenerator.generate(6, {
        upperCaseAlphabets: false,
      });
      result = await OTP.findOne({ otp: otp });
    }
    const otpPayload = { email, otp };
    const otpBody = await OTP.create(otpPayload);
    res.status(200).json({
      success: true,
      message: "OTP đã được gửi thành công",
      otp,
    });
  } catch (error) {
    console.log(error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
};

exports.verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;
    // Kiểm tra xem trường email và otp có rỗng không
    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: "OTP không được để trống",
      });
    }
    //Find the most recent OTP for the email
    const response = await OTP.find({ email }).sort({ createdAt: -1 }).limit(1);
    if (response.length === 0 || otp !== response[0].otp) {
      return res.status(400).json({
        success: false,
        message: "Sai mã OTP",
      });
    }
    res.status(200).json({
      success: true,
      message: "OTP verified successfully",
    });
  } catch (error) {
    console.log(error);
    res.status(500).json(error);
  }
};
