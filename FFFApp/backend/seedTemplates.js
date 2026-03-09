const mongoose = require('mongoose');
const Workout = require('./models/Workout');
require('dotenv').config();

const templates = [
  {
    title: 'Upper Body Strength',
    templateName: 'Push Day A',
    exercises: [
      {
        name: 'Bench Press',
        sets: [
          { reps: 10, weight: 60, completed: false },
          { reps: 10, weight: 60, completed: false },
          { reps: 8, weight: 65, completed: false },
          { reps: 8, weight: 65, completed: false }
        ]
      },
      {
        name: 'Overhead Press',
        sets: [
          { reps: 10, weight: 40, completed: false },
          { reps: 10, weight: 40, completed: false },
          { reps: 10, weight: 40, completed: false }
        ]
      },
      {
        name: 'Incline Dumbbell Press',
        sets: [
          { reps: 12, weight: 20, completed: false },
          { reps: 12, weight: 20, completed: false },
          { reps: 12, weight: 20, completed: false }
        ]
      },
      {
        name: 'Tricep Dips',
        sets: [
          { reps: 12, weight: 0, completed: false },
          { reps: 12, weight: 0, completed: false },
          { reps: 10, weight: 0, completed: false }
        ]
      },
      {
        name: 'Lateral Raises',
        sets: [
          { reps: 15, weight: 10, completed: false },
          { reps: 15, weight: 10, completed: false },
          { reps: 15, weight: 10, completed: false }
        ]
      }
    ],
    isTemplate: true,
    isCompleted: false
  },
  {
    title: 'Back & Biceps',
    templateName: 'Pull Day A',
    exercises: [
      {
        name: 'Pull-ups',
        sets: [
          { reps: 8, weight: 0, completed: false },
          { reps: 8, weight: 0, completed: false },
          { reps: 6, weight: 0, completed: false },
          { reps: 6, weight: 0, completed: false }
        ]
      },
      {
        name: 'Barbell Rows',
        sets: [
          { reps: 10, weight: 50, completed: false },
          { reps: 10, weight: 50, completed: false },
          { reps: 10, weight: 50, completed: false },
          { reps: 8, weight: 55, completed: false }
        ]
      },
      {
        name: 'Lat Pulldown',
        sets: [
          { reps: 12, weight: 45, completed: false },
          { reps: 12, weight: 45, completed: false },
          { reps: 12, weight: 45, completed: false }
        ]
      },
      {
        name: 'Bicep Curls',
        sets: [
          { reps: 12, weight: 15, completed: false },
          { reps: 12, weight: 15, completed: false },
          { reps: 10, weight: 17.5, completed: false }
        ]
      },
      {
        name: 'Face Pulls',
        sets: [
          { reps: 15, weight: 20, completed: false },
          { reps: 15, weight: 20, completed: false },
          { reps: 15, weight: 20, completed: false }
        ]
      }
    ],
    isTemplate: true,
    isCompleted: false
  },
  {
    title: 'Lower Body Power',
    templateName: 'Leg Day A',
    exercises: [
      {
        name: 'Barbell Squats',
        sets: [
          { reps: 8, weight: 80, completed: false },
          { reps: 8, weight: 80, completed: false },
          { reps: 8, weight: 80, completed: false },
          { reps: 6, weight: 85, completed: false }
        ]
      },
      {
        name: 'Romanian Deadlifts',
        sets: [
          { reps: 10, weight: 60, completed: false },
          { reps: 10, weight: 60, completed: false },
          { reps: 10, weight: 60, completed: false }
        ]
      },
      {
        name: 'Leg Press',
        sets: [
          { reps: 12, weight: 100, completed: false },
          { reps: 12, weight: 100, completed: false },
          { reps: 12, weight: 100, completed: false }
        ]
      },
      {
        name: 'Leg Curls',
        sets: [
          { reps: 12, weight: 30, completed: false },
          { reps: 12, weight: 30, completed: false },
          { reps: 12, weight: 30, completed: false }
        ]
      },
      {
        name: 'Calf Raises',
        sets: [
          { reps: 15, weight: 40, completed: false },
          { reps: 15, weight: 40, completed: false },
          { reps: 15, weight: 40, completed: false },
          { reps: 15, weight: 40, completed: false }
        ]
      }
    ],
    isTemplate: true,
    isCompleted: false
  }
];

async function seedTemplates() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Get the first user (or replace with your user ID)
    const User = require('./models/User');
    const user = await User.findOne();
    
    if (!user) {
      console.log('❌ No user found. Please create a user first.');
      process.exit(1);
    }

    console.log('Creating templates for user:', user.username);

    // Add userId to each template
    const templatesWithUser = templates.map(t => ({
      ...t,
      userId: user._id
    }));

    // Insert templates
    await Workout.insertMany(templatesWithUser);

    console.log('✅ Successfully created 3 workout templates!');
    console.log('Templates:');
    console.log('1. Push Day A (Chest, Shoulders, Triceps)');
    console.log('2. Pull Day A (Back, Biceps)');
    console.log('3. Leg Day A (Lower Body)');

    process.exit(0);
  } catch (error) {
    console.error('Error seeding templates:', error);
    process.exit(1);
  }
}

seedTemplates();