const mongoose = require('mongoose');

const exerciseSchema = new mongoose.Schema({
  name: { type: String, required: true },
  sets: { type: Number, required: true },
  reps: { type: String, required: true },
  weight: String,
  notes: String,
  completed: { type: Boolean, default: false }
});

const workoutSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: true
  },
  exercises: [{
    name: String,
    sets: [{
      reps: Number,
      weight: Number,
      completed: {
        type: Boolean,
        default: false
      }
    }]
  }],
  rating: {
    type: Number,
    min: 1,
    max: 5,
    default: null
  },
  comment: {
    type: String,
    default: ''
  },
  duration: {
    type: Number,
    default: 0
  },
  isCompleted: {
    type: Boolean,
    default: false
  },
  completedAt: {
    type: Date,
    default: null
  },
  // ADD THESE TEMPLATE FIELDS
  isTemplate: {
    type: Boolean,
    default: false
  },
  templateName: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Workout', workoutSchema);