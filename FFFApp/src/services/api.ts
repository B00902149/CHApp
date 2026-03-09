import axios from 'axios';

// Use your computer's IP address (from ipconfig)
const API_BASE_URL = 'http://192.168.0.70:5000/api';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  }
});

// Auth API calls
export const authAPI = {
  // Register new user
  register: async (email: string, username: string, password: string, firstName: string, surname: string, country: string, mobile: string = '') => {
    try {
      const response = await api.post('/auth/register', {
        email, username, password, firstName, surname, country, mobile
      });
      return response.data;
    } catch (error: any) {
      throw error.response?.data || { error: 'Network error' };
    }
  },

    // Login user
    login: async (email: string, password: string) => {
      try {
        const response = await api.post('/auth/login', {
          email,
          password
        });
        return response.data;
      } catch (error: any) {
        throw error.response?.data || { error: 'Network error' };
      }
    },

    // Forgot password
    forgotPassword: async (email: string) => {
      try {
        const response = await api.post('/auth/forgot-password', { email });
        return response.data;
      } catch (error: any) {
        throw error.response?.data || { error: 'Network error' };
      }
    },
    changePassword: async (userId: string, currentPassword: string, newPassword: string) => {
      try {
        const response = await api.post('/auth/change-password', { userId, currentPassword, newPassword });
        return response.data;
      } catch (error: any) {
        throw error.response?.data || { error: 'Network error' };
      }
    },
  };

// Bible verse API
export const verseAPI = {
  getDaily: async () => {
    try {
      const response = await api.get('/verse/daily');
      return response.data;
    } catch (error: any) {
      throw error.response?.data || { error: 'Network error' };
    }
  }
};

export const workoutAPI = {
  // Get user's workouts
  getWorkouts: async (userId: string) => {
    try {
      const response = await api.get('/workouts', {
        params: { userId }
      });
      return response.data;
    } catch (error: any) {
      console.error('Get workouts error:', error);
      throw error.response?.data || { error: 'Failed to get workouts' };
    }
  },

  // Get single workout
  getWorkout: async (workoutId: string) => {
    try {
      const response = await api.get(`/workouts/${workoutId}`);
      return response.data;
    } catch (error: any) {
      console.error('Get workout error:', error);
      throw error.response?.data || { error: 'Failed to get workout' };
    }
  },

  // Create workout
  createWorkout: async (workout: any) => {
    try {
      console.log('📤 Sending workout to API:', JSON.stringify(workout, null, 2));

      const response = await api.post('/workouts', workout);

      console.log('✅ Workout created response:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ Create workout error:', error);
      console.error('Error response:', error.response?.data);
      throw error.response?.data || { error: 'Failed to create workout' };
    }
  },

  // Update workout
  updateWorkout: async (workoutId: string, updateData: any) => {
    try {
      const response = await api.put(`/workouts/${workoutId}`, updateData);
      return response.data;
    } catch (error: any) {
      console.error('Update workout error:', error);
      throw error.response?.data || { error: 'Failed to update workout' };
    }
  },

  // Update a specific set
  updateSet: async (workoutId: string, exerciseIndex: number, setIndex: number, completed: boolean) => {
    try {
      const response = await api.put(
        `/workouts/${workoutId}/exercises/${exerciseIndex}/sets/${setIndex}`,
        { completed }
      );
      return response.data;
    } catch (error: any) {
      console.error('Update set error:', error);
      throw error.response?.data || { error: 'Failed to update set' };
    }
  },

  // Complete workout
  completeWorkout: async (workoutId: string, rating: number, comment: string) => {
    try {
      const response = await api.post(`/workouts/${workoutId}/complete`, {
        rating,
        comment
      });
      return response.data;
    } catch (error: any) {
      console.error('Complete workout error:', error);
      throw error.response?.data || { error: 'Failed to complete workout' };
    }
  },

  // Delete workout
  deleteWorkout: async (workoutId: string) => {
    try {
      const response = await api.delete(`/workouts/${workoutId}`);
      return response.data;
    } catch (error: any) {
      console.error('Delete workout error:', error);
      throw error.response?.data || { error: 'Failed to delete workout' };
    }
  },

  // Get user's templates
  getTemplates: async (userId: string) => {
    try {
      const response = await api.get('/workouts/templates', {
        params: { userId }
      });
      return response.data;
    } catch (error: any) {
      console.error('Get templates error:', error);
      throw error.response?.data || { error: 'Failed to get templates' };
    }
  },

  // Save workout as template
  saveAsTemplate: async (workoutId: string, templateName: string) => {
    try {
      const response = await api.post(`/workouts/${workoutId}/save-template`, {
        templateName
      });
      return response.data;
    } catch (error: any) {
      console.error('Save template error:', error);
      throw error.response?.data || { error: 'Failed to save template' };
    }
  },

  // Create workout from template
  createFromTemplate: async (templateId: string) => {
    try {
      const response = await api.post(`/workouts/from-template/${templateId}`);
      return response.data;
    } catch (error: any) {
      console.error('Create from template error:', error);
      throw error.response?.data || { error: 'Failed to create from template' };
    }
  },

  // Delete template
  deleteTemplate: async (templateId: string) => {
    try {
      const response = await api.delete(`/workouts/templates/${templateId}`);
      return response.data;
    } catch (error: any) {
      console.error('Delete template error:', error);
      throw error.response?.data || { error: 'Failed to delete template' };
    }
  }
};

// Nutrition API
export const nutritionAPI = {
  // Get nutrition for a specific date
  getNutrition: async (userId: string, date: string) => {
    try {
      const response = await api.get(`/nutrition?userId=${userId}&date=${date}`);
      return response.data;
    } catch (error: any) {
      console.error('Get nutrition error:', error);
      throw error.response?.data || { error: 'Failed to get nutrition' };
    }
  },

  // Search food with USDA API  ← ADD THIS ENTIRE FUNCTION
  searchFood: async (query: string) => {
    try {
      console.log('API: Searching for:', query);
      const response = await api.get(`/nutrition/search?query=${encodeURIComponent(query)}`);
      console.log('API: Got response:', response.data);
      return response.data.results || [];
    } catch (error: any) {
      console.error('Search food error:', error);
      throw error.response?.data || { error: 'Failed to search food' };
    }
  },

  // Add food item to a meal
  addFood: async (userId: string, date: string, mealType: string, foodItem: any) => {
    try {
      const response = await api.post('/nutrition/add-food', {
        userId,
        date,
        mealType,
        foodItem
      });
      return response.data;
    } catch (error: any) {
      console.error('Add food error:', error);
      throw error.response?.data || { error: 'Failed to add food' };
    }
  },

  // Remove food item
  removeFood: async (userId: string, date: string, mealType: string, foodId: string) => {
    try {
      const response = await api.delete('/nutrition/remove-food', {
        data: { userId, date, mealType, foodId }
      });
      return response.data;
    } catch (error: any) {
      console.error('Remove food error:', error);
      throw error.response?.data || { error: 'Failed to remove food' };
    }
  },

  // Update calorie goal
  updateGoal: async (userId: string, date: string, calorieGoal: number) => {
    try {
      const response = await api.put('/nutrition/goal', {
        userId,
        date,
        calorieGoal
      });
      return response.data;
    } catch (error: any) {
      console.error('Update goal error:', error);
      throw error.response?.data || { error: 'Failed to update goal' };
    }
  }
};

// Community/Posts API
export const postsAPI = {
  // Get all posts (community feed)
  getPosts: async (limit = 20, skip = 0) => {
    try {
      const response = await api.get(`/posts?limit=${limit}&skip=${skip}`);
      return response.data.posts || [];
    } catch (error: any) {
      console.error('Get posts error:', error);
      throw error.response?.data || { error: 'Failed to get posts' };
    }
  },

  // Get posts by user
  getUserPosts: async (userId: string) => {
    try {
      const response = await api.get(`/posts/user/${userId}`);
      return response.data.posts || [];
    } catch (error: any) {
      console.error('Get user posts error:', error);
      throw error.response?.data || { error: 'Failed to get user posts' };
    }
  },

  // Create post
  createPost: async (userId: string, username: string, category: string, content: string) => {
    try {
      const response = await api.post('/posts', {
        userId,
        username,
        category,
        content
      });
      return response.data;
    } catch (error: any) {
      console.error('Create post error:', error);
      throw error.response?.data || { error: 'Failed to create post' };
    }
  },

  // Like/unlike post
  likePost: async (postId: string, userId: string) => {
    try {
      const response = await api.post(`/posts/${postId}/like`, { userId });
      return response.data;
    } catch (error: any) {
      console.error('Like post error:', error);
      throw error.response?.data || { error: 'Failed to like post' };
    }
  },

  // Add comment
  addComment: async (postId: string, userId: string, username: string, text: string) => {
    try {
      const response = await api.post(`/posts/${postId}/comment`, {
        userId,
        username,
        text
      });
      return response.data;
    } catch (error: any) {
      console.error('Add comment error:', error);
      throw error.response?.data || { error: 'Failed to add comment' };
    }
  },

  // Delete post
  deletePost: async (postId: string, userId: string) => {
    try {
      const response = await api.delete(`/posts/${postId}`, {
        data: { userId }
      });
      return response.data;
    } catch (error: any) {
      console.error('Delete post error:', error);
      throw error.response?.data || { error: 'Failed to delete post' };
    }
  }
};

// Profile API
export const profileAPI = {
  // Get user profile
  getProfile: async (userId: string) => {
    try {
      const response = await api.get(`/profile/${userId}`);
      return response.data;
    } catch (error: any) {
      console.error('Get profile error:', error);
      throw error.response?.data || { error: 'Failed to get profile' };
    }
  },

  // Update profile
  updateProfile: async (userId: string, updates: any) => {
    try {
      const response = await api.put(`/profile/${userId}`, updates);
      return response.data;
    } catch (error: any) {
      console.error('Update profile error:', error);
      throw error.response?.data || { error: 'Failed to update profile' };
    }
  },

  // Update avatar
  updateAvatar: async (userId: string, avatar: string) => {
    try {
      const response = await api.put(`/profile/${userId}/avatar`, { avatar });
      return response.data;
    } catch (error: any) {
      console.error('Update avatar error:', error);
      throw error.response?.data || { error: 'Failed to update avatar' };
    }
  },

  // Get stats
  getStats: async (userId: string) => {
    try {
      const response = await api.get(`/profile/${userId}/stats`);
      return response.data;
    } catch (error: any) {
      console.error('Get stats error:', error);
      throw error.response?.data || { error: 'Failed to get stats' };
    }
  }
};

// Upload API
export const uploadAPI = {
  // Upload profile picture
  uploadProfilePicture: async (userId: string, imageData: string) => {
    try {
      const response = await api.post('/upload/profile-picture', {
        userId,
        imageData
      });
      return response.data;
    } catch (error: any) {
      console.error('Upload profile picture error:', error);
      throw error.response?.data || { error: 'Failed to upload profile picture' };
    }
  },

  // Remove profile picture
  removeProfilePicture: async (userId: string) => {
    try {
      const response = await api.delete(`/upload/profile-picture/${userId}`);
      return response.data;
    } catch (error: any) {
      console.error('Remove profile picture error:', error);
      throw error.response?.data || { error: 'Failed to remove profile picture' };
    }
  },

  // Upload workout photo
  uploadWorkoutPhoto: async (workoutId: string, imageData: string) => {
    try {
      const response = await api.post('/upload/workout-photo', {
        workoutId,
        imageData
      });
      return response.data;
    } catch (error: any) {
      console.error('Upload workout photo error:', error);
      throw error.response?.data || { error: 'Failed to upload workout photo' };
    }
  }
};

export default api;