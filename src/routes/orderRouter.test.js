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

test("add menu item", async () => {
  const fakeMenuItem2 = {
    title: randomName(),
    description: randomName(),
    image: randomName() + ".png",
    price: 0.0001,
  };

  const addMenuRes = await request(app)
    .put("/api/order/menu")
    .set(`Authorization`, `Bearer ${adminAuthToken}`)
    .send(fakeMenuItem2);

  expect(addMenuRes.status).toBe(200);
  expect(addMenuRes.body.length).toBeGreaterThanOrEqual(2);
});
