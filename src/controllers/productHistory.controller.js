const { uploadBufferToCloudinary } = require("../config/cloudinary.config");
const { SuccessResponse } = require("../core/success.response");
const ProductHistoryService = require("../services/productHistory.service");

class ProductHistoryController {
    createHistory = async (req, res, next) => {
        try {
            let result = null;
            if (req.file) {
                result = await uploadBufferToCloudinary(req.file.buffer, {
                    folder: "history",
                    public_id: `history_${new Date().getTime()}`,
                    format: req.file.mimetype.split("/")[1]
                });
            }

            const image = result ? result.secure_url : "";

            new SuccessResponse({
                message: "Create product history success",
                metadata: await ProductHistoryService.createHistory({
                    device_id: req.headers["device_id"],
                    image,
                    ...req.body
                })
            }).send(res);
        } catch (error) {
            next(error);
        }
    };

    getListHistory = async (req, res, next) => {
        new SuccessResponse({
            message: "Get list history success",
            metadata: await ProductHistoryService.getListHistory({ ...req.query })
        }).send(res);
    };

    updateHistory = async (req, res, next) => {
        try {
            let result = null;
            if (req.file) {
                result = await uploadBufferToCloudinary(req.file.buffer, {
                    folder: "history",
                    public_id: `history_${new Date().getTime()}`,
                    format: req.file.mimetype.split("/")[1]
                });
            }

            const image = result ? result.secure_url : "";
            const updates = {
                ...req.body,
                image
            };

            if (!image) delete updates.image;

            new SuccessResponse({
                message: "Update history success",
                metadata: await ProductHistoryService.updateHistory({
                    historyId: req.params.historyId,
                    updates
                })
            }).send(res);
        } catch (error) {
            next(error);
        }
    };

    deleteHistory = async (req, res, next) => {
        new SuccessResponse({
            message: "Delete history success",
            metadata: await ProductHistoryService.deleteHistory({
                historyId: req.params.historyId
            })
        }).send(res);
    };
}

module.exports = new ProductHistoryController();
