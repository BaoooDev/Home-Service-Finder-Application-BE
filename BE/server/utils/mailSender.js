const nodemailer = require("nodemailer");

const mailSender = async (email, title, body) => {
  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS,
      },
    });

    // Tạo options cho email
    const mailOptions = {
      from: process.env.MAIL_USER,
      to: email,
      subject: title,
      text: body,
    };

    // Gửi email
    const info = await transporter.sendMail(mailOptions);
    console.log("Email sent successfully:", info.messageId);
    return info; // Trả về thông tin về email đã gửi (có thể sử dụng cho mục đích kiểm tra)
  } catch (error) {
    console.log("Error sending email:", error.message);
    throw error; // Ném lỗi để xử lý ở nơi gọi hàm này
  }
};

module.exports = mailSender;
