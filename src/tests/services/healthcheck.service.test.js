const HealthCheckService = require("../../services/healthcheck.service");

const {
  insertPredictHealth,
  findAllCheckResults,
  deleteDataByDeviceId,
  findRecordById
} = require("../../models/repositories/healthcheck.repo");

jest.mock("../../models/repositories/healthcheck.repo");

describe("HealthCheckService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ============================
  // insertPredictHealth
  // ============================
  test("insertPredictHealth - success", async () => {
    const payload = { hr: 90, spo2: 97 };
    insertPredictHealth.mockResolvedValue({ success: true });

    const result = await HealthCheckService.insertPredictHealth(payload);

    expect(insertPredictHealth).toHaveBeenCalledWith(payload);
    expect(result).toEqual({ success: true });
  });

  // ============================
  // findAllResults
  // ============================
  test("findAllResults - with params", async () => {
    const mockResponse = { items: [], total: 0 };
    findAllCheckResults.mockResolvedValue(mockResponse);

    const params = {
      limit: 10,
      page: 2,
      sort: "ctime",
      from: "2024-01-01",
      to: "2024-01-10",
      deviceId: "dev123"
    };

    const result = await HealthCheckService.findAllResults(params);

    expect(findAllCheckResults).toHaveBeenCalledWith(params);
    expect(result).toBe(mockResponse);
  });

  test("findAllResults - default params", async () => {
    const mockResponse = { items: [], total: 0 };
    findAllCheckResults.mockResolvedValue(mockResponse);

    const result = await HealthCheckService.findAllResults({ deviceId: "dev1" });

    expect(findAllCheckResults).toHaveBeenCalledWith({
      limit: 5,
      page: 1,
      sort: "ctime",
      from: null,
      to: null,
      deviceId: "dev1"
    });
    expect(result).toBe(mockResponse);
  });

  // ============================
  // deleteDataById
  // ============================
  test("deleteDataById - success", async () => {
    deleteDataByDeviceId.mockResolvedValue({ deleted: 3 });

    const result = await HealthCheckService.deleteDataById({ deviceId: "D1" });

    expect(deleteDataByDeviceId).toHaveBeenCalledWith({ deviceId: "D1" });
    expect(result).toEqual({ deleted: 3 });
  });

  // ============================
  // findRecordById
  // ============================
  test("findRecordById - success", async () => {
    findRecordById.mockResolvedValue({ id: "R1" });

    const result = await HealthCheckService.findRecordById("R1");

    expect(findRecordById).toHaveBeenCalledWith({ id: "R1" });
    expect(result).toEqual({ id: "R1" });
  });
});
