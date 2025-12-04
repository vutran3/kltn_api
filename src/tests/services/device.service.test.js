// device.service.test.js
const deviceService = require("../../services/device.service");
const Device = require("../../models/device.model");
const Field = require("../../models/field.model");
const createError = require("http-errors");


jest.mock("../../models/device.model");
jest.mock("../../models/field.model");
jest.mock("http-errors");

describe("Device Service Unit Tests", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test("createDevice - success", async () => {
        Device.findOne.mockResolvedValue(null);
        Device.create.mockResolvedValue({ device_id: "D1" });

        const result = await deviceService.createDevice({
            device_id: "D1",
            device_name: "Pump",
            is_active: true,
            apiKey: "123",
            owner: "U1"
        });

        expect(Device.findOne).toHaveBeenCalledWith({ device_id: "D1" });
        expect(Device.create).toHaveBeenCalled();
        expect(result.device_id).toBe("D1");
    });

    test("createDevice - conflict (device_id exists)", async () => {
        Device.findOne.mockResolvedValue({});

        createError.Conflict.mockReturnValue(new Error("device_id already exists"));

        await expect(
            deviceService.createDevice({ device_id: "D1" })
        ).rejects.toThrow("device_id already exists");
    });

    test("getDevices - return list", async () => {
        const mockQuery = {
            sort: jest.fn().mockReturnThis(),
            skip: jest.fn().mockReturnThis(),
            limit: jest.fn().mockReturnThis()
        };

        Device.find.mockReturnValue(mockQuery);
        Promise.all = jest.fn().mockResolvedValue([[{ id: 1 }], 1]);

        const result = await deviceService.getDevices({
            pageNum: 1,
            limitNum: 10,
            filter: {},
            sort: "-createdAt",
        });

        expect(result.items.length).toBe(1);
        expect(result.total).toBe(1);
    });

 
    test("getDeviceById - success", async () => {
        Device.findById.mockResolvedValue({ id: "123" });

        const result = await deviceService.getDeviceById("123");
        expect(result.id).toBe("123");
    });

    test("getDeviceById - not found", async () => {
        Device.findById.mockResolvedValue(null);

        createError.NotFound.mockReturnValue(new Error("Device not found"));

        await expect(deviceService.getDeviceById("123"))
            .rejects
            .toThrow("Device not found");
    });


    test("getDeviceByDeviceId - success", async () => {
        Device.findOne.mockResolvedValue({ device_id: "ABC" });

        const result = await deviceService.getDeviceByDeviceId("ABC");
        expect(result.device_id).toBe("ABC");
    });

    test("getDeviceByDeviceId - not found", async () => {
        Device.findOne.mockResolvedValue(null);
        createError.NotFound.mockReturnValue(new Error("Device not found"));

        await expect(deviceService.getDeviceByDeviceId("ABC"))
            .rejects
            .toThrow("Device not found");
    });

 
    test("updateDevice - success", async () => {
        Device.findOne.mockResolvedValue(null);
        Device.findByIdAndUpdate.mockResolvedValue({ id: "1", device_name: "Pump" });

        const result = await deviceService.updateDevice({
            id: "1",
            payload: { device_name: "Pump" }
        });

        expect(result.device_name).toBe("Pump");
    });

    test("updateDevice - conflict device_id exists", async () => {
        Device.findOne.mockResolvedValue({}); // tồn tại device_id trùng
        createError.Conflict.mockReturnValue(new Error("device_id already exists"));

        await expect(deviceService.updateDevice({
            id: "1",
            payload: { device_id: "ABC" }
        })).rejects.toThrow("device_id already exists");
    });

    test("updateDevice - not found", async () => {
        Device.findOne.mockResolvedValue(null);
        Device.findByIdAndUpdate.mockResolvedValue(null);
        createError.NotFound.mockReturnValue(new Error("Device not found"));

        await expect(deviceService.updateDevice({
            id: "1",
            payload: {}
        })).rejects.toThrow("Device not found");
    });

   
    test("deleteDevice - success", async () => {
        Device.findByIdAndDelete.mockResolvedValue({ id: "1" });

        await expect(deviceService.deleteDevice("1")).resolves.not.toThrow();
    });

    test("deleteDevice - not found", async () => {
        Device.findByIdAndDelete.mockResolvedValue(null);
        createError.NotFound.mockReturnValue(new Error("Device not found"));

        await expect(deviceService.deleteDevice("1")).rejects.toThrow("Device not found");
    });

    test("setActive - success", async () => {
        Device.findByIdAndUpdate.mockResolvedValue({ id: "1", is_active: true });

        const result = await deviceService.setActive({ id: "1", is_active: true });
        expect(result.is_active).toBe(true);
    });

    test("setActive - invalid type", async () => {
        createError.BadRequest.mockReturnValue(new Error("is_active (boolean) is required"));

        await expect(deviceService.setActive({ id: "1", is_active: "yes" }))
            .rejects
            .toThrow("is_active (boolean) is required");
    });

    test("setActive - not found", async () => {
        Device.findByIdAndUpdate.mockResolvedValue(null);
        createError.NotFound.mockReturnValue(new Error("Device not found"));

        await expect(deviceService.setActive({ id: "1", is_active: true }))
            .rejects
            .toThrow("Device not found");
    });


    test("getUnassignedDevices - success", async () => {
        Field.distinct.mockResolvedValue(["dev1", "dev2"]);

        const mockQuery = {
            sort: jest.fn().mockReturnThis(),
            skip: jest.fn().mockReturnThis(),
            limit: jest.fn().mockReturnThis()
        };

        Device.find.mockReturnValue(mockQuery);
        Promise.all.mockResolvedValue([[{ id: "freeDevice" }], 1]);

        const result = await deviceService.getUnassignedDevices({
            ownerId: "U1",
            pageNum: 1,
            limitNum: 10
        });

        expect(result.items.length).toBe(1);
        expect(result.total).toBe(1);
    });
});
