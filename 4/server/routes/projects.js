const express = require('express');
const projectsController = require('../controllers/projects');
const tasksController = require('../controllers/tasks');

const router = express.Router();

router.get('/', projectsController.getAllProjects);
router.get('/search', projectsController.searchProjects);
router.get('/:id', projectsController.getProjectById);
router.post('/', projectsController.createProject);
router.put('/:id', projectsController.updateProject);
router.delete('/:id', projectsController.deleteProject);

router.get('/:projectId/tasks', tasksController.getProjectTasks);
router.post('/:projectId/tasks', tasksController.createTask);

module.exports = router;
