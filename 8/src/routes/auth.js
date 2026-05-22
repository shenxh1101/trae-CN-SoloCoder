const express = require('express');
const { authenticateHttp } = require('../middleware/auth');
const authController = require('../controllers/authController');

const router = express.Router();

router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/admin/login', authController.loginAsAdmin);
router.get('/me', authenticateHttp, authController.getCurrentUser);
router.post('/logout', authenticateHttp, authController.logout);

module.exports = router;
