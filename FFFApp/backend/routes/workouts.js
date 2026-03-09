const express = require('express');
const router = express.Router();
const Workout = require('../models/Workout');
const mongoose = require('mongoose');

// IMPORTANT: Put specific routes BEFORE parameterized routes

// Get user's workout templates - MOVE THIS TO TOP
router.get('/templates', async (req, res) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const userObjectId = new mongoose.Types.ObjectId(userId);

    const templates = await Workout.find({ 
      userId: userObjectId,
      isTemplate: true 
    }).sort({ createdAt: -1 });

    console.log(`✅ Found ${templates.length} templates for user`);
    res.json(templates);
  } catch (error) {
    console.error('Get templates error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create workout from template
router.post('/from-template/:templateId', async (req, res) => {
  try {
    const { templateId } = req.params;

    console.log('Creating workout from template:', templateId);

    // Validate templateId
    if (!mongoose.Types.ObjectId.isValid(templateId)) {
      return res.status(400).json({ error: 'Invalid template ID' });
    }

    const template = await Workout.findById(templateId);
    
    if (!template) {
      console.log('❌ Template not found');
      return res.status(404).json({ error: 'Template not found' });
    }

    if (!template.isTemplate) {
      console.log('❌ Not a template');
      return res.status(400).json({ error: 'This is not a template' });
    }

    console.log('✅ Template found:', template.templateName);
    console.log('Template userId:', template.userId);

    // Create new workout from template
    const workoutData = {
      userId: template.userId,
      title: template.title,
      exercises: template.exercises.map(ex => ({
        name: ex.name,
        sets: ex.sets.map(set => ({
          reps: set.reps || 0,
          weight: set.weight || 0,
          completed: false
        }))
      })),
      isTemplate: false,
      isCompleted: false,
      rating: null,
      comment: ''
    };

    console.log('Creating workout with data:', JSON.stringify(workoutData, null, 2));

    const workout = new Workout(workoutData);
    await workout.save();

    console.log('✅ Workout created from template:', workout._id);
    res.json(workout);
  } catch (error) {
    console.error('❌ Create from template error:', error);
    console.error('Error details:', error.message);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      error: 'Server error',
      details: error.message 
    });
  }
});

// Delete template - MOVE THIS TO TOP
router.delete('/templates/:templateId', async (req, res) => {
  try {
    const { templateId } = req.params;

    const template = await Workout.findOneAndDelete({ 
      _id: templateId,
      isTemplate: true 
    });

    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    console.log('✅ Template deleted');
    res.json({ message: 'Template deleted successfully' });
  } catch (error) {
    console.error('Delete template error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// NOW the general routes come after specific ones

// Get user's workouts
router.get('/', async (req, res) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const userObjectId = new mongoose.Types.ObjectId(userId);

    const workouts = await Workout.find({ userId: userObjectId })
      .sort({ createdAt: -1 });

    console.log(`✅ Found ${workouts.length} workouts for user`);
    res.json(workouts);
  } catch (error) {
    console.error('Get workouts error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create workout
router.post('/', async (req, res) => {
  try {
    const { userId, title, exercises } = req.body;

    if (!userId || !title || !exercises) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const userObjectId = new mongoose.Types.ObjectId(userId);

    const workout = new Workout({
      userId: userObjectId,
      title,
      exercises
    });

    await workout.save();

    console.log('✅ Workout created:', workout._id);
    res.status(201).json(workout);
  } catch (error) {
    console.error('Create workout error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get single workout - THIS COMES AFTER /templates
router.get('/:workoutId', async (req, res) => {
  try {
    const { workoutId } = req.params;

    const workout = await Workout.findById(workoutId);

    if (!workout) {
      return res.status(404).json({ error: 'Workout not found' });
    }

    console.log('✅ Workout found:', workout._id);
    res.json(workout);
  } catch (error) {
    console.error('Get workout error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update workout exercise
router.put('/:workoutId/exercises/:exerciseIndex/sets/:setIndex', async (req, res) => {
  try {
    const { workoutId, exerciseIndex, setIndex } = req.params;
    const { completed } = req.body;

    const workout = await Workout.findById(workoutId);

    if (!workout) {
      return res.status(404).json({ error: 'Workout not found' });
    }

    workout.exercises[exerciseIndex].sets[setIndex].completed = completed;
    await workout.save();

    console.log('✅ Set updated');
    res.json(workout);
  } catch (error) {
    console.error('Update set error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Complete workout
router.post('/:workoutId/complete', async (req, res) => {
  try {
    const { workoutId } = req.params;
    const { rating, comment } = req.body;

    const workout = await Workout.findById(workoutId);

    if (!workout) {
      return res.status(404).json({ error: 'Workout not found' });
    }

    workout.isCompleted = true;
    workout.completedAt = new Date();
    workout.rating = rating;
    workout.comment = comment || '';

    await workout.save();

    console.log('✅ Workout completed');
    res.json(workout);
  } catch (error) {
    console.error('Complete workout error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Save workout as template
router.post('/:workoutId/save-template', async (req, res) => {
  try {
    const { workoutId } = req.params;
    const { templateName } = req.body;

    if (!templateName) {
      return res.status(400).json({ error: 'Template name is required' });
    }

    const workout = await Workout.findById(workoutId);
    
    if (!workout) {
      return res.status(404).json({ error: 'Workout not found' });
    }

    const template = new Workout({
      userId: workout.userId,
      title: workout.title,
      exercises: workout.exercises.map(ex => ({
        name: ex.name,
        sets: ex.sets.map(set => ({
          reps: set.reps,
          weight: set.weight,
          completed: false
        }))
      })),
      isTemplate: true,
      templateName,
      isCompleted: false,
      rating: null,
      comment: ''
    });

    await template.save();

    console.log('✅ Template saved:', templateName);
    res.json(template);
  } catch (error) {
    console.error('Save template error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete workout
router.delete('/:workoutId', async (req, res) => {
  try {
    const { workoutId } = req.params;

    const workout = await Workout.findByIdAndDelete(workoutId);

    if (!workout) {
      return res.status(404).json({ error: 'Workout not found' });
    }

    console.log('✅ Workout deleted');
    res.json({ message: 'Workout deleted successfully' });
  } catch (error) {
    console.error('Delete workout error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Test route - check templates
router.get('/test/check-templates', async (req, res) => {
  try {
    const allWorkouts = await Workout.find({});
    const templates = allWorkouts.filter(w => w.isTemplate);
    
    res.json({
      totalWorkouts: allWorkouts.length,
      totalTemplates: templates.length,
      templates: templates.map(t => ({
        id: t._id,
        name: t.templateName,
        title: t.title,
        exerciseCount: t.exercises.length
      }))
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;