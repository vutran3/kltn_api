const controller = require("../../controllers/healthcheck.controller");
const HealthCheckService = require("../../services/healthcheck.service");
const { uploadBufferToCloudinary } = require("../../config/cloudinary.config");
const { createAndEmit } = require("../../services/notification.service");
const { getDeviceByDeviceId } = require("../../services/device.service");
const { getFieldByDeviceId } = require("../../services/field.service");
const axios = require("axios");

// Mocks
jest.mock("axios");
jest.mock("../../config/cloudinary.config");
jest.mock("../../services/healthcheck.service");
jest.mock("../../services/notification.service");
jest.mock("../../services/device.service");
jest.mock("../../services/field.service");

jest.mock("../../core/success.response", () => {
    return {
        SuccessResponse: class {
            constructor(payload) {
                this.payload = payload;
            }
            send(res) {
                return res.json(this.payload);
            }
        }
    };
});

jest.mock("../../core/error.response", () => ({
    BadRequestError: class extends Error {
        constructor(msg) {
            super(msg);
            this.status = 400;
        }
    }
}));

const mockRes = () => {
    const res = {};
    res.json = jest.fn(() => res);
    res.status = jest.fn(() => res);
    return res;
};

describe("HealthCheckController", () => {
    const originalEnv = process.env;

    beforeEach(() => {
        jest.clearAllMocks();
        process.env = { ...originalEnv }; // Reset env
    });

    afterAll(() => {
        process.env = originalEnv;
    });

    // ==========================================================
    // collectImageWeekly
    // ==========================================================
    describe("collectImageWeekly", () => {
        test("should throw BadRequestError if deviceId header is missing", async () => {
            const req = { headers: {}, body: Buffer.from("img") };
            const res = mockRes();

            await expect(controller.collectImageWeekly(req, res))
                .rejects.toThrow("deviceId is required");
        });

        test("should throw BadRequestError if body is empty", async () => {
            const req = { 
                headers: { "x-device-id": "D1" },
                body: Buffer.alloc(0) 
            };
            const res = mockRes();

            await expect(controller.collectImageWeekly(req, res))
                .rejects.toThrow("image file is required");
        });

        test("should run successfully (Mode: local) without notification", async () => {
            process.env.PREDICT_MODE = "local";
            const req = {
                headers: { "x-device-id": "D1", "content-type": "image/jpeg" },
                body: Buffer.from("fake-image-data")
            };
            const res = mockRes();

            // Mocks
            uploadBufferToCloudinary.mockResolvedValue({ secure_url: "url", public_id: "pid" });
            axios.post.mockResolvedValue({ 
                data: { prediction_text: "Healthy", is_diseased: false } 
            });
            HealthCheckService.insertPredictHealth.mockResolvedValue({ _id: "HC1" });
            getDeviceByDeviceId.mockResolvedValue({ _id: "DEV1" });
            getFieldByDeviceId.mockResolvedValue({ _id: "F1" });

            await controller.collectImageWeekly(req, res);

            expect(uploadBufferToCloudinary).toHaveBeenCalled();
            expect(axios.post).toHaveBeenCalled(); // Local call
            expect(HealthCheckService.insertPredictHealth).toHaveBeenCalled();
            expect(createAndEmit).not.toHaveBeenCalled(); // No disease
            expect(res.json).toHaveBeenCalled();
        });

        test("should run successfully (Mode: hf) and trigger notification", async () => {
            process.env.PREDICT_MODE = "hf";
            process.env.HF_PREDICT_URL = "http://hf.co/api";
            process.env.HF_API_TOKEN = "token";

            const req = {
                headers: { "x-device-id": "D1" },
                body: Buffer.from("fake-image")
            };
            const res = mockRes();

            uploadBufferToCloudinary.mockResolvedValue({ secure_url: "url", public_id: "pid" });
            axios.post.mockResolvedValue({ 
                data: { prediction_text: "Disease Found", is_diseased: true } 
            });
            HealthCheckService.insertPredictHealth.mockResolvedValue({ _id: "HC1" });
            getDeviceByDeviceId.mockResolvedValue({ _id: "DEV1", userId: "U1" });
            getFieldByDeviceId.mockResolvedValue({ _id: "F1", name: "Field A", ownerUserId: "U1" });

            await controller.collectImageWeekly(req, res);

            expect(axios.post).toHaveBeenCalledWith(
                "http://hf.co/api", 
                expect.any(Object), 
                expect.any(Object)
            );
            expect(createAndEmit).toHaveBeenCalledWith(expect.objectContaining({
                title: "Cảnh báo sức khỏe cây trồng"
            }));
        });

        test("should fallback to local if HF fails (Default Mode)", async () => {
            delete process.env.PREDICT_MODE; // Default logic
            process.env.HF_PREDICT_URL = "http://hf.co/api";
            process.env.HF_API_TOKEN = "token";

            const req = { headers: { "x-device-id": "D1" }, body: Buffer.from("img") };
            const res = mockRes();

            uploadBufferToCloudinary.mockResolvedValue({ secure_url: "url" });
            
            // Mock axios: First call fails (HF), Second call succeeds (Local)
            axios.post
                .mockRejectedValueOnce({ response: { status: 500, data: "HF Error" } }) 
                .mockResolvedValueOnce({ data: { prediction_text: "Fallback Local" } });

            HealthCheckService.insertPredictHealth.mockResolvedValue({});
            getDeviceByDeviceId.mockResolvedValue(null); // No device info found

            await controller.collectImageWeekly(req, res);

            expect(axios.post).toHaveBeenCalledTimes(2); // 1 HF failed, 1 Local success
            expect(HealthCheckService.insertPredictHealth).toHaveBeenCalled();
            expect(res.json).toHaveBeenCalled();
        });

        test("should throw BadRequestError if all predict methods fail", async () => {
            process.env.PREDICT_MODE = "local";
            const req = { headers: { "x-device-id": "D1" }, body: Buffer.from("img") };
            const res = mockRes();

            uploadBufferToCloudinary.mockResolvedValue({ secure_url: "url" });
            axios.post.mockRejectedValue({ message: "Network Error" });

            await expect(controller.collectImageWeekly(req, res))
                .rejects.toThrow("Predict failed");
        });

         test("should throw Error if HF config is missing in HF mode", async () => {
            process.env.PREDICT_MODE = "hf";
            delete process.env.HF_PREDICT_URL; // Missing config

            const req = { headers: { "x-device-id": "D1" }, body: Buffer.from("img") };
            const res = mockRes();

            uploadBufferToCloudinary.mockResolvedValue({ secure_url: "url" });

            await expect(controller.collectImageWeekly(req, res))
                .rejects.toThrow("Predict failed"); // Caught by outer try/catch
        });
    });

    // ==========================================================
    // findAllResult
    // ==========================================================
    describe("findAllResult", () => {
        test("should return list of results", async () => {
            const req = { query: { page: 1 } };
            const res = mockRes();
            const mockData = [{ id: 1 }];

            HealthCheckService.findAllResults.mockResolvedValue(mockData);

            await controller.findAllResult(req, res);

            expect(HealthCheckService.findAllResults).toHaveBeenCalledWith({ page: 1 });
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                metadata: mockData
            }));
        });
    });

    // ==========================================================
    // findRecordById
    // ==========================================================
    describe("findRecordById", () => {
        test("should return record details", async () => {
            const req = { params: { hcid: "HC123" } };
            const res = mockRes();
            const mockData = { id: "HC123" };

            HealthCheckService.findRecordById.mockResolvedValue(mockData);

            await controller.findRecordById(req, res);

            expect(HealthCheckService.findRecordById).toHaveBeenCalledWith("HC123");
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                metadata: mockData
            }));
        });
    });
});