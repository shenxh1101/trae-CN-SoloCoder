const express = require('express');
const { authenticateHttp, requireAdmin } = require('../middleware/auth');
const adminController = require('../controllers/adminController');

const router = express.Router();

router.use(authenticateHttp, requireAdmin);

router.get('/users', adminController.getUsers);
router.get('/users/:userId', adminController.getUser);
router.post('/kick', adminController.kickUser);
router.post('/mute', adminController.muteUser);
router.post('/unmute', adminController.unmuteUser);
router.get('/mutes', adminController.getMuteList);
router.delete('/messages/:messageId', adminController.deleteMessage);

module.exports = router;
