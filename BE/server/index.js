const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Load biến môi trường từ file .env
dotenv.config();

// Khởi tạo Express
const app = express();

// Middleware để parse JSON
app.use(express.json());

// Import Routes
const authRoutes = require('./routes/auth');// Import từ auth.js

// Sử dụng Routes cho API xác thực
app.use('/api/', authRoutes);

// Kết nối MongoDB
mongoose.connect(process.env.MONGO_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => {
    console.log('MongoDB connected');
}).catch(err => {
    console.log('MongoDB connection error:', err);
});

// Khởi động server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
