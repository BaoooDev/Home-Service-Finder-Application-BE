const mongoose = require('mongoose');
const { Schema } = mongoose;
const AddressSchema = new mongoose.Schema({
  name: { type: String, required: true },
  phone: { type: String, required: true },
  address: { type: String, required: true }
});

// Client Profile Schema
const ClientProfileSchema = new mongoose.Schema({
  jobs: [{
    job_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Job' },  // Reference to jobs created by the client
    status: { type: String, enum: ['pending', 'accepted', 'in_progress', 'completed', 'canceled'] },
  }],
  addresses: [AddressSchema],  // List of addresses for the client
});

// Worker Profile Schema
const WorkerProfileSchema = new mongoose.Schema({
  rating: { type: Number, default: 5 },
  reviews: [
    {
      job_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Job' },
      rating: { type: Number },
      comment: { type: String },
    },
  ],
  is_verified: { type: Boolean, default: false },  // Whether the worker is verified by an admin
  services: [{ type: Schema.Types.ObjectId, ref: 'Service' }],
  address: {type: String}
});

const AdminProfileSchema = new mongoose.Schema({
  verified_workers: [{
    worker_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    verification_date: { type: Date, default: Date.now }
  }],
  rejected_workers: [{
    worker_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    rejection_reason: { type: String },
    rejection_date: { type: Date, default: Date.now }
  }],
  suspended_users: [{
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    suspension_reason: { type: String },
    suspension_date: { type: Date, default: Date.now }
  }],
  actions: [{
    action_type: { type: String },  // e.g., 'verify_worker', 'suspend_user', 'cancel_job'
    target_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },  // Reference to the target (user, job, etc.)
    description: { type: String },  // Short description of the action
    action_date: { type: Date, default: Date.now }
  }]
});

const UserSchema = new mongoose.Schema({
  full_name: { type: String, required: true },
  password: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phone_number: { type: String, default: '' },
  role: { type: String, enum: ['client', 'worker', 'admin'], required: true },  // Role determines if the user is a client, worker, or admin
  client_profile: ClientProfileSchema,  // Included if the user is a client
  worker_profile: WorkerProfileSchema,  // Included if the user is a worker
  admin_profile: AdminProfileSchema,  // For admins
  balance: { type: Number, default: 0 },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
});


module.exports = mongoose.model('User', UserSchema);
