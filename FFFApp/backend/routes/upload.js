const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Post = require('../models/Post');
const Workout = require('../models/Workout');
const mongoose = require('mongoose');

// Upload profile picture
router.post('/profile-picture', async (req, res) => {
  try {
    const { userId, imageData } = req.body;

    if (!userId || !imageData) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Validate base64 image
    if (!imageData.startsWith('data:image/')) {
      return res.status(400).json({ error: 'Invalid image format' });
    }

    const userObjectId = new mongoose.Types.ObjectId(userId);

    const user = await User.findByIdAndUpdate(
      userObjectId,
      { profilePicture: imageData },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    console.log('✅ Profile picture updated for:', user.username);
    res.json(user);
  } catch (error) {
    console.error('Upload profile picture error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Remove profile picture
router.delete('/profile-picture/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const userObjectId = new mongoose.Types.ObjectId(userId);

    const user = await User.findByIdAndUpdate(
      userObjectId,
      { profilePicture: null },
      { new: true }
    ).select('-password');

    console.log('✅ Profile picture removed');
    res.json(user);
  } catch (error) {
    console.error('Remove profile picture error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Upload workout photo
router.post('/workout-photo', async (req, res) => {
  try {
    const { workoutId, imageData } = req.body;

    if (!workoutId || !imageData) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const workout = await Workout.findByIdAndUpdate(
      workoutId,
      { photo: imageData },
      { new: true }
    );

    if (!workout) {
      return res.status(404).json({ error: 'Workout not found' });
    }

    console.log('✅ Workout photo uploaded');
    res.json(workout);
  } catch (error) {
    console.error('Upload workout photo error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;