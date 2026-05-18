const express = require('express');
const commentsController = require('../controllers/comments');

const router = express.Router();

router.delete('/:id', commentsController.deleteComment);

module.exports = router;
