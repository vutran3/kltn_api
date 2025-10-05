
const { SuccessResponse } = require('../core/success.response')
const {getListNotification, markRead, deleteNotification} = require('../services/notification.service')

class NotificationController {
    getListNotification = async (req, res, next) =>{
        new SuccessResponse({
            message: 'Get list notification',
            metadata: await getListNotification({...req.query})
        }).send(res);
    }
    markRead = async (req, res, next) => {
        const ids = Array.isArray(req.body.ids) ? req.body.ids : [];
        new SuccessResponse({
            message: 'Mark read',
            metadata: await markRead({ids}) 
        }).send(res);
    }
    deleteNotification = async (req, res, next) => {
        const option = req.query.option
        new SuccessResponse({
            message: `Delete notification by option: ${option}`,
            metadata: await deleteNotification({
                id: req?.params?.notifId,
                option
            })
        }).send(res);
    }
}

module.exports = new NotificationController()