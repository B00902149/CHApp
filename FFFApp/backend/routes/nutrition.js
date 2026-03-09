const express = require('express');
const router = express.Router();
const Nutrition = require('../models/Nutrition');
const usdaService = require('../services/usda');

const mongoose = require('mongoose');

// Get nutrition for a specific date
router.get('/', async (req, res) => {
  try {
    const { userId, date } = req.query;
    
    if (!userId || !date) {
      return res.status(400).json({ error: 'userId and date required' });
    }

    console.log('📅 Getting nutrition for userId:', userId, 'date:', date);

    const searchDate = new Date(date);
    const startOfDay = new Date(searchDate.setHours(0, 0, 0, 0));
    const endOfDay = new Date(searchDate.setHours(23, 59, 59, 999));

    let userObjectId;
    try {
      userObjectId = new mongoose.Types.ObjectId(userId);
    } catch (err) {
      console.error('❌ Invalid userId format:', userId);
      return res.status(400).json({ error: 'Invalid userId format' });
    }

    let nutrition = await Nutrition.findOne({
      userId: userObjectId,
      date: { $gte: startOfDay, $lte: endOfDay }
    });

    if (!nutrition) {
      console.log('📝 Creating new nutrition log for this day');
      nutrition = new Nutrition({
        userId: userObjectId,
        date: startOfDay,
        breakfast: [],
        lunch: [],
        dinner: [],
        snacks: [],
        totalCalories: 0,
        calorieGoal: 2000
      });
      
      // Save WITHOUT triggering pre-save hooks
      await nutrition.save({ validateBeforeSave: true });
      console.log('✅ New nutrition log created');
    } else {
      console.log('✅ Found existing nutrition log');
      // Recalculate calories
      nutrition.calculateTotalCalories();
    }

    res.json(nutrition);
  } catch (error) {
    console.error('❌ Get nutrition error:', error);
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    res.status(500).json({ error: 'Server error', details: error.message });
  }
});

// Search food using USDA API
router.get('/search', async (req, res) => {
  try {
    const { query } = req.query;
    
    if (!query) {
      return res.status(400).json({ error: 'Query required' });
    }

    console.log('🔍 Searching USDA for:', query);
    const results = await usdaService.searchFood(query);
    console.log(`✅ Found ${results.length} results`);
    
    res.json({ results });
  } catch (error) {
    console.error('Food search error:', error);
    res.status(500).json({ error: 'Failed to search food' });
  }
});

// Add food item to a meal
// Add food item to a meal
router.post('/add-food', async (req, res) => {
  try {
    const { userId, date, mealType, foodItem } = req.body;

    if (!userId || !date || !mealType || !foodItem) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    console.log('🍽️ Adding food to', mealType, ':', foodItem.name);

    const searchDate = new Date(date);
    const startOfDay = new Date(searchDate.setHours(0, 0, 0, 0));
    const endOfDay = new Date(searchDate.setHours(23, 59, 59, 999));

    let userObjectId;
    try {
      userObjectId = new mongoose.Types.ObjectId(userId);
    } catch (err) {
      console.error('❌ Invalid userId format:', userId);
      return res.status(400).json({ error: 'Invalid userId format' });
    }

    let nutrition = await Nutrition.findOne({
      userId: userObjectId,
      date: { $gte: startOfDay, $lte: endOfDay }
    });

    if (!nutrition) {
      nutrition = new Nutrition({
        userId: userObjectId,
        date: startOfDay,
        breakfast: [],
        lunch: [],
        dinner: [],
        snacks: []
      });
    }

    const validMealTypes = ['breakfast', 'lunch', 'dinner', 'snacks'];
    if (!validMealTypes.includes(mealType)) {
      return res.status(400).json({ error: 'Invalid meal type' });
    }

    nutrition[mealType].push(foodItem);
    
    // Calculate total calories manually
    nutrition.calculateTotalCalories();
    
    await nutrition.save({ validateBeforeSave: true });

    console.log('✅ Food added:', foodItem.name, 'to', mealType);
    console.log('📊 Total calories:', nutrition.totalCalories);
    
    res.json(nutrition);
  } catch (error) {
    console.error('❌ Add food error:', error);
    res.status(500).json({ error: 'Server error', details: error.message });
  }
});

// Remove food item
router.delete('/remove-food', async (req, res) => {
  try {
    const { userId, date, mealType, foodId } = req.body;

    const searchDate = new Date(date);
    const startOfDay = new Date(searchDate.setHours(0, 0, 0, 0));
    const endOfDay = new Date(searchDate.setHours(23, 59, 59, 999));

    const nutrition = await Nutrition.findOne({
      userId,
      date: { $gte: startOfDay, $lte: endOfDay }
    });

    if (!nutrition) {
      return res.status(404).json({ error: 'Nutrition log not found' });
    }

    // Remove the food item
    nutrition[mealType] = nutrition[mealType].filter(
      item => item._id.toString() !== foodId
    );

    await nutrition.save();
    console.log('✅ Food removed from', mealType);
    res.json(nutrition);
  } catch (error) {
    console.error('Remove food error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update calorie goal
router.put('/goal', async (req, res) => {
  try {
    const { userId, date, calorieGoal } = req.body;

    const searchDate = new Date(date);
    const startOfDay = new Date(searchDate.setHours(0, 0, 0, 0));
    const endOfDay = new Date(searchDate.setHours(23, 59, 59, 999));

    const nutrition = await Nutrition.findOneAndUpdate(
      {
        userId,
        date: { $gte: startOfDay, $lte: endOfDay }
      },
      { calorieGoal },
      { new: true }
    );

    res.json(nutrition);
  } catch (error) {
    console.error('Update goal error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;