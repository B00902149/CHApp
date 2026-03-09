const mongoose = require('mongoose');

const foodItemSchema = new mongoose.Schema({
  name: { type: String, required: true },
  calories: { type: Number, required: true },
  protein: { type: Number, default: 0 },
  carbs: { type: Number, default: 0 },
  fat: { type: Number, default: 0 },
  servingSize: { type: String, default: '1 serving' }
});

const nutritionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  breakfast: {
    type: [foodItemSchema],
    default: []
  },
  lunch: {
    type: [foodItemSchema],
    default: []
  },
  dinner: {
    type: [foodItemSchema],
    default: []
  },
  snacks: {
    type: [foodItemSchema],
    default: []
  },
  totalCalories: {
    type: Number,
    default: 0
  },
  calorieGoal: {
    type: Number,
    default: 2000
  },
  waterIntake: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Add method to calculate total calories
nutritionSchema.methods.calculateTotalCalories = function() {
  const allFoods = [
    ...(this.breakfast || []),
    ...(this.lunch || []),
    ...(this.dinner || []),
    ...(this.snacks || [])
  ];
  
  this.totalCalories = allFoods.reduce((total, food) => {
    return total + (food.calories || 0);
  }, 0);
};

module.exports = mongoose.model('Nutrition', nutritionSchema);