const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, trim: true },
  email:    { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },

  // New registration fields
  firstName: { type: String, required: true, trim: true },
  surname:   { type: String, required: true, trim: true },
  gender:       { type: String, default: 'male' },
  country:   { type: String, required: true, trim: true },
  mobile:    { type: String, default: '' },

  // Profile
  avatar:         { type: String, default: '👤' },
  profilePicture: { type: String, default: null },
  bio:            { type: String, maxlength: 500, default: '' },

  // Fitness Data
  measureUnit:  { type: String, default: 'cm' },
  measurements: { type: mongoose.Schema.Types.Mixed, default: {} },
  currentWeight: { type: Number, default: null },
  targetWeight:  { type: Number, default: null },
  height:        { type: Number, default: null },
  heightUnit:    { type: String, enum: ['cm', 'inches'], default: 'cm' },
  weightUnit:    { type: String, enum: ['kg', 'lbs'], default: 'kg' },
  fitnessGoal:   {
    type: String,
    enum: ['Weight Loss', 'Muscle Gain', 'Maintenance', 'General Fitness', 'Athletic Performance'],
    default: 'General Fitness'
  },

  // Stats
  totalWorkouts: { type: Number, default: 0 },
  totalPosts:    { type: Number, default: 0 },
  joinedAt:      { type: Date, default: Date.now },
  lastActive:    { type: Date, default: Date.now },

  // Password reset
  resetToken:       { type: String, default: null },
  resetTokenExpiry: { type: Date,   default: null },
});

// Hash password before saving
userSchema.pre('save', async function() {
  if (!this.isModified('password')) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);