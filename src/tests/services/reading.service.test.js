const {
  addReadingToBucket,
  getSensorData,
  getLatestSensorData,
} = require("../../services/reading.service");

const { ReadingBucket } = require("../../models/reading.model");

jest.mock("../../models/reading.model", () => ({
  ReadingBucket: {
    addReading: jest.fn(),
    getLatest: jest.fn(),
    queryRange: jest.fn(),
    aggregate: jest.fn(),
  }
}));

describe("Reading Service - Full Coverage", () => {

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // =====================================
  // addReadingToBucket
  // =====================================
  test("addReadingToBucket - returns latest reading", async () => {
    const inputReading = { t: 123 };

    ReadingBucket.addReading.mockResolvedValue();
    ReadingBucket.getLatest.mockResolvedValue({ t: 456 });

    const result = await addReadingToBucket("dev1", inputReading);

    expect(ReadingBucket.addReading).toHaveBeenCalledWith("dev1", inputReading, {});
    expect(result).toEqual({ t: 456 });
  });

  test("addReadingToBucket - latest is null → fallback to input", async () => {
    const inputReading = { t: 111 };

    ReadingBucket.addReading.mockResolvedValue();
    ReadingBucket.getLatest.mockResolvedValue(null);

    const result = await addReadingToBucket("dev1", inputReading);
    expect(result).toEqual(inputReading);
  });

  test("addReadingToBucket - throws error", async () => {
    ReadingBucket.addReading.mockRejectedValue(new Error("fail"));

    await expect(addReadingToBucket("dev1", {}))
      .rejects.toThrow("fail");
  });

  // =====================================
  // getSensorData
  // =====================================
  test("getSensorData - Case A (from/to dates), sort = -1 → reverse()", async () => {
    const rows = [{ a: 1 }, { a: 2 }];

    ReadingBucket.queryRange.mockResolvedValue([...rows]); // clone

    const result = await getSensorData({
      deviceId: "dev1",
      from: new Date(),
      to: new Date(),
      sort: -1
    });

    expect(ReadingBucket.queryRange).toHaveBeenCalled();
    expect(result).toEqual([{ a: 2 }, { a: 1 }]);
  });

  test("getSensorData - Case A (from/to dates), sort = 1 → no reverse()", async () => {
    const rows = [{ a: 1 }, { a: 2 }];

    ReadingBucket.queryRange.mockResolvedValue([...rows]);

    const result = await getSensorData({
      deviceId: "dev1",
      from: new Date(),
      to: new Date(),
      sort: 1
    });

    expect(result).toEqual(rows);
  });

  test("getSensorData - Case B (no from/to), valid limit", async () => {
    ReadingBucket.aggregate.mockResolvedValue([{ x: 1 }]);

    const result = await getSensorData({
      deviceId: "dev1",
      limit: 20,
      sort: -1
    });

    expect(ReadingBucket.aggregate).toHaveBeenCalled();
    expect(result).toEqual([{ x: 1 }]);
  });

  test("getSensorData - Case B (no from/to), invalid limit → fallback default 50", async () => {
    ReadingBucket.aggregate.mockResolvedValue([{ x: 2 }]);

    const result = await getSensorData({
      deviceId: "dev1",
      limit: "abc",
      sort: -1
    });

    expect(ReadingBucket.aggregate).toHaveBeenCalled();
    expect(result).toEqual([{ x: 2 }]);
  });

  test("getSensorData - Case B sort = 1", async () => {
    ReadingBucket.aggregate.mockResolvedValue([{ y: 1 }]);

    const result = await getSensorData({
      deviceId: "dev1",
      limit: 10,
      sort: 1
    });

    expect(ReadingBucket.aggregate).toHaveBeenCalled();
    expect(result).toEqual([{ y: 1 }]);
  });

  test("getSensorData - throws error", async () => {
    ReadingBucket.aggregate.mockRejectedValue(new Error("agg_fail"));

    await expect(
      getSensorData({ deviceId: "dev1" })
    ).rejects.toThrow("agg_fail");
  });

  // =====================================
  // getLatestSensorData
  // =====================================
  test("getLatestSensorData - success", async () => {
    ReadingBucket.getLatest.mockResolvedValue({ t: 999 });

    const result = await getLatestSensorData({ deviceId: "dev1" });
    expect(result).toEqual({ t: 999 });
  });

  test("getLatestSensorData - throws error", async () => {
    ReadingBucket.getLatest.mockRejectedValue(new Error("last_fail"));

    await expect(
      getLatestSensorData({ deviceId: "dev1" })
    ).rejects.toThrow("last_fail");
  });

});
