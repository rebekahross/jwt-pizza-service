const request = require("supertest");
const app = require("../service");
const { DB, Role } = require("../database/database.js");

function randomName() {
  return Math.random().toString(36).substring(2, 12);
}

async function createAdminUser() {
  let user = { password: "toomanysecrets", roles: [{ role: Role.Admin }] };
  user.name = randomName();
  user.email = user.name + "@admin.com";

  await DB.addUser(user);

  user.password = "toomanysecrets";

  return user;
}

let testUserAuthToken;
let testUser;
let registerRes;
let adminUser;
let loginAdminRes;

beforeAll(async () => {
  adminUser = await createAdminUser();
  loginAdminRes = await request(app).put("/api/auth").send(adminUser);
});

beforeEach(async () => {
  testUser = { name: randomName(), email: "reg@test.com", password: "a" };
  testUser.email = randomName() + "@test.com";
  registerRes = await request(app).post("/api/auth").send(testUser);
  testUserAuthToken = registerRes.body.token;
});

test("login", async () => {
  const loginRes = await request(app).put("/api/auth").send(testUser);
  expect(loginRes.status).toBe(200);
  expect(loginRes.body.token).toMatch(
    /^[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*$/
  );

  const { password, ...user } = { ...testUser, roles: [{ role: "diner" }] };
  expect(loginRes.body.user).toMatchObject(user);
});

test("logout", async () => {
  const logoutRes = await request(app)
    .delete("/api/auth")
    .set(`Authorization`, `Bearer ${testUserAuthToken}`)
    .send(testUser);

  expect(logoutRes.status).toBe(200);
  expect(logoutRes.body.message).toBe("logout successful");
});

test("register with no email", async () => {
  const badUser = { name: "name", password: "a" };
  const registerRes = await request(app).post("/api/auth").send(badUser);

  expect(registerRes.status).toBe(400);
});

test("authenticate token that doesn't exist", async () => {
  const fakeUser = {
    name: randomName(),
    email: randomName() + "@mail.com",
    password: randomName(),
  };

  const logoutRes = await request(app).delete("/api/auth").send(fakeUser);

  expect(logoutRes.status).toBe(401);
  expect(logoutRes.body.message).toBe("unauthorized");
});

test("update user", async () => {
  const updatedUser = {
    id: registerRes.body.user.id,
    email: randomName() + "@example.com",
    password: randomName(),
  };

  const updateRes = await request(app)
    .put(`/api/auth/${registerRes.body.user.id}`)
    .set(`Authorization`, `Bearer ${loginAdminRes.body.token}`)
    .send(updatedUser);

  expect(updateRes.status).toBe(200);
});

test("update user without admin role", async () => {
  const loginRes = await request(app).put("/api/auth").send(testUser);

  const updatedUser = {
    id: registerRes.id,
    email: randomName() + "@example.com",
    password: randomName(),
  };

  const updateRes = await request(app)
    .put(`/api/auth/${registerRes.id}`)
    .set(`Authorization`, `Bearer ${loginRes.body.token}`)
    .send(updatedUser);

  expect(updateRes.status).toBe(403);
  expect(updateRes.body.message).toBe("unauthorized");
});
