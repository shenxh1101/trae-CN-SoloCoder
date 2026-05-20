const express = require('express');
const router = express.Router();
const Article = require('../models/Article');
const Comment = require('../models/Comment');
const User = require('../models/User');
const auth = require('../middleware/auth');

router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const tag = req.query.tag;
    const search = req.query.search;
    const skip = (page - 1) * limit;

    let query = { status: 'published', visibility: 'public' };
    if (tag) {
      query.tags = tag;
    }
    if (search) {
      query.$text = { $search: search };
    }

    const articles = await Article.find(query)
      .populate('tags', 'name slug')
      .populate('author', 'username')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Article.countDocuments(query);

    res.json({
      articles,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/all', auth, async (req, res) => {
  try {
    const articles = await Article.find()
      .populate('tags', 'name slug')
      .sort({ createdAt: -1 });
    res.json(articles);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/archive', async (req, res) => {
  try {
    const articles = await Article.find({ status: 'published', visibility: 'public' })
      .select('title slug createdAt')
      .sort({ createdAt: -1 });
    
    const archive = {};
    articles.forEach(article => {
      const year = new Date(article.createdAt).getFullYear();
      const month = new Date(article.createdAt).getMonth() + 1;
      const key = `${year}-${month.toString().padStart(2, '0')}`;
      if (!archive[key]) {
        archive[key] = [];
      }
      archive[key].push(article);
    });

    res.json(archive);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/:slug', async (req, res) => {
  try {
    let query = { slug: req.params.slug, status: 'published' };
    
    const token = req.header('x-auth-token');
    if (!token) {
      query.visibility = 'public';
    }

    const article = await Article.findOne(query)
      .populate('tags', 'name slug')
      .populate('author', 'username bio avatar');
    
    if (!article) {
      return res.status(404).json({ message: 'Article not found' });
    }

    article.views += 1;
    await article.save();

    const comments = await Comment.find({ article: article._id, isApproved: true })
      .sort({ createdAt: -1 });

    res.json({ article, comments });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/:id/views', async (req, res) => {
  try {
    const article = await Article.findById(req.params.id);
    if (!article) {
      return res.status(404).json({ message: 'Article not found' });
    }
    article.views += 1;
    await article.save();
    res.json({ views: article.views });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const article = new Article({
      ...req.body,
      author: req.user.id
    });
    await article.save();
    await article.populate('tags', 'name slug');
    res.status(201).json(article);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const article = await Article.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedAt: Date.now() },
      { new: true }
    ).populate('tags', 'name slug');
    
    if (!article) {
      return res.status(404).json({ message: 'Article not found' });
    }
    res.json(article);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const article = await Article.findByIdAndDelete(req.params.id);
    if (!article) {
      return res.status(404).json({ message: 'Article not found' });
    }
    await Comment.deleteMany({ article: req.params.id });
    res.json({ message: 'Article deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/:id/like', auth, async (req, res) => {
  try {
    const article = await Article.findById(req.params.id);
    if (!article) {
      return res.status(404).json({ message: 'Article not found' });
    }

    const userId = req.user.id;
    const hasLiked = article.likedBy.includes(userId);

    if (hasLiked) {
      article.likedBy = article.likedBy.filter(id => id.toString() !== userId);
      article.likes = Math.max(0, article.likes - 1);
    } else {
      article.likedBy.push(userId);
      article.likes += 1;
    }

    await article.save();
    res.json({ 
      likes: article.likes, 
      liked: !hasLiked,
      likedBy: article.likedBy
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/:id/favorite', auth, async (req, res) => {
  try {
    const article = await Article.findById(req.params.id);
    if (!article) {
      return res.status(404).json({ message: 'Article not found' });
    }

    const userId = req.user.id;
    const user = await User.findById(userId);
    
    const hasFavorited = user.favoriteArticles.includes(req.params.id);

    if (hasFavorited) {
      user.favoriteArticles = user.favoriteArticles.filter(id => id.toString() !== req.params.id);
      article.favorites = Math.max(0, article.favorites - 1);
    } else {
      user.favoriteArticles.push(req.params.id);
      article.favorites += 1;
    }

    await user.save();
    await article.save();
    res.json({ 
      favorites: article.favorites, 
      favorited: !hasFavorited
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
