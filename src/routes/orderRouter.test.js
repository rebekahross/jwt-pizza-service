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
let adminAuthToken;
let fakeMenuItem;

beforeAll(async () => {
  adminUser = await createAdminUser();
  loginAdminRes = await request(app).put("/api/auth").send(adminUser);
  adminAuthToken = loginAdminRes.body.token;
});

beforeEach(async () => {
  testUser = { name: randomName(), email: "reg@test.com", password: "a" };
  testUser.email = randomName() + "@test.com";
  registerRes = await request(app).post("/api/auth").send(testUser);
  testUserAuthToken = registerRes.body.token;

  fakeMenuItem = {
    title: randomName(),
    description: randomName(),
    image: randomName() + ".png",
    price: 0.0001,
  };

  await request(app)
    .put("/api/order/menu")
    .set(`Authorization`, `Bearer ${adminAuthToken}`)
    .send(fakeMenuItem);
});

test("get menu", async () => {
  const getMenuRes = await request(app).get("/api/order/menu");

  expect(getMenuRes.status).toBe(200);
  expect(getMenuRes.body.length).toBeGreaterThanOrEqual(1);
});
