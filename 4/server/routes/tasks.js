const express = require('express');
const tasksController = require('../controllers/tasks');
const commentsController = require('../controllers/comments');

const router = express.Router();

router.get('/upcoming', tasksController.getUpcomingTasks);
router.get('/:id', tasksController.getTaskById);
router.put('/:id', tasksController.updateTask);
router.delete('/:id', tasksController.deleteTask);

router.get('/:taskId/comments', commentsController.getTaskComments);
router.post('/:taskId/comments', commentsController.createComment);

module.exports = router;
