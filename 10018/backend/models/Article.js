const mongoose = require('mongoose');
const slugify = require('slugify');
const { marked } = require('marked');

const articleSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  slug: {
    type: String,
    unique: true,
    lowercase: true
  },
  content: {
    type: String,
    required: true
  },
  excerpt: {
    type: String,
    trim: true
  },
  coverImage: {
    type: String,
    default: ''
  },
  tags: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tag'
  }],
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['draft', 'published'],
    default: 'draft'
  },
  visibility: {
    type: String,
    enum: ['public', 'private'],
    default: 'public'
  },
  views: {
    type: Number,
    default: 0
  },
  likes: {
    type: Number,
    default: 0
  },
  likedBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  favorites: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

function generateExcerpt(content) {
  const plainText = content
    .replace(/[#*`_~\[\]()!]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return plainText.substring(0, 200) + (plainText.length > 200 ? '...' : '');
}

articleSchema.pre('save', function(next) {
  if (this.isModified('title')) {
    this.slug = slugify(this.title, { lower: true, strict: true });
  }
  if (this.isModified('content')) {
    const shouldGenerateExcerpt = !this.excerpt || this.excerpt.trim() === '';
    if (shouldGenerateExcerpt) {
      this.excerpt = generateExcerpt(this.content);
    }
  }
  this.updatedAt = Date.now();
  next();
});

articleSchema.pre('findOneAndUpdate', function(next) {
  const update = this.getUpdate();
  if (update.title) {
    update.slug = slugify(update.title, { lower: true, strict: true });
  }
  if (update.content) {
    const shouldGenerateExcerpt = !update.excerpt || update.excerpt.trim() === '';
    if (shouldGenerateExcerpt) {
      update.excerpt = generateExcerpt(update.content);
    }
  }
  update.updatedAt = Date.now();
  this.setUpdate(update);
  next();
});

articleSchema.index({ title: 'text', content: 'text' });

module.exports = mongoose.model('Article', articleSchema);
