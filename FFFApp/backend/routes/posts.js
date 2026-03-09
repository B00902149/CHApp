const express = require('express');
const router = express.Router();
const Post = require('../models/Post');
const mongoose = require('mongoose');

// Get all posts (community feed)
router.get('/', async (req, res) => {
  try {
    const { limit = 20, skip = 0 } = req.query;

    const posts = await Post.find()
      .sort({ createdAt: -1 }) // Newest first
      .limit(parseInt(limit))
      .skip(parseInt(skip));

    console.log(`✅ Retrieved ${posts.length} posts`);
    res.json({ posts });
  } catch (error) {
    console.error('Get posts error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get posts by user
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const userObjectId = new mongoose.Types.ObjectId(userId);

    const posts = await Post.find({ userId: userObjectId })
      .sort({ createdAt: -1 });

    res.json({ posts });
  } catch (error) {
    console.error('Get user posts error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create post
router.post('/', async (req, res) => {
  try {
    const { userId, username, category, content } = req.body;

    if (!userId || !username || !category || !content) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const userObjectId = new mongoose.Types.ObjectId(userId);

    const post = new Post({
      userId: userObjectId,
      username,
      category,
      content,
      likes: [],
      comments: []
    });

    await post.save();

    console.log('✅ Post created by', username);
    res.status(201).json(post);
  } catch (error) {
    console.error('Create post error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Like/Unlike post
router.post('/:postId/like', async (req, res) => {
  try {
    const { postId } = req.params;
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'userId required' });
    }

    const userObjectId = new mongoose.Types.ObjectId(userId);
    const post = await Post.findById(postId);

    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const likeIndex = post.likes.findIndex(id => id.toString() === userId);

    if (likeIndex > -1) {
      // Unlike
      post.likes.splice(likeIndex, 1);
      console.log('👎 Post unliked');
    } else {
      // Like
      post.likes.push(userObjectId);
      console.log('👍 Post liked');
    }

    await post.save();
    res.json(post);
  } catch (error) {
    console.error('Like post error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Add comment
router.post('/:postId/comment', async (req, res) => {
  try {
    const { postId } = req.params;
    const { userId, username, text } = req.body;

    if (!userId || !username || !text) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const userObjectId = new mongoose.Types.ObjectId(userId);
    const post = await Post.findById(postId);

    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    post.comments.push({
      userId: userObjectId,
      username,
      text
    });

    await post.save();

    console.log('✅ Comment added by', username);
    res.json(post);
  } catch (error) {
    console.error('Add comment error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete post
router.delete('/:postId', async (req, res) => {
  try {
    const { postId } = req.params;
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'userId required' });
    }

    const post = await Post.findById(postId);

    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    // Check if user owns the post
    if (post.userId.toString() !== userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    await Post.findByIdAndDelete(postId);

    console.log('✅ Post deleted');
    res.json({ message: 'Post deleted', id: postId });
  } catch (error) {
    console.error('Delete post error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;