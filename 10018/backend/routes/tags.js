const express = require('express');
const router = express.Router();
const Tag = require('../models/Tag');
const Article = require('../models/Article');
const auth = require('../middleware/auth');

router.get('/', async (req, res) => {
  try {
    const tags = await Tag.find();
    const tagsWithCount = await Promise.all(
      tags.map(async (tag) => {
        const count = await Article.countDocuments({ tags: tag._id, status: 'published' });
        return { ...tag.toObject(), count };
      })
    );
    res.json(tagsWithCount);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const tag = new Tag(req.body);
    await tag.save();
    res.status(201).json(tag);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const tag = await Tag.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!tag) {
      return res.status(404).json({ message: 'Tag not found' });
    }
    res.json(tag);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const tag = await Tag.findByIdAndDelete(req.params.id);
    if (!tag) {
      return res.status(404).json({ message: 'Tag not found' });
    }
    await Article.updateMany(
      { tags: req.params.id },
      { $pull: { tags: req.params.id } }
    );
    res.json({ message: 'Tag deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
