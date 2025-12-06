const controller = require("../../controllers/field.controller");
const fieldService = require("../../services/field.service");
const createError = require("http-errors");

jest.mock("../../services/field.service");
jest.mock("http-errors", () => ({
  BadRequest: jest.fn(msg => new Error(msg))
}));

const mockRes = () => {
  const res = {};
  res.locals = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
};

describe("Field Controller", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ============================================================
  // createField
  // ============================================================
  test("createField - missing name → BadRequest", async () => {
    const req = { body: { name: "" } };
    const res = mockRes();
    createError.BadRequest.mockReturnValue(new Error("name is required"));
    await expect(controller.createField(req, res))
      .rejects.toThrow("name is required");
  });

  test("createField - success without logged-in user", async () => {
    const req = {
      body: { name: "Field No User", total_area: 50 }
    };
    const res = mockRes();
    res.locals = {};

    fieldService.createField.mockResolvedValue({ id: "F_NO_USER" });

    await controller.createField(req, res);

    expect(fieldService.createField).toHaveBeenCalledWith(expect.objectContaining({
      name: "Field No User",
      total_area: 50,
      owner: undefined
    }));
  });

  test("createField - success", async () => {
    const req = {
      body: {
        name: "Field A",
        devices: ["D1"],
        established_date: "2024-01-01",
        description: "Test",
        total_area: 100,
        field_type: "ABC",
        is_active: true
      }
    };
    const res = mockRes();
    res.locals.user = { _id: "USER1" };

    fieldService.createField.mockResolvedValue({ id: "F1" });

    await controller.createField(req, res);

    expect(fieldService.createField).toHaveBeenCalledWith({
      name: "Field A",
      devices: ["D1"],
      owner: "USER1",
      established_date: "2024-01-01",
      description: "Test",
      total_area: 100,
      field_type: "ABC",
      is_active: true
    });

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ id: "F1" });
  });

  // ============================================================
  // listFields
  // ============================================================
  test("listFields - uses defaults when query params are missing", async () => {


    const req = { query: {} };
    const res = mockRes();
    res.locals = {};

    fieldService.getFields.mockResolvedValue({ items: [], total: 0 });

    await controller.listFields(req, res);


    expect(fieldService.getFields).toHaveBeenCalledWith(expect.objectContaining({
      pageNum: 1,
      limitNum: 10,
      filter: { owner: undefined },
      sort: "-createdAt"
    }));


    const callArgs = fieldService.getFields.mock.calls[0][0];
    expect(callArgs.filter).not.toHaveProperty("is_active");
    expect(callArgs.filter).not.toHaveProperty("$or");
  });

  test("listFields - pagination boundaries (page < 1, limit > 100)", async () => {
    const req = {
      query: {
        page: "-5",
        limit: "999"
      }
    };
    const res = mockRes();
    res.locals.user = { _id: "U1" };

    fieldService.getFields.mockResolvedValue({ items: [], total: 0 });

    await controller.listFields(req, res);

    expect(fieldService.getFields).toHaveBeenCalledWith(expect.objectContaining({
      pageNum: 1,
      limitNum: 100
    }));
  });

  test("listFields - filter is_active=false", async () => {
    const req = {
      query: { is_active: "false" }
    };
    const res = mockRes();

    fieldService.getFields.mockResolvedValue({ items: [], total: 0 });

    await controller.listFields(req, res);

    expect(fieldService.getFields).toHaveBeenCalledWith(expect.objectContaining({
      filter: expect.objectContaining({ is_active: false })
    }));
  });

  test("listFields - with filter, search, active", async () => {
    const req = {
      query: {
        page: "2",
        limit: "5",
        search: "abc",
        is_active: "true",
        sort: "-name",
        select: "name",
        populate: "devices"
      }
    };
    const res = mockRes();
    res.locals.user = { _id: "USER123" };

    fieldService.getFields.mockResolvedValue({
      items: [{ id: "F1" }],
      total: 10
    });

    await controller.listFields(req, res);

    expect(fieldService.getFields).toHaveBeenCalledWith({
      pageNum: 2,
      limitNum: 5,
      sort: "-name",
      select: "name",
      populate: "devices",
      filter: {
        owner: "USER123",
        is_active: true,
        $or: [
          { name: { $regex: "abc", $options: "i" } },
          { field_type: { $regex: "abc", $options: "i" } }
        ]
      }
    });

    expect(res.json).toHaveBeenCalledWith({
      items: [{ id: "F1" }],
      pagination: { page: 2, limit: 5, total: 10, pages: 2 }
    });
  });

  // ============================================================
  // getFieldById
  // ============================================================
  test("getFieldById - success", async () => {
    const req = { params: { id: "F1" }, query: { populate: "devices" } };
    const res = mockRes();

    fieldService.getFieldById.mockResolvedValue({ id: "F1" });

    await controller.getFieldById(req, res);

    expect(fieldService.getFieldById).toHaveBeenCalledWith("F1", { populate: "devices" });
    expect(res.json).toHaveBeenCalledWith({ id: "F1" });
  });

  test("getFieldById - without populate query", async () => {
    const req = { params: { id: "F1" }, query: {} };
    const res = mockRes();

    fieldService.getFieldById.mockResolvedValue({ id: "F1" });

    await controller.getFieldById(req, res);

    expect(fieldService.getFieldById).toHaveBeenCalledWith("F1", { populate: undefined });
  });

  // ============================================================
  // updateField
  // ============================================================
  test("updateField - success", async () => {
    const req = { params: { id: "F1" }, body: { name: "New" } };
    const res = mockRes();

    fieldService.updateField.mockResolvedValue({ id: "F1", name: "New" });

    await controller.updateField(req, res);

    expect(fieldService.updateField).toHaveBeenCalledWith({
      id: "F1",
      payload: { name: "New" }
    });

    expect(res.json).toHaveBeenCalledWith({ id: "F1", name: "New" });
  });

  // ============================================================
  // deleteField
  // ============================================================
  test("deleteField - success", async () => {
    const req = { params: { id: "F1" } };
    const res = mockRes();

    fieldService.deleteField.mockResolvedValue();

    await controller.deleteField(req, res);

    expect(fieldService.deleteField).toHaveBeenCalledWith("F1");
    expect(res.json).toHaveBeenCalledWith({ message: "Field deleted" });
  });

  // ============================================================
  // setActive
  // ============================================================
  test("setActive - invalid is_active → BadRequest", async () => {
    const req = { params: { id: "F1" }, body: { is_active: "x" } };
    const res = mockRes();

    createError.BadRequest.mockReturnValue(new Error("is_active (boolean) is required"));
    await expect(controller.setActive(req, res))
      .rejects.toThrow("is_active (boolean) is required");
  });

  test("setActive - success", async () => {
    const req = { params: { id: "F1" }, body: { is_active: true } };
    const res = mockRes();

    fieldService.setActive.mockResolvedValue({ id: "F1", is_active: true });

    await controller.setActive(req, res);

    expect(fieldService.setActive).toHaveBeenCalledWith({
      id: "F1",
      is_active: true
    });

    expect(res.json).toHaveBeenCalledWith({ id: "F1", is_active: true });
  });

});
