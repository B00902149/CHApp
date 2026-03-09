const axios = require('axios');

const USDA_API_KEY = process.env.USDA_API_KEY || 'DEMO_KEY';
const USDA_BASE_URL = 'https://api.nal.usda.gov/fdc/v1';

// Search for food items
const searchFood = async (query) => {
  try {
    console.log('🌐 Calling USDA API');
    console.log('Query:', query);
    console.log('API Key:', USDA_API_KEY ? USDA_API_KEY.substring(0, 10) + '...' : 'MISSING');
    
    const url = `${USDA_BASE_URL}/foods/search`;
    const params = {
      api_key: USDA_API_KEY,
      query: query,
      pageSize: 10
    };

    console.log('Request URL:', url);
    console.log('Request params:', { ...params, api_key: '***' });
    
    const response = await axios.get(url, { params });

    console.log('✅ USDA API responded successfully');
    
    if (!response.data || !response.data.foods || response.data.foods.length === 0) {
      console.log('⚠️ No foods found');
      return [];
    }

    console.log(`📊 Found ${response.data.foods.length} foods`);

    // Map USDA response to our format
    const foods = response.data.foods.map(food => {
      const nutrients = food.foodNutrients || [];
      
      const getAmount = (names) => {
        for (const name of names) {
          const nutrient = nutrients.find(n => 
            n.nutrientName && n.nutrientName.toLowerCase().includes(name.toLowerCase())
          );
          if (nutrient && nutrient.value) {
            return Math.round(nutrient.value);
          }
        }
        return 0;
      };

      return {
        name: food.description ? food.description.toLowerCase() : 'Unknown food',
        calories: getAmount(['Energy', 'Calories']),
        protein: getAmount(['Protein']),
        carbs: getAmount(['Carbohydrate', 'Total carbohydrate']),
        fat: getAmount(['Total lipid', 'Fat']),
        servingSize: food.servingSize && food.servingSizeUnit 
          ? `${food.servingSize} ${food.servingSizeUnit}` 
          : '100g'
      };
    });

    const validFoods = foods.filter(food => food.calories > 0);
    console.log(`✅ Returning ${validFoods.length} valid foods`);
    
    return validFoods;
    
  } catch (error) {
    console.error('❌ USDA API Error Details:');
    console.error('Status:', error.response?.status);
    console.error('Status Text:', error.response?.statusText);
    console.error('Error Data:', error.response?.data);
    console.error('Error Message:', error.message);
    
    if (error.response?.status === 403) {
      console.error('🔑 API Key is invalid or missing!');
      console.error('Go to https://fdc.nal.usda.gov/api-key-signup.html to get a key');
    }
    
    if (error.response?.status === 500) {
      console.error('🔥 USDA API server error - try again or check API status');
    }
    
    return [];
  }
};

module.exports = {
  searchFood
};