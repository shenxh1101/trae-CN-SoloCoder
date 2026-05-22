const express = require('express');
const { authenticateHttp } = require('../middleware/auth');
const roomController = require('../controllers/roomController');

const router = express.Router();

router.get('/', authenticateHttp, roomController.getRooms);
router.post('/', authenticateHttp, roomController.createRoom);
router.get('/:roomId', authenticateHttp, roomController.getRoom);
router.get('/:roomId/messages', authenticateHttp, roomController.getRoomMessages);
router.get('/:roomId/users', authenticateHttp, roomController.getOnlineUsers);
router.delete('/:roomId', authenticateHttp, roomController.deleteRoom);

module.exports = router;
