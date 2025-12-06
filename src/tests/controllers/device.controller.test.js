const controller = require("../../controllers/device.controller");
const deviceService = require("../../services/device.service");
const createError = require("http-errors");

jest.mock("../../services/device.service");
jest.mock("http-errors", () => ({
  BadRequest: jest.fn(msg => new Error(msg)),
  Unauthorized: jest.fn(msg => new Error(msg))
}));

const mockRes = () => {
  const res = {};
  res.locals = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
};

describe("Device Controller", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ==========================================================
  // createDevice
  // ==========================================================
  test("createDevice - missing device_id or device_name => BadRequest", async () => {
    const req = { body: { device_id: "" } };
    const res = mockRes();
    createError.BadRequest.mockReturnValue(new Error("device_id and device_name are required"))
    await expect(controller.createDevice(req, res))
      .rejects.toThrow("device_id and device_name are required");
  });
  test("createDevice - success without user (owner is undefined)", async () => {

    const req = {
      body: { device_id: "D1", device_name: "Test", is_active: true }
    };
    const res = mockRes();
    res.locals = {};

    deviceService.createDevice.mockResolvedValue({ id: "D1" });

    await controller.createDevice(req, res);

    expect(deviceService.createDevice).toHaveBeenCalledWith({
      device_id: "D1",
      device_name: "Test",
      is_active: true,
      apiKey: undefined,
      owner: undefined
    });
  });
  test("createDevice - success", async () => {
    const req = {
      body: { device_id: "D1", device_name: "Test", is_active: true, apiKey: "123" }
    };
    const res = mockRes();
    res.locals.user = { _id: "U1" };

    deviceService.createDevice.mockResolvedValue({ id: "D1" });

    await controller.createDevice(req, res);

    expect(deviceService.createDevice).toHaveBeenCalledWith({
      device_id: "D1",
      device_name: "Test",
      is_active: true,
      apiKey: "123",
      owner: "U1"
    });

    expect(res.status).toHaveBeenCalledWith(201);
  });

  // ==========================================================
  // listDevices
  // ==========================================================
  test("listDevices - success", async () => {
    const req = {
      query: { page: "1", limit: "10", search: "A", is_active: "true" },
    };
    const res = mockRes();
    res.locals.user = { _id: "U1" };

    deviceService.getDevices.mockResolvedValue({
      items: [{ id: "D1" }],
      total: 1
    });

    await controller.listDevices(req, res);

    expect(deviceService.getDevices).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({
      items: [{ id: "D1" }],
      pagination: {
        page: 1,
        limit: 10,
        total: 1,
        pages: 1,
      },
    });
  });
  test("listDevices - uses defaults when query params are missing", async () => {


    const req = { query: {} };
    const res = mockRes();

    res.locals = {};

    deviceService.getDevices.mockResolvedValue({ items: [], total: 0 });

    await controller.listDevices(req, res);


    expect(deviceService.getDevices).toHaveBeenCalledWith({
      pageNum: 1,
      limitNum: 10,
      filter: { owner: undefined },
      sort: "-createdAt"
    });


    const callArgs = deviceService.getDevices.mock.calls[0][0];
    expect(callArgs.filter).not.toHaveProperty("is_active");
    expect(callArgs.filter).not.toHaveProperty("$or");
  });

  test("listDevices - pagination limits (page < 1, limit > 100)", async () => {
    const req = {
      query: { page: "-5", limit: "999" }
    };
    const res = mockRes();

    deviceService.getDevices.mockResolvedValue({ items: [], total: 0 });

    await controller.listDevices(req, res);

    expect(deviceService.getDevices).toHaveBeenCalledWith(expect.objectContaining({
      pageNum: 1,
      limitNum: 100
    }));
  });

  test("listDevices - filter by is_active false", async () => {

    const req = { query: { is_active: "false" } };
    const res = mockRes();

    deviceService.getDevices.mockResolvedValue({ items: [], total: 0 });

    await controller.listDevices(req, res);

    expect(deviceService.getDevices).toHaveBeenCalledWith(expect.objectContaining({
      filter: expect.objectContaining({ is_active: false })
    }));
  });
  // ==========================================================
  // getDeviceById
  // ==========================================================
  test("getDeviceById - success", async () => {
    const req = { params: { id: "D1" } };
    const res = mockRes();

    deviceService.getDeviceById.mockResolvedValue({ id: "D1" });

    await controller.getDeviceById(req, res);

    expect(res.json).toHaveBeenCalledWith({ id: "D1" });
  });

  // ==========================================================
  // myDevices
  // ==========================================================
  test("myDevices - success", async () => {
    const req = {};
    const res = mockRes();
    res.locals.user = { _id: "U1" };

    deviceService.getDevices.mockResolvedValue({
      items: [{ id: "D1" }]
    });

    await controller.myDevices(req, res);

    expect(res.json).toHaveBeenCalledWith({
      msg: "Lấy danh sách thiết bị thành công",
      data: [{ id: "D1" }]
    });
  });

  // ==========================================================
  // getDeviceByDeviceId
  // ==========================================================
  test("getDeviceByDeviceId - success", async () => {
    const req = { params: { deviceId: "D1" } };
    const res = mockRes();

    deviceService.getDeviceByDeviceId.mockResolvedValue({ id: "D1" });

    await controller.getDeviceByDeviceId(req, res);

    expect(res.json).toHaveBeenCalledWith({ id: "D1" });
  });

  // ==========================================================
  // updateDevice
  // ==========================================================
  test("updateDevice - success", async () => {
    const req = { params: { id: "D1" }, body: { name: "Updated" } };
    const res = mockRes();

    deviceService.updateDevice.mockResolvedValue({ id: "D1", name: "Updated" });

    await controller.updateDevice(req, res);

    expect(res.json).toHaveBeenCalledWith({ id: "D1", name: "Updated" });
  });

  // ==========================================================
  // deleteDevice
  // ==========================================================
  test("deleteDevice - success", async () => {
    const req = { params: { id: "D1" } };
    const res = mockRes();

    deviceService.deleteDevice.mockResolvedValue();

    await controller.deleteDevice(req, res);

    expect(res.json).toHaveBeenCalledWith({ message: "Xóa thiết bị thành công" });
  });

  // ==========================================================
  // setActive
  // ==========================================================
  test("setActive - invalid type → BadRequest", async () => {
    const req = { params: { id: "D1" }, body: { is_active: "not_bool" } };
    const res = mockRes();
    createError.BadRequest.mockReturnValue(new Error("is_active (boolean) is required"))
    await expect(controller.setActive(req, res))
      .rejects.toThrow("is_active (boolean) is required");
  });

  test("setActive - success", async () => {
    const req = { params: { id: "D1" }, body: { is_active: true } };
    const res = mockRes();

    deviceService.setActive.mockResolvedValue({ id: "D1", is_active: true });

    await controller.setActive(req, res);

    expect(res.json).toHaveBeenCalledWith({ id: "D1", is_active: true });
  });

  // ==========================================================
  // unassignedDevices
  // ==========================================================
  test("unassignedDevices - Unauthorized when no user", async () => {
    const req = { query: {} };
    const res = mockRes();
    createError.Unauthorized.mockReturnValue(new Error("Vui lòng đăng nhập"));
    await expect(controller.unassignedDevices(req, res))
    .rejects.toThrow("Vui lòng đăng nhập");
  });

  test("unassignedDevices - uses defaults params", async () => {
    const req = { query: {} };
    const res = mockRes();
    res.locals.user = { _id: "U1" };

    deviceService.getUnassignedDevices.mockResolvedValue({ items: [], total: 0 });

    await controller.unassignedDevices(req, res);

    expect(deviceService.getUnassignedDevices).toHaveBeenCalledWith(expect.objectContaining({
      pageNum: 1,
      limitNum: 10,
      sort: "-createdAt"
    }));
  });

  test("unassignedDevices - success", async () => {
    const req = {
      query: { page: "1", limit: "10", search: "a", is_active: "true" }
    };
    const res = mockRes();
    res.locals.user = { _id: "U1" };

    deviceService.getUnassignedDevices.mockResolvedValue({
      items: [{ id: "D1" }],
      total: 1
    });

    await controller.unassignedDevices(req, res);

    expect(res.json).toHaveBeenCalledWith({
      items: [{ id: "D1" }],
      pagination: {
        page: 1,
        limit: 10,
        total: 1,
        pages: 1
      }
    });
  });

});
