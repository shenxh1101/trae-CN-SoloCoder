const express = require('express');
const router = express.Router();
const Comment = require('../models/Comment');
const auth = require('../middleware/auth');

router.get('/:articleId', async (req, res) => {
  try {
    const comments = await Comment.find({ 
      article: req.params.articleId, 
      isApproved: true 
    }).sort({ createdAt: -1 });
    res.json(comments);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/:articleId', async (req, res) => {
  try {
    const comment = new Comment({
      article: req.params.articleId,
      parent: req.body.parent || null,
      author: req.body.author,
      email: req.body.email,
      website: req.body.website,
      content: req.body.content
    });
    await comment.save();
    res.status(201).json(comment);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const comment = await Comment.findByIdAndDelete(req.params.id);
    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' });
    }
    await Comment.deleteMany({ parent: req.params.id });
    res.json({ message: 'Comment deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
