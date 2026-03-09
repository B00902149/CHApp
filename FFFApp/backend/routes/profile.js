const express = require('express');
const router = express.Router();
const User = require('../models/User');
const mongoose = require('mongoose');

// Get user profile
router.get('/:userId', async (req, res) => {
  try {
    const user = await User.findById(new mongoose.Types.ObjectId(req.params.userId)).select('-password');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update user profile
router.put('/:userId', async (req, res) => {
  try {
    const updates = { ...req.body };
    delete updates.password;
    delete updates.email;

    // Explicitly mark measurements as modified (Mongoose won't detect Object changes otherwise)
    const updatePayload = {
      $set: {
        ...updates,
        lastActive: new Date(),
      }
    };

    const user = await User.findByIdAndUpdate(
      new mongoose.Types.ObjectId(req.params.userId),
      updatePayload,
      { new: true, runValidators: false }
    ).select('-password');

    if (!user) return res.status(404).json({ error: 'User not found' });

    console.log('✅ Profile updated for:', user.username);
    res.json(user);
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update avatar
router.put('/:userId/avatar', async (req, res) => {
  try {
    const { avatar } = req.body;
    if (!avatar) return res.status(400).json({ error: 'Avatar required' });

    const user = await User.findByIdAndUpdate(
      new mongoose.Types.ObjectId(req.params.userId),
      { $set: { avatar } },
      { new: true }
    ).select('-password');

    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (error) {
    console.error('Update avatar error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get user stats
router.get('/:userId/stats', async (req, res) => {
  try {
    const userObjectId = new mongoose.Types.ObjectId(req.params.userId);
    const Workout = require('../models/Workout');
    const Post = require('../models/Post');
    const Nutrition = require('../models/Nutrition');

    const [workoutCount, postCount, nutritionDays, lastWorkout, user] = await Promise.all([
      Workout.countDocuments({ userId: userObjectId, isCompleted: true }),
      Post.countDocuments({ userId: userObjectId }),
      Nutrition.countDocuments({ userId: userObjectId }),
      Workout.findOne({ userId: userObjectId, isCompleted: true }).sort({ completedAt: -1 }),
      User.findById(userObjectId),
    ]);

    const daysActive = user ? Math.floor((Date.now() - user.joinedAt.getTime()) / (1000 * 60 * 60 * 24)) : 0;

    res.json({ workoutCount, postCount, nutritionDays, daysActive, lastWorkoutDate: lastWorkout?.completedAt || null });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;