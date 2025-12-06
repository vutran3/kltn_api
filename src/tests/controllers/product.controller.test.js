
jest.mock("openai", () => {
  return class OpenAI {
    constructor() {
      this.chat = {
        completions: {
          create: jest.fn(),
        },
      };
    }
  };
});
const controller = require("../../controllers/product.controller");
const productService = require("../../services/product.service");
const Product = require("../../models/product.model");
const Field = require("../../models/field.model");
const HealthCheck = require("../../models/healthcheck.model");
const { ReadingBucket } = require("../../models/reading.model");
const createError = require("http-errors");
function parseDateRange(req) {
    const to = req.query.to ? new Date(req.query.to) : new Date();
    const from = req.query.from ? new Date(req.query.from) : new Date(to.getTime() - 7 * 24 * 60 * 60 * 1000); // default 7 days
    if (isNaN(from.getTime()) || isNaN(to.getTime())) {
        throw new Error("Invalid from/to date");
    }
    return { from, to };
}
// --- MOCKS ---
jest.mock("../../services/product.service");
jest.mock("../../models/product.model");
jest.mock("../../models/field.model");
jest.mock("../../models/healthcheck.model");
jest.mock("../../models/reading.model", () => ({
  ReadingBucket: {
    getLatest: jest.fn(),
    avgByBuckets: jest.fn(),
    queryRange: jest.fn()
  },
  METRICS: ["temp", "hum", "light"]
}));

jest.mock("http-errors", () => ({
  BadRequest: jest.fn((msg) => new Error(msg))
}));
const MOCK_NOW = new Date("2024-01-08T12:00:00.000Z");
// Helper mock Response
const mockRes = () => {
  const res = {};
  res.locals = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
};

describe("Product Controller", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(MOCK_NOW);
    jest.clearAllMocks();
  });
  test("should return parsed dates when both 'from' and 'to' are provided", () => {
        const req = {
            query: {
                from: "2023-01-01",
                to: "2023-01-31"
            }
        };

        const result = parseDateRange(req);

        expect(result.from).toEqual(new Date("2023-01-01"));
        expect(result.to).toEqual(new Date("2023-01-31"));
    });

    test("should use defaults when query params are missing (7 days range ending now)", () => {
        const req = { query: {} };

        const result = parseDateRange(req);

        // Expect 'to' là MOCK_NOW
        expect(result.to).toEqual(MOCK_NOW);
        
        // Expect 'from' là MOCK_NOW - 7 ngày (2024-01-01)
        const expectedFrom = new Date(MOCK_NOW.getTime() - 7 * 24 * 60 * 60 * 1000);
        expect(result.from).toEqual(expectedFrom);
    });

    test("should calculate 'from' based on provided 'to' if 'from' is missing", () => {
        // User cung cấp 'to' là ngày 10, 'from' thiếu => 'from' phải là ngày 3
        const req = {
            query: {
                to: "2024-01-10T00:00:00.000Z"
            }
        };

        const result = parseDateRange(req);

        const expectedTo = new Date("2024-01-10T00:00:00.000Z");
        const expectedFrom = new Date(expectedTo.getTime() - 7 * 24 * 60 * 60 * 1000);

        expect(result.to).toEqual(expectedTo);
        expect(result.from).toEqual(expectedFrom);
    });

    test("should default 'to' to NOW if only 'from' is provided", () => {
        const req = {
            query: {
                from: "2020-01-01"
            }
        };

        const result = parseDateRange(req);

        expect(result.from).toEqual(new Date("2020-01-01"));
        expect(result.to).toEqual(MOCK_NOW);
    });

    test("should throw Error if 'from' date is invalid", () => {
        const req = {
            query: {
                from: "invalid-date",
                to: "2024-01-01"
            }
        };

        expect(() => parseDateRange(req)).toThrow("Invalid from/to date");
    });

    test("should throw Error if 'to' date is invalid", () => {
        const req = {
            query: {
                from: "2024-01-01",
                to: "not-a-date"
            }
        };

        expect(() => parseDateRange(req)).toThrow("Invalid from/to date");
    });
  // ==========================================================
  // createProduct
  // ==========================================================
  test("createProduct - fail if missing field or name", async () => {
    const req = { body: { name: "" } };
    const res = mockRes();
    createError.BadRequest.mockReturnValue(new Error('field and name are required'))
    await expect(controller.createProduct(req, res))
      .rejects.toThrow("field and name are required");
  });

  test("createProduct - fail if invalid status", async () => {
    const req = {
      body: { name: "P1", field: "F1", status: "invalid_status" }
    };
    const res = mockRes();
    createError.BadRequest.mockReturnValue(new Error('status must be one of: growing, harvesting, procesing'))
    await expect(controller.createProduct(req, res))
      .rejects.toThrow("status must be one of: growing, harvesting, procesing");
  });

  test("createProduct - success", async () => {
    const req = {
      body: {
        field: "F1",
        name: "Tomato",
        status: "growing",
        type: "Fruit",
        planting_date: "2024-01-01"
      }
    };
    const res = mockRes();
    res.locals.user = { _id: "U1" };

    productService.createProduct.mockResolvedValue({ _id: "P1", name: "Tomato" });

    await controller.createProduct(req, res);

    expect(productService.createProduct).toHaveBeenCalledWith(expect.objectContaining({
      field: "F1",
      name: "Tomato",
      owner: "U1",
      status: "growing"
    }));
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ _id: "P1", name: "Tomato" });
  });

  // ==========================================================
  // listProducts
  // ==========================================================
  test("listProducts - defaults", async () => {
    const req = { query: {} };
    const res = mockRes();
    // No user logged in
    res.locals = {};

    productService.getProducts.mockResolvedValue({ items: [], total: 0 });

    await controller.listProducts(req, res);

    expect(productService.getProducts).toHaveBeenCalledWith(expect.objectContaining({
      pageNum: 1,
      limitNum: 10,
      filter: { owner: undefined }
    }));
  });

  test("listProducts - with filters and search", async () => {
    const req = {
      query: {
        page: "2",
        search: "Tom",
        status: "growing",
        field: "F1"
      }
    };
    const res = mockRes();
    res.locals.user = { _id: "U1" };

    productService.getProducts.mockResolvedValue({ items: [], total: 0 });

    await controller.listProducts(req, res);

    expect(productService.getProducts).toHaveBeenCalledWith(expect.objectContaining({
      pageNum: 2,
      filter: expect.objectContaining({
        owner: "U1",
        status: "growing",
        field: "F1",
        $or: expect.any(Array)
      })
    }));
  });

  // ==========================================================
  // getProductById
  // ==========================================================
  test("getProductById - success", async () => {
    const req = { params: { id: "P1" }, query: { populate: "field" } };
    const res = mockRes();

    productService.getProductById.mockResolvedValue({ _id: "P1" });

    await controller.getProductById(req, res);

    expect(productService.getProductById).toHaveBeenCalledWith("P1", { populate: "field" });
    expect(res.json).toHaveBeenCalledWith({ _id: "P1" });
  });

  // ==========================================================
  // getProductByDeviceId
  // ==========================================================
  test("getProductByDeviceId - success", async () => {
    const req = { params: { deviceId: "D1" } };
    const res = mockRes();

    productService.getProductByDeviceId.mockResolvedValue({ _id: "P1" });

    await controller.getProductByDeviceId(req, res);

    expect(productService.getProductByDeviceId).toHaveBeenCalledWith("D1");
    expect(res.json).toHaveBeenCalledWith({ _id: "P1" });
  });

  // ==========================================================
  // updateProduct
  // ==========================================================
  test("updateProduct - invalid status", async () => {
    const req = {
      params: { id: "P1" },
      body: { status: "unknown" }
    };
    const res = mockRes();
    createError.BadRequest.mockReturnValue(new Error('status must be one of: growing, harvesting, selling'))
    await expect(controller.updateProduct(req, res))
      .rejects.toThrow("status must be one of: growing, harvesting, selling");
  });

  test("updateProduct - success", async () => {
    const req = {
      params: { id: "P1" },
      body: { name: "New Name" }
    };
    const res = mockRes();

    productService.updateProduct.mockResolvedValue({ _id: "P1", name: "New Name" });

    await controller.updateProduct(req, res);

    expect(productService.updateProduct).toHaveBeenCalledWith({ id: "P1", payload: { name: "New Name" } });
    expect(res.json).toHaveBeenCalled();
  });

  // ==========================================================
  // deleteProduct
  // ==========================================================
  test("deleteProduct - success", async () => {
    const req = { params: { id: "P1" } };
    const res = mockRes();

    productService.deleteProduct.mockResolvedValue();

    await controller.deleteProduct(req, res);

    expect(productService.deleteProduct).toHaveBeenCalledWith("P1");
    expect(res.json).toHaveBeenCalledWith({ message: "Product deleted" });
  });

  // ==========================================================
  // getProductDetails (Complex Logic)
  // ==========================================================
  describe("getProductDetails", () => {
    test("should return 404 if product not found", async () => {
      const req = { params: { productId: "P_NOT_FOUND" } };
      const res = mockRes();

      Product.findById.mockReturnValue({
        lean: jest.fn().mockResolvedValue(null)
      });

      await controller.getProductDetails(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: "Product not found" });
    });

    test("should return 404 if field not found", async () => {
      const req = { params: { productId: "P1" } };
      const res = mockRes();

      // Mock Product found
      Product.findById.mockReturnValue({
        lean: jest.fn().mockResolvedValue({ _id: "P1", field: "F1" })
      });

      // Mock Field NOT found
      Field.findById.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(null)
        })
      });

      await controller.getProductDetails(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: "Field not found for product" });
    });

    test("should return full details successfully", async () => {
      const req = { params: { productId: "P1" } };
      const res = mockRes();

      // 1. Mock Product
      Product.findById.mockReturnValue({
        lean: jest.fn().mockResolvedValue({
          _id: "P1",
          field: "F1",
          name: "Product Test",
          planting_date: new Date("2024-01-01"),
          // actual_harvest_date is null -> implies 'to' is now
        })
      });

      // 2. Mock Field with Devices
      Field.findById.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue({
            _id: "F1",
            name: "Field Test",
            devices: [
              { _id: "D1_Obj", device_id: "D1", name: "Sensor 1" }
            ]
          })
        })
      });

      // 3. Mock HealthCheck
      HealthCheck.find.mockReturnValue({
        lean: jest.fn().mockResolvedValue([
          { device_id: "D1", inspection_date: new Date() }
        ])
      });

      // 4. Mock ReadingBucket
      ReadingBucket.getLatest.mockResolvedValue({ temp: 25 });
      ReadingBucket.avgByBuckets.mockResolvedValue([{ avg: { temp: 24 } }]);
      ReadingBucket.queryRange.mockResolvedValue([{ temp: 24, timestamp: new Date() }]);

      // ACT
      await controller.getProductDetails(req, res);

      // ASSERT
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        product: expect.objectContaining({ _id: "P1" }),
        field: expect.objectContaining({ name: "Field Test" }),
        healthCheck_history: expect.any(Array),
        readings: expect.objectContaining({
          devices: expect.arrayContaining([
            expect.objectContaining({
              deviceId: "D1",
              latest: { temp: 25 },
              bucketsAvg: expect.any(Array),
              rawReadings: expect.any(Array)
            })
          ])
        })
      }));
    });

    test("should handle Internal Server Error", async () => {
      const req = { params: { productId: "P1" } };
      const res = mockRes();

      // Force error
      Product.findById.mockImplementation(() => {
        throw new Error("DB Error");
      });

      await controller.getProductDetails(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: "DB Error" });
    });
  });
});