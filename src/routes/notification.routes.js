const router = require('express').Router()
const NotificationController = require('../controllers/notification.controller')
const asyncHandler = require('../helpers/asyncHandler')

router.get('/', asyncHandler(NotificationController.getListNotification))
router.put('/mark-read', asyncHandler(NotificationController.markRead))
router.delete('/delete-all', asyncHandler(NotificationController.deleteNotification))
router.delete('/delete/:notifId', asyncHandler(NotificationController.deleteNotification))


module.exports = router