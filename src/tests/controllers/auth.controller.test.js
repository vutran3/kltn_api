const authController = require("../../controllers/auth.controller");
const User = require("../../models/user.model");
const { safeUser } = require("../../utils");
const { signAccessToken, signRefreshToken } = require("../../utils/jwt");

jest.mock("../../models/user.model");
jest.mock("../../utils");
jest.mock("../../utils/jwt");

const mockRes = () => {
  const res = {};
  res.locals = {}; 
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
};

describe("Auth Controller - Full Coverage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ==========================================
  // LOGIN
  // ==========================================
  test("login - missing email or password → 400", async () => {
    const req = { body: { email: "" } };
    const res = mockRes();

    await authController.login(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  test("login - user not found → 401", async () => {
    const req = { body: { email: "test@gmail.com", password: "123" } };
    const res = mockRes();

    User.findOne.mockResolvedValue(null);

    await authController.login(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
  });

  test("login - user has no password → fetch with select + password", async () => {
    const req = { body: { email: "a@a.com", password: "123" } };
    const res = mockRes();

    const mockUser = { email: "a@a.com", password: null };
    const withPassUser = { email: "a@a.com", password: "hashed", comparePassword: jest.fn() };

    User.findOne
      .mockResolvedValueOnce(mockUser) // First findOne
      .mockReturnValueOnce({ select: jest.fn().mockReturnValueOnce(withPassUser) }); // Select + password

    withPassUser.comparePassword.mockResolvedValue(true);
    safeUser.mockReturnValue({ email: "a@a.com" });
    signAccessToken.mockReturnValue("at");
    signRefreshToken.mockReturnValue("rt");

    await authController.login(req, res);

    expect(res.json).toHaveBeenCalled();
  });

  test("login - password mismatch → 401", async () => {
    const req = { body: { email: "test@gmail.com", password: "123" } };
    const res = mockRes();

    const mockUser = {
      email: "test@gmail.com",
      password: "hash",
      comparePassword: jest.fn().mockResolvedValue(false)
    };

    User.findOne.mockResolvedValue(mockUser);

    await authController.login(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
  });

  test("login - success", async () => {
    const req = { body: { email: "t@gmail.com", password: "123" } };
    const res = mockRes();

    const user = {
      _id: "u1",
      email: "t@gmail.com",
      role: "user",
      password: "hashed",
      comparePassword: jest.fn().mockResolvedValue(true)
    };

    User.findOne.mockResolvedValue(user);
    safeUser.mockReturnValue({ email: "t@gmail.com" });
    signAccessToken.mockReturnValue("access-token");
    signRefreshToken.mockReturnValue("refresh-token");

    await authController.login(req, res);

    expect(res.json).toHaveBeenCalledWith({
      message: "Logged in",
      data: {
        user: { email: "t@gmail.com" },
        token: { accessToken: "access-token", refreshToken: "refresh-token" }
      }
    });
  });

  test("login - internal server error → 500", async () => {
    const req = { body: { email: "t@gmail.com", password: "123" } };
    const res = mockRes();

    User.findOne.mockRejectedValue(new Error("DB error"));

    await authController.login(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });

  // ==========================================
  // REGISTER
  // ==========================================
  test("register - missing fields → 400", async () => {
    const req = { body: { email: "", name: "" } };
    const res = mockRes();

    await authController.register(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  test("register - email already exists → 409", async () => {
    const req = { body: { name: "A", email: "a@gmail.com", password: "123" } };
    const res = mockRes();

    User.findOne.mockResolvedValue({});

    await authController.register(req, res);

    expect(res.status).toHaveBeenCalledWith(409);
  });

  test("register - success", async () => {
    const req = { body: { name: "A", email: "a@gmail.com", password: "123" } };
    const res = mockRes();

    User.findOne.mockResolvedValue(null);
    const createdUser = { _id: "U1", email: "a@gmail.com", role: "user" };

    User.create.mockResolvedValue(createdUser);

    safeUser.mockReturnValue({ email: "a@gmail.com" });
    signAccessToken.mockReturnValue("AT");
    signRefreshToken.mockReturnValue("RT");

    await authController.register(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalled();
  });

  test("register - duplicate key error → 409", async () => {
    const req = { body: { name: "A", email: "a@gmail.com", password: "123" } };
    const res = mockRes();

    const err = { code: 11000 };
    User.findOne.mockRejectedValue(err);

    await authController.register(req, res);

    expect(res.status).toHaveBeenCalledWith(409);
  });

  // handle create error with duplicate email
  test("register - create() duplicate key → 409", async () => {
    const req = { body: { name: "A", email: "a@gmail.com", password: "123" } };
    const res = mockRes();

    User.findOne.mockResolvedValue(null);
    User.create.mockRejectedValue({ code: 11000 });

    await authController.register(req, res);

    expect(res.status).toHaveBeenCalledWith(409);
  });

  // ==========================================
  // GET ME
  // ==========================================
  test("getMe - returns user info", async () => {
    const res = mockRes();
    res.locals.user = { id: "u1", name: "John" };

    await authController.getMe({}, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      msg: "Get user infomation successful",
      data: { id: "u1", name: "John" }
    });
  });
});
