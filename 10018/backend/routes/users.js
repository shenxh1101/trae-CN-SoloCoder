const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Article = require('../models/Article');
const auth = require('../middleware/auth');

router.get('/profile/:username', async (req, res) => {
  try {
    const user = await User.findOne({ username: req.params.username }).select('-password -email');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const articles = await Article.find({ 
      author: user._id, 
      status: 'published', 
      visibility: 'public' 
    })
      .populate('tags', 'name slug')
      .sort({ createdAt: -1 });

    res.json({ user, articles });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const articles = await Article.find({ author: req.user.id })
      .populate('tags', 'name slug')
      .sort({ createdAt: -1 });

    const favoriteArticles = await Article.find({ 
      _id: { $in: user.favoriteArticles },
      status: 'published'
    })
      .populate('tags', 'name slug')
      .populate('author', 'username')
      .sort({ createdAt: -1 });

    res.json({ user, articles, favoriteArticles });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/profile', auth, async (req, res) => {
  try {
    const { bio, avatar } = req.body;
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { bio, avatar },
      { new: true }
    ).select('-password');
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
