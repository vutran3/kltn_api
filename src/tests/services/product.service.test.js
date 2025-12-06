const productService = require("../../services/product.service");
const Product = require("../../models/product.model");
const Device = require("../../models/device.model");
const Field = require("../../models/field.model");
const createError = require("http-errors");

jest.mock("../../models/product.model");
jest.mock("../../models/device.model");
jest.mock("../../models/field.model");
jest.mock("http-errors");

describe("Product Service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ======================================
  // createProduct
  // ======================================
  test("createProduct - success", async () => {
    Product.create.mockResolvedValue({ id: "p1" });

    const result = await productService.createProduct({ name: "Test" });
    expect(result).toEqual({ id: "p1" });
  });

  test("createProduct - throw error", async () => {
    Product.create.mockRejectedValue(new Error("DB Error"));

    await expect(productService.createProduct({}))
      .rejects.toThrow("DB Error");
  });

  // ======================================
  // getProducts
  // ======================================
  test("getProducts - with select + populate", async () => {
    const mockQuery = {
      select: jest.fn().mockReturnThis(),
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      populate: jest.fn().mockReturnThis(),
      then: (cb) => cb([{ id: 1 }])
    };

    Product.find.mockReturnValue(mockQuery);
    Product.countDocuments.mockResolvedValue(1);

    const result = await productService.getProducts({
      pageNum: 1,
      limitNum: 10,
      filter: {},
      select: "name,price",
      populate: "field"
    });

    expect(mockQuery.select).toHaveBeenCalled();
    expect(mockQuery.populate).toHaveBeenCalled();
    expect(result.total).toBe(1);
  });

  test("getProducts - no select & no populate", async () => {
    const mockQuery = {
      select: jest.fn(),
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      then: (cb) => cb([{ id: 2 }])
    };

    Product.find.mockReturnValue(mockQuery);
    Product.countDocuments.mockResolvedValue(1);

    const result = await productService.getProducts({
      pageNum: 1,
      limitNum: 10
    });

    expect(result.items.length).toBe(1);
  });

  // ======================================
  // getProductById
  // ======================================
  test("getProductById - success with populate", async () => {
    const mockQuery = {
      populate: jest.fn().mockReturnThis(),
      then: (cb) => cb({ id: "p1" })
    };

    Product.findById.mockReturnValue(mockQuery);

    const result = await productService.getProductById("p1", { populate: "field" });
    expect(result.id).toBe("p1");
  });

  test("getProductById - success without populate", async () => {
    Product.findById.mockResolvedValue({ id: "p1" });

    const result = await productService.getProductById("p1");
    expect(result.id).toBe("p1");
  });

  test("getProductById - not found throws", async () => {
    Product.findById.mockResolvedValue(null);
    createError.NotFound.mockReturnValue(new Error("Product not found"));

    await expect(productService.getProductById("p1"))
      .rejects.toThrow("Product not found");
  });

  // ======================================
  // getProductByDeviceId
  // ======================================
  test("getProductByDeviceId - device not found", async () => {
    Device.findOne.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue(null)
    });

    createError.NotFound.mockReturnValue(new Error("Device is not found !"));

    await expect(productService.getProductByDeviceId("D1"))
      .rejects.toThrow("Device is not found !");
  });

  test("getProductByDeviceId - field not found", async () => {
    Device.findOne.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue({ _id: "dev123" })
    });

    Field.findOne.mockReturnValue({
      lean: jest.fn().mockResolvedValue(null)
    });

    createError.NotFound.mockReturnValue(new Error("Field is not found"));

    await expect(productService.getProductByDeviceId("D1"))
      .rejects.toThrow("Field is not found");
  });

  test("getProductByDeviceId - success return product", async () => {
    Device.findOne.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue({ _id: "dev123" })
    });

    Field.findOne.mockReturnValue({
      lean: jest.fn().mockResolvedValue({ _id: "field999" })
    });

    Product.findOne.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue({ name: "Product A" })
    });

    const result = await productService.getProductByDeviceId("D1");

    expect(result).toEqual({ name: "Product A" });
  });

  // ======================================
  // updateProduct
  // ======================================
  test("updateProduct - success", async () => {
    Product.findByIdAndUpdate.mockResolvedValue({ id: "p1" });

    const result = await productService.updateProduct({
      id: "p1",
      payload: { price: 100 }
    });

    expect(result.id).toBe("p1");
  });

  test("updateProduct - not found", async () => {
    Product.findByIdAndUpdate.mockResolvedValue(null);
    createError.NotFound.mockReturnValue(new Error("Product not found"));

    await expect(
      productService.updateProduct({ id: "p1", payload: {} })
    ).rejects.toThrow("Product not found");
  });

  // ======================================
  // deleteProduct
  // ======================================
  test("deleteProduct - success", async () => {
    Product.findByIdAndDelete.mockResolvedValue({ id: "p1" });

    await expect(productService.deleteProduct("p1"))
      .resolves.not.toThrow();
  });

  test("deleteProduct - not found", async () => {
    Product.findByIdAndDelete.mockResolvedValue(null);
    createError.NotFound.mockReturnValue(new Error("Product not found"));

    await expect(productService.deleteProduct("p1"))
      .rejects.toThrow("Product not found");
  });
});
