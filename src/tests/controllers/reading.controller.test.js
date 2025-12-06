const controller = require("../../controllers/reading.controller");
const readingService = require("../../services/reading.service");
const utils = require("../../utils");
const createError = require("http-errors");

// --- MOCKS ---
jest.mock("../../services/reading.service");
jest.mock("../../utils");
jest.mock("http-errors", () => ({
    BadRequest: jest.fn((msg) => new Error(msg))
}));

const mockRes = () => {
    const res = {};
    res.status = jest.fn(() => res);
    res.json = jest.fn(() => res);
    return res;
};

const mockNext = jest.fn();

describe("Reading Controller", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    // ==========================================================
    // collectReadingData
    // ==========================================================
    describe("collectReadingData", () => {
        test("should call next(BadRequest) if x-device-id header is missing", async () => {
            const req = { headers: {}, body: {} };
            const res = mockRes();
            createError.BadRequest.mockReturnValue(new Error("Mã thiết bị không hợp lệ"));
            await controller.collectReadingData(req, res, mockNext);

            expect(createError.BadRequest).toHaveBeenCalledWith("Mã thiết bị không hợp lệ");
            expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
        });

        test("should collect data successfully", async () => {
            const req = {
                headers: { "x-device-id": "D1" },
                body: { ts: 1620000000000, temp: 25 }
            };
            const res = mockRes();

            // Mock Utils
            utils.buildReadingFromBody.mockReturnValue({ temp: 25, timestamp: new Date(1620000000000) });
            // Mock Service
            readingService.addReadingToBucket.mockResolvedValue({ _id: "R1" });

            await controller.collectReadingData(req, res, mockNext);

            expect(utils.buildReadingFromBody).toHaveBeenCalled();
            expect(readingService.addReadingToBucket).toHaveBeenCalledWith("D1", expect.anything());
            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                status: 201,
                data: { _id: "R1" }
            }));
        });

        test("should use Date.now() if ts is missing in body", async () => {
            const req = {
                headers: { "x-device-id": "D1" },
                body: { temp: 25 } // No ts
            };
            const res = mockRes();

            await controller.collectReadingData(req, res, mockNext);

            // Verify logic passes a date object even if body.ts is missing
            expect(utils.buildReadingFromBody).toHaveBeenCalledWith(
                req.body,
                expect.any(Date)
            );
        });

        test("should call next(error) if service fails", async () => {
            const req = { headers: { "x-device-id": "D1" } };
            const res = mockRes();
            const error = new Error("Service Error");

            readingService.addReadingToBucket.mockRejectedValue(error);

            await controller.collectReadingData(req, res, mockNext);

            expect(mockNext).toHaveBeenCalledWith(error);
        });
    });

    // ==========================================================
    // getReadingData
    // ==========================================================
    describe("getReadingData", () => {
        test("should return 400 json if deviceId is missing", async () => {
            const req = { query: {} };
            const res = mockRes();

            await controller.getReadingData(req, res, mockNext);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ error: "deviceId query is required" });
        });

        test("should return data with default params", async () => {
            const req = { query: { deviceId: "D1" } };
            const res = mockRes();
            const mockRows = [{ temp: 20 }];

            utils.parseDateMaybe.mockReturnValue(undefined);
            readingService.getSensorData.mockResolvedValue(mockRows);

            // Suppress console.log inside controller
            const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

            await controller.getReadingData(req, res, mockNext);

            expect(readingService.getSensorData).toHaveBeenCalledWith({
                deviceId: "D1",
                from: undefined,
                to: undefined,
                limit: 50, // Default limit
                sort: -1   // Default sort
            });
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                data: expect.objectContaining({ count: 1, rows: mockRows })
            }));

            logSpy.mockRestore();
        });

        test("should respect limit caps (max 500)", async () => {
            const req = { query: { deviceId: "D1", limit: "1000" } };
            const res = mockRes();
            jest.spyOn(console, 'log').mockImplementation(() => {});

            readingService.getSensorData.mockResolvedValue([]);

            await controller.getReadingData(req, res, mockNext);

            expect(readingService.getSensorData).toHaveBeenCalledWith(expect.objectContaining({
                limit: 500 // Min(1000, 500) -> 500
            }));
        });

        test("should pass parsed dates to service", async () => {
            const req = { 
                query: { deviceId: "D1", from: "2024-01-01", to: "2024-01-02" } 
            };
            const res = mockRes();
            const dateFrom = new Date("2024-01-01");
            const dateTo = new Date("2024-01-02");

            utils.parseDateMaybe.mockImplementation((d) => d === "2024-01-01" ? dateFrom : dateTo);
            jest.spyOn(console, 'log').mockImplementation(() => {});
            readingService.getSensorData.mockResolvedValue([]);

            await controller.getReadingData(req, res, mockNext);

            expect(readingService.getSensorData).toHaveBeenCalledWith(expect.objectContaining({
                from: dateFrom,
                to: dateTo
            }));
            
            // Check response data includes range
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                data: expect.objectContaining({ 
                    range: { from: dateFrom, to: dateTo } 
                })
            }));
        });

        test("should call next(error) on exception", async () => {
            const req = { query: { deviceId: "D1" } };
            const res = mockRes();
            const error = new Error("DB fail");

            readingService.getSensorData.mockRejectedValue(error);

            await controller.getReadingData(req, res, mockNext);

            expect(mockNext).toHaveBeenCalledWith(error);
        });
    });

    // ==========================================================
    // getLatestReadingData
    // ==========================================================
    describe("getLatestReadingData", () => {
        test("should return 400 if deviceId is missing", async () => {
            const req = { query: {} };
            const res = mockRes();

            await controller.getLatestReadingData(req, res, mockNext);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ error: "deviceId query is required" });
        });

        test("should return latest data successfully", async () => {
            const req = { query: { deviceId: "D1" } };
            const res = mockRes();
            const mockLast = { temp: 30 };

            readingService.getLatestSensorData.mockResolvedValue(mockLast);

            await controller.getLatestReadingData(req, res, mockNext);

            expect(readingService.getLatestSensorData).toHaveBeenCalledWith({ deviceId: "D1" });
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                data: { deviceId: "D1", last: mockLast }
            }));
        });

        test("should call next(error) on exception", async () => {
            const req = { query: { deviceId: "D1" } };
            const res = mockRes();
            const error = new Error("Service failed");

            readingService.getLatestSensorData.mockRejectedValue(error);

            await controller.getLatestReadingData(req, res, mockNext);

            expect(mockNext).toHaveBeenCalledWith(error);
        });
    });
});