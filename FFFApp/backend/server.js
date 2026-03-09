const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const workoutRoutes = require('./routes/workouts'); 
const nutritionRoutes = require('./routes/nutrition');
const postRoutes = require('./routes/posts'); 
const profileRoutes = require('./routes/profile');
const uploadRoutes = require('./routes/upload');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));  // INCREASE THIS from default
app.use(express.urlencoded({ limit: '50mb', extended: true }));  // AND THIS

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ MongoDB connected successfully'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/workouts', workoutRoutes);
app.use('/api/nutrition', nutritionRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/upload', uploadRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'FFF API is running',
    timestamp: new Date()
  });
});

// Bible verse endpoint
app.get('/api/verse/daily', (req, res) => {
  const verses = [
    { 
      text: "I can do all things through Christ who strengthens me.", 
      reference: "Philippians 4:13" 
    },
    { 
      text: "Be strong and courageous. Do not be afraid; do not be discouraged.", 
      reference: "Joshua 1:9" 
    },
    { 
      text: "For God gave us a spirit not of fear but of power and love.", 
      reference: "2 Timothy 1:7" 
    }
  ];
  
  const randomVerse = verses[Math.floor(Math.random() * verses.length)];
  res.json(randomVerse);
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`🌐 Network: http://192.168.0.70:${PORT}`);
  console.log(`📱 API: http://192.168.0.70:${PORT}/api`);
});