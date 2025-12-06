const controller = require("../../controllers/schedule.controller");
const Schedule = require("../../models/schedule.model");

// --- MOCKS ---

// 1. Mock Constants
jest.mock("../../constansts", () => ({
    SCHEDULE_TYPE: { LIGHT: "light", PUMP: "pump" }
}));

// 2. Mock Model - Định nghĩa trực tiếp bên trong để tránh lỗi Hoisting
jest.mock("../../models/schedule.model", () => {
    // Tạo class giả
    class MockSchedule {
        constructor(data) {
            Object.assign(this, data);
            // Gán hàm save cho instance
            this.save = MockSchedule.save;
            if (this.updatedAt === undefined) this.updatedAt = new Date();
        }

        // --- ĐỊNH NGHĨA STATIC METHODS TRỰC TIẾP TẠI ĐÂY ---
        
        static find = jest.fn();
        static findOne = jest.fn();
        static create = jest.fn();
        
        // QUAN TRỌNG: Dùng mockImplementation để đảm bảo luôn trả về Promise
        // Điều này sửa lỗi "Cannot read properties of undefined (reading 'catch')"
        static updateOne = jest.fn().mockImplementation(() => Promise.resolve({}));
        
        // Mock method save cho instance (dùng chung static để dễ expect)
        static save = jest.fn().mockResolvedValue(true);
    }

    return MockSchedule;
});

const mockRes = () => {
    const res = {};
    res.status = jest.fn(() => res);
    res.json = jest.fn(() => res);
    return res;
};

describe("Schedule Controller", () => {
    let dateSpy;
    const MOCK_NOW = 1600000000000;

    beforeEach(() => {
        jest.clearAllMocks();
        dateSpy = jest.spyOn(Date, 'now').mockReturnValue(MOCK_NOW);
    });

    afterEach(() => {
        dateSpy.mockRestore();
    });

    // ==========================================================
    // getDeviceControl
    // ==========================================================
    describe("getDeviceControl", () => {
        test("should return 400 if device_id is missing", async () => {
            const req = { query: {}, get: jest.fn() };
            const res = mockRes();

            await controller.getDeviceControl(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ error: "device_id required" });
        });

        test("should create default schedules if none exist", async () => {
            const req = { query: { device_id: "D1" }, get: jest.fn() };
            const res = mockRes();

            Schedule.find.mockResolvedValue([]);
            
            Schedule.create.mockImplementation((data) => ({ 
                ...data, 
                updatedAt: new Date(MOCK_NOW),
                schedule_ms: null,
                off_at: null 
            }));

            await controller.getDeviceControl(req, res);

            expect(Schedule.create).toHaveBeenCalledTimes(2); 
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                light: expect.objectContaining({
                    device_id: "D1",
                    type: "light",
                    is_active: false
                }),
                pump: expect.objectContaining({
                    device_id: "D1",
                    type: "pump",
                    is_active: false
                })
            }));
        });

        test("should return data and handle effectiveActive correctly", async () => {
            const req = { query: { device_id: "D1" }, get: jest.fn() };
            const res = mockRes();

            const mockDocs = [
                new Schedule({
                    device_id: "D1", type: "light", is_active: true,
                    schedule_ms: null, off_at: null, updatedAt: new Date()
                }),
                new Schedule({
                    device_id: "D1", type: "pump", is_active: false,
                    updatedAt: new Date()
                })
            ];
            Schedule.find.mockResolvedValue(mockDocs);

            await controller.getDeviceControl(req, res);

            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                light: expect.objectContaining({ is_active: true }),
                pump: expect.objectContaining({ is_active: false })
            }));
        });
    });

    // ==========================================================
    // updateDeviceControl
    // ==========================================================
    describe("updateDeviceControl", () => {
        test("should return 400 if device_id missing", async () => {
            const req = { body: {} };
            const res = mockRes();
            await controller.updateDeviceControl(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
        });

        test("should create new doc if not exists", async () => {
            const req = { body: { device_id: "D2", type: "light", is_active: true } };
            const res = mockRes();

            Schedule.findOne.mockResolvedValue(null);

            await controller.updateDeviceControl(req, res);

            // Kiểm tra hàm save (được truy cập qua static save vì ta đã gán nó vào instance)
            expect(Schedule.save).toHaveBeenCalled();
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                device_id: "D2",
                is_active: true
            }));
        });

        test("should turn OFF device (clear fields)", async () => {
            const req = { body: { device_id: "D1", type: "light", is_active: false } };
            const res = mockRes();

            const mockDoc = new Schedule({ device_id: "D1", is_active: true, duration_ms: 100 });
            Schedule.findOne.mockResolvedValue(mockDoc);

            await controller.updateDeviceControl(req, res);

            expect(mockDoc.is_active).toBe(false);
            expect(mockDoc.off_at).toBeNull();
            expect(mockDoc.duration_ms).toBe(0);
            expect(mockDoc.schedule_ms).toBeNull();
            expect(Schedule.save).toHaveBeenCalled();
        });

        test("should turn ON immediate (calculate off_at from NOW)", async () => {
            const duration = 60000;
            const req = {
                body: {
                    device_id: "D1", type: "light",
                    is_active: true, duration_ms: duration, schedule_ms: null
                }
            };
            const res = mockRes();

            const mockDoc = new Schedule({ device_id: "D1", is_active: false });
            Schedule.findOne.mockResolvedValue(mockDoc);

            await controller.updateDeviceControl(req, res);

            const expectedOffAt = new Date(MOCK_NOW + duration);

            expect(mockDoc.is_active).toBe(true);
            expect(mockDoc.duration_ms).toBe(duration);
            expect(mockDoc.off_at.getTime()).toBe(expectedOffAt.getTime());
            expect(Schedule.save).toHaveBeenCalled();
        });

        test("should turn ON scheduled (calculate off_at from SCHEDULE)", async () => {
            const duration = 60000;
            const futureTime = MOCK_NOW + 100000;
            const req = {
                body: {
                    device_id: "D1", type: "light",
                    is_active: true, duration_ms: duration, schedule_ms: futureTime
                }
            };
            const res = mockRes();

            const mockDoc = new Schedule({ device_id: "D1" });
            Schedule.findOne.mockResolvedValue(mockDoc);

            await controller.updateDeviceControl(req, res);

            const expectedOffAt = new Date(futureTime + duration);

            expect(mockDoc.schedule_ms.getTime()).toBe(futureTime);
            expect(mockDoc.off_at.getTime()).toBe(expectedOffAt.getTime());
            expect(Schedule.save).toHaveBeenCalled();
        });

        test("should update only params provided (partial update)", async () => {
            const req = {
                body: { device_id: "D1", type: "light", duration_ms: 5000 }
            };
            const res = mockRes();

            const mockDoc = new Schedule({ device_id: "D1", is_active: true, duration_ms: 1000 });
            Schedule.findOne.mockResolvedValue(mockDoc);

            await controller.updateDeviceControl(req, res);

            expect(mockDoc.duration_ms).toBe(5000);
            expect(mockDoc.is_active).toBe(true);
            expect(mockDoc.off_at).not.toBeNull();
            expect(Schedule.save).toHaveBeenCalled();
        });
    });
});