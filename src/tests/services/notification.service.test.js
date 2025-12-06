const { createAndEmit, getListNotification, markRead, deleteNotification } =
  require("../../services/notification.service");

const notification = require("../../models/notification.model");
const UserToken = require("../../models/usertoken.model");
const { getIO } = require("../../socket");
const { BadRequestError } = require("../../core/error.response");
const { pushToken } = require("../../fcm");
const { Types } = require("mongoose");

jest.mock("../../models/notification.model");
jest.mock("../../models/usertoken.model");
jest.mock("../../socket");
jest.mock("../../core/error.response");
jest.mock("../../fcm");

jest.mock("../../socket", () => ({
  getIO: jest.fn()
}));

describe("Notification Service", () => {
  let emitMock;
  let toMock;

  beforeEach(() => {
    jest.clearAllMocks();

    emitMock = jest.fn();   // mock .emit()
    toMock = jest.fn(() => ({ emit: emitMock })); // mock .to() return {emit}

    getIO.mockReturnValue({
      to: toMock
    });
  });


  // ============================================
  // createAndEmit
  // ============================================
  test("createAndEmit - success fully with tokens and invalid tokens removed", async () => {
    const fakeDoc = {
      _id: "notif1",
      title: "Hello",
      body: "World",
      data: { k: 1 },
      createdAt: new Date(),
      read: false,
    };

    notification.create.mockResolvedValue(fakeDoc);
    UserToken.find.mockReturnValue({
      distinct: jest.fn().mockResolvedValue(["token1", "token2", "token3"]),
    });

    pushToken.mockResolvedValue({
      responses: [
        { success: true },
        { success: false, error: { code: "messaging/registration-token-not-registered" } },
        { success: true },
      ],
    });

    UserToken.deleteMany.mockResolvedValue({ deletedCount: 1 });

    const result = await createAndEmit({
      userId: "user123",
      deviceId: "dev001",
      title: "Hello",
      body: "World",
      data: { k: 1 },
    });

    expect(notification.create).toHaveBeenCalled();
    expect(emitMock).toHaveBeenCalledWith("notification:new", expect.any(Object));
    expect(pushToken).toHaveBeenCalled();
    expect(UserToken.deleteMany).toHaveBeenCalled();
    expect(result).toEqual(fakeDoc);
  });

  test("createAndEmit - no tokens → no pushToken call", async () => {
    const fakeDoc = {
      _id: "notif1",
      title: "T",
      body: "B",
      createdAt: new Date(),
      read: false,
      data: null,
    };

    notification.create.mockResolvedValue(fakeDoc);
    UserToken.find.mockReturnValue({
      distinct: jest.fn().mockResolvedValue([]),
    });

    const result = await createAndEmit({
      userId: "u1",
      deviceId: "d1",
      title: "T",
      body: "B",
    });

    expect(pushToken).not.toHaveBeenCalled();
    expect(result).toEqual(fakeDoc);
  });

  // ============================================
  // getListNotification
  // ============================================
  test("getListNotification - with pagination + sorting", async () => {
    const fakeList = [{ id: 1 }];
    const fakeUnread = 2;

    notification.find.mockReturnValue({
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue(fakeList),
    });

    notification.countDocuments
      .mockResolvedValueOnce(1) // total
      .mockResolvedValueOnce(fakeUnread); // unread

    const result = await getListNotification({
      page: 1,
      limit: 10,
      read: "all",
      sort: "ctime",
    });

    expect(result.results).toEqual(fakeList);
    expect(result.unread).toBe(fakeUnread);
    expect(result.pagination.totalPages).toBe(1);
  });

  test("getListNotification - read=true filter", async () => {
    notification.find.mockReturnValue({
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue([]),
    });

    notification.countDocuments
      .mockResolvedValueOnce(0) // total
      .mockResolvedValueOnce(0); // unread

    await getListNotification({ read: "true" });

    expect(notification.find).toHaveBeenCalledWith({ read: true });
  });

  test("getListNotification - read=false filter", async () => {
    notification.find.mockReturnValue({
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue([]),
    });

    notification.countDocuments
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0);

    await getListNotification({ read: "false" });

    expect(notification.find).toHaveBeenCalledWith({ read: false });
  });

  // ============================================
  // markRead
  // ============================================
  test("markRead - mark all unread", async () => {
    notification.updateMany.mockResolvedValue({
      matchedCount: 5,
      modifiedCount: 5,
    });
    notification.countDocuments.mockResolvedValue(3);

    const result = await markRead({ ids: [] });

    expect(result).toEqual({
      matched: 5,
      modified: 5,
      unread: 3,
    });
  });

  test("markRead - with invalid ids → throw BadRequestError", async () => {
    BadRequestError.mockImplementation(msg => new Error(msg));

    await expect(markRead({ ids: ["invalid_id"] }))
      .rejects.toThrow("Invalid request !!!");
  });

  test("markRead - valid ids → success", async () => {
    const validId = new Types.ObjectId().toString();

    notification.updateMany.mockResolvedValue({
      matchedCount: 1,
      modifiedCount: 1,
    });
    notification.countDocuments.mockResolvedValue(0);

    const result = await markRead({ ids: [validId] });

    expect(result.matched).toBe(1);
    expect(result.modified).toBe(1);
    expect(result.unread).toBe(0);
  });

  // ============================================
  // deleteNotification
  // ============================================
  test("deleteNotification - delete one success", async () => {
    const validId = new Types.ObjectId().toString();

    notification.deleteOne.mockReturnValue({
      lean: () => ({ deletedCount: 1 }),
    });

    notification.countDocuments.mockResolvedValue(2);

    const result = await deleteNotification({
      id: validId,
      option: "one",
    });

    expect(result.deletedCount).toBe(1);
    expect(result.unread).toBe(2);
  });

  test("deleteNotification - delete all success", async () => {
    notification.deleteMany.mockResolvedValue({ deletedCount: 10 });

    const result = await deleteNotification({
      id: "",
      option: "all",
    });

    expect(result.deletedCount).toBe(10);
  });

  test("deleteNotification - invalid request → throw", async () => {
    BadRequestError.mockImplementation(msg => new Error(msg));

    await expect(deleteNotification({ id: "abc", option: "one" }))
      .rejects.toThrow("Invalid request !!!");
  });
});
