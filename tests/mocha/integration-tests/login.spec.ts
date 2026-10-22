import { describe } from "mocha";
import { TESTING_CONSTANTS } from "../constants";
import mongoose from "mongoose";
import assert from "node:assert";
import { User } from "../../../src/server/models/User";
const bcrypt = require("bcrypt");
import { createWebServer } from "../../../src/server";
const request = require("supertest");
const cheerio = require("cheerio");

describe("/login", () => {
  let databaseConnection: mongoose.Mongoose;

  before(async function () {
    databaseConnection = await mongoose.connect(process.env.DATABASE_URI ?? "");
    mongoose.connection.on("connected", () => {
      console.log(`Connected to test database!`);
    });
  });

  beforeEach(async function () {
    // add test user
    const user = new User();
    user.username = TESTING_CONSTANTS.TESTING_USER_USERNAME;
    user.passwordHash = await bcrypt.hash(
      TESTING_CONSTANTS.TESTING_USER_PASSWORD,
      4
    );
    await user.save();
  });

  it("should allow logging in with correct credentials", async () => {
    const app = createWebServer();
    const agent = request.agent(app);

    const response1 = await agent.get("/login").expect(200);
    const $ = cheerio.load(response1.text);
    const csrfToken = $("input[name='x-csrf-token']").val();

    const response2 = await agent.post("/login").send({
      username: TESTING_CONSTANTS.TESTING_USER_USERNAME,
      password: TESTING_CONSTANTS.TESTING_USER_PASSWORD,
      "x-csrf-token": csrfToken
    });

    assert.equal(response2.status, 302);
  });

  it("should not allow logging in with incorrect password", async () => {
    const app = createWebServer();
    const agent = request.agent(app);

    const response1 = await agent.get("/login").expect(200);
    const $ = cheerio.load(response1.text);
    const csrfToken = $("input[name='x-csrf-token']").val();

    const response2 = await agent.post("/login").send({
      username: TESTING_CONSTANTS.TESTING_USER_USERNAME,
      password: "incorrect-password",
      "x-csrf-token": csrfToken
    });
    assert.equal(response2.status, 401);
  });

  it("should not allow logging in with incorrect username", async () => {
    const app = createWebServer();
    const agent = request.agent(app);

    const response1 = await agent.get("/login").expect(200);
    const $ = cheerio.load(response1.text);
    const csrfToken = $("input[name='x-csrf-token']").val();

    const response2 = await agent.post("/login").send({
      username: "wrongUsername",
      password: TESTING_CONSTANTS.TESTING_USER_PASSWORD,
      "x-csrf-token": csrfToken
    });
    assert.equal(response2.status, 401);
  });

  it("should not allow logging in with invalid password", async () => {
    const app = createWebServer();
    const agent = request.agent(app);

    const response1 = await agent.get("/login").expect(200);
    const $ = cheerio.load(response1.text);
    const csrfToken = $("input[name='x-csrf-token']").val();

    const response2 = await agent.post("/login").send({
      username: "",
      password: TESTING_CONSTANTS.TESTING_USER_PASSWORD,
      "x-csrf-token": csrfToken
    });
    assert.equal(response2.status, 400);
  });


  it("should not allow logging in with invalid password", async () => {
    const app = createWebServer();
    const agent = request.agent(app);

    const response1 = await agent.get("/login").expect(200);
    const $ = cheerio.load(response1.text);
    const csrfToken = $("input[name='x-csrf-token']").val();

    const response2 = await agent.post("/login").send({
      username: TESTING_CONSTANTS.TESTING_USER_USERNAME,
      password: "",
      "x-csrf-token": csrfToken
    });
    assert.equal(response2.status, 400);
  });

  it("should not allow logging in with invalid csrf token", async () => {
    const app = createWebServer();
    const agent = request.agent(app);

    const response1 = await agent.get("/login").expect(200);
    const $ = cheerio.load(response1.text);
    const csrfToken = $("input[name='x-csrf-token']").val();

    const response2 = await agent.post("/login").send({
      username: TESTING_CONSTANTS.TESTING_USER_USERNAME,
      password: TESTING_CONSTANTS.TESTING_USER_PASSWORD,
      "x-csrf-token":"", 
    });

    assert.equal(response2.status, 403);
  });

  afterEach(async function () {
    await databaseConnection.connection.db.dropDatabase();
  });

  after(async function () {
    await databaseConnection.connection.close();
  });
});
