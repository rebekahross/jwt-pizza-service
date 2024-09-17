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
let franchiseName;
let franchiseObject;
let createFranchiseRes;

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

  franchiseName = randomName();
  franchiseObject = { name: franchiseName, admins: [adminUser] };
  createFranchiseRes = await request(app)
    .post("/api/franchise")
    .set(`Authorization`, `Bearer ${adminAuthToken}`)
    .send(franchiseObject);
});

test("create franchise", async () => {
  const franchiseName = randomName();
  const franchiseObject = { name: franchiseName, admins: [adminUser] };
  const createRes = await request(app)
    .post("/api/franchise")
    .set(`Authorization`, `Bearer ${adminAuthToken}`)
    .send(franchiseObject);

  expect(createRes.status).toBe(200);
  expect(createRes.body.name).toBe(franchiseName);
});

test("create franchise with non-admin", async () => {
  const createFranchiseNoAdmin = await request(app)
    .post("/api/franchise")
    .set(`Authorization`, `Bearer ${testUserAuthToken}`)
    .send(franchiseObject);

  expect(createFranchiseNoAdmin.status).toBe(403);
  expect(createFranchiseNoAdmin.body.message).toBe(
    "unable to create a franchise"
  );
});

test("delete franchise", async () => {
  const deleteRes = await request(app)
    .delete(`/api/franchise/${createFranchiseRes.body.id}`)
    .set(`Authorization`, `Bearer ${adminAuthToken}`)
    .send(franchiseObject);

  expect(deleteRes.status).toBe(200);
  expect(deleteRes.body.message).toBe("franchise deleted");
});

test("delete franchise with no admin", async () => {
  const deleteRes = await request(app)
    .delete(`/api/franchise/${createFranchiseRes.body.id}`)
    .set(`Authorization`, `Bearer ${testUserAuthToken}`)
    .send(franchiseObject);

  expect(deleteRes.status).toBe(403);
  expect(deleteRes.body.message).toBe("unable to delete a franchise");
});

test("create store", async () => {
  const storeName = randomName();
  const storeObject = {
    name: storeName,
    franchiseId: createFranchiseRes.body.id,
  };

  const createStoreRes = await request(app)
    .post(`/api/franchise/${createFranchiseRes.body.id}/store`)
    .set(`Authorization`, `Bearer ${adminAuthToken}`)
    .send(storeObject);

  expect(createStoreRes.status).toBe(200);
  expect(createStoreRes.body.name).toBe(storeName);
  expect(createStoreRes.body.franchiseId).toBe(createFranchiseRes.body.id);
});

test("delete store", async () => {
  const storeName = randomName();
  const storeObject = {
    name: storeName,
    franchiseId: createFranchiseRes.body.id,
  };

  const createStoreRes = await request(app)
    .post(`/api/franchise/${createFranchiseRes.body.id}/store`)
    .set(`Authorization`, `Bearer ${adminAuthToken}`)
    .send(storeObject);

  const deleteStoreRes = await request(app)
    .delete(
      `/api/franchise/${createFranchiseRes.body.id}/store/${createStoreRes.body.id}`
    )
    .set(`Authorization`, `Bearer ${adminAuthToken}`)
    .send(storeObject);

  expect(deleteStoreRes.status).toBe(200);
  expect(deleteStoreRes.body.message).toBe("store deleted");
});
