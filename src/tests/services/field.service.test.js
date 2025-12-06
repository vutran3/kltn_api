const fieldService = require("../../services/field.service");
const Field = require("../../models/field.model");
const createError = require("http-errors");

jest.mock("../../models/field.model");
jest.mock("http-errors");

describe("Field Service", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    // ============================
    // createField
    // ============================
    test("createField - success", async () => {
        Field.create.mockResolvedValue({ id: "1" });

        const result = await fieldService.createField({ name: "A" });
        expect(result.id).toBe("1");
    });

    test("createField - error", async () => {
        Field.create.mockRejectedValue(new Error("DB error"));

        await expect(fieldService.createField({}))
            .rejects.toThrow("DB error");
    });

    // ============================
    // getFields
    // ============================
    test("getFields - with select, populate", async () => {
        const mockQuery = {
            select: jest.fn().mockReturnThis(),
            sort: jest.fn().mockReturnThis(),
            skip: jest.fn().mockReturnThis(),
            limit: jest.fn().mockReturnThis(),
            populate: jest.fn().mockReturnThis(),
            then: (cb) => cb([{ id: "A" }])  // <── BIẾN query thành Promise
        };

        Field.find.mockReturnValue(mockQuery);
        Field.countDocuments.mockResolvedValue(1);

        const result = await fieldService.getFields({
            pageNum: 1,
            limitNum: 10,
            filter: {},
            select: "name,owner",
            populate: "devices"
        });

        expect(result.total).toBe(1);
        expect(mockQuery.populate).toHaveBeenCalled();
    });

    test("getFields - no select, no populate", async () => {
    const mockQuery = {
        select: jest.fn(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        populate: jest.fn(),
        then: (cb) => cb([{ id: 1 }])  // <── Promise resolve
    };

    Field.find.mockReturnValue(mockQuery);
    Field.countDocuments.mockResolvedValue(1);

    const result = await fieldService.getFields({
        pageNum: 1,
        limitNum: 10
    });

    expect(result.items.length).toBe(1);
});


    // ============================
    // getFieldById
    // ============================
    test("getFieldById - success with populate", async () => {
        const mockQuery = {
            populate: jest.fn().mockReturnThis()
        };

        Field.findById.mockReturnValue(mockQuery);
        mockQuery.then = (cb) => cb({ id: "X" });

        const result = await fieldService.getFieldById("id", { populate: "devices" });
        expect(result.id).toBe("X");
    });

    test("getFieldById - success without populate", async () => {
        Field.findById.mockResolvedValue({ id: "Y" });

        const result = await fieldService.getFieldById("id");
        expect(result.id).toBe("Y");
    });

    test("getFieldById - not found", async () => {
        Field.findById.mockResolvedValue(null);
        createError.NotFound.mockReturnValue(new Error("Field not found"));

        await expect(fieldService.getFieldById("id"))
            .rejects.toThrow("Field not found");
    });

    // ============================
    // getFieldByDeviceId
    // ============================
    test("getFieldByDeviceId - success", async () => {
        const mockQuery = { lean: jest.fn().mockReturnValue({ id: "F1" }) };
        Field.findOne.mockReturnValue(mockQuery);

        const result = await fieldService.getFieldByDeviceId("D1");
        expect(result.id).toBe("F1");
    });

    // ============================
    // updateField
    // ============================
    test("updateField - success", async () => {
        Field.findByIdAndUpdate.mockResolvedValue({ id: "U1" });

        const result = await fieldService.updateField({
            id: "U1",
            payload: { name: "New" }
        });

        expect(result.id).toBe("U1");
    });

    test("updateField - not found", async () => {
        Field.findByIdAndUpdate.mockResolvedValue(null);
        createError.NotFound.mockReturnValue(new Error("Field not found"));

        await expect(
            fieldService.updateField({ id: "1", payload: {} })
        ).rejects.toThrow("Field not found");
    });

    // ============================
    // deleteField
    // ============================
    test("deleteField - success", async () => {
        Field.findByIdAndDelete.mockResolvedValue({ id: "D1" });

        await expect(fieldService.deleteField("D1"))
            .resolves.not.toThrow();
    });

    test("deleteField - not found", async () => {
        Field.findByIdAndDelete.mockResolvedValue(null);
        createError.NotFound.mockReturnValue(new Error("Field not found"));

        await expect(fieldService.deleteField("D1"))
            .rejects.toThrow("Field not found");
    });

    // ============================
    // setActive
    // ============================
    test("setActive - success", async () => {
        Field.findByIdAndUpdate.mockResolvedValue({ id: "1", is_active: true });

        const result = await fieldService.setActive({
            id: "1",
            is_active: true
        });

        expect(result.is_active).toBe(true);
    });

    test("setActive - not found", async () => {
        Field.findByIdAndUpdate.mockResolvedValue(null);
        createError.NotFound.mockReturnValue(new Error("Field not found"));

        await expect(fieldService.setActive({ id: "1", is_active: false }))
            .rejects.toThrow("Field not found");
    });
});
