import { describe } from "mocha";
import { TESTING_CONSTANTS } from "../constants";
import mongoose from "mongoose";
import assert from "node:assert";
import { User } from "../../../src/server/models/User";
const bcrypt = require("bcrypt");
import { createWebServer } from "../../../src/server";
const request = require("supertest");
const cheerio = require("cheerio");
const nock = require("nock");

describe("/register", () => {
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

  it("should allow registering with valid credentials and a completed captcha", async () => {
    const app = createWebServer();
    const agent = request.agent(app);

    const scope = nock("https://www.google.com")
      .post("/recaptcha/api/siteverify")
      .query(true)
      .reply(200, { "success": true });

    const response1 = await agent.get("/register").expect(200);
    const $ = cheerio.load(response1.text);
    const csrfToken = $("input[name='x-csrf-token']").val();

    const response2 = await agent.post("/register").send({
      username: "test_user2",
      password: "test_user2",
      "confirm-password": "test_user2",
      "x-csrf-token": csrfToken
    });

    assert.equal(response2.status, 302);
  });
 
  it("should not allow registering with invalid username, even a completed captcha", async () => {
    const app = createWebServer();
    const agent = request.agent(app);

    const scope = nock("https://www.google.com")
      .post("/recaptcha/api/siteverify")
      .query(true)
      .reply(200, { "success": true });

    const response1 = await agent.get("/register").expect(200);
    const $ = cheerio.load(response1.text);
    const csrfToken = $("input[name='x-csrf-token']").val();

    const response2 = await agent.post("/register").send({
      username: "$$$$MONEY$$$$",
      password: "test_user2",
      "confirm-password": "test_user2",
      "x-csrf-token": csrfToken
    });

    assert.equal(response2.status, 400);
  });

 
  it("should not allow registering with a username that is too short, even a completed captcha", async () => {
    const app = createWebServer();
    const agent = request.agent(app);

    const scope = nock("https://www.google.com")
      .post("/recaptcha/api/siteverify")
      .query(true)
      .reply(200, { "success": true });

    const response1 = await agent.get("/register").expect(200);
    const $ = cheerio.load(response1.text);
    const csrfToken = $("input[name='x-csrf-token']").val();

    const response2 = await agent.post("/register").send({
      username: "aa",
      password: "test_user2",
      "confirm-password": "test_user2",
      "x-csrf-token": csrfToken
    });

    assert.equal(response2.status, 400);
  });



  
  it("should not allow registering with invalid password, even a completed captcha", async () => {
    const app = createWebServer();
    const agent = request.agent(app);

    const scope = nock("https://www.google.com")
      .post("/recaptcha/api/siteverify")
      .query(true)
      .reply(200, { "success": true });

    const response1 = await agent.get("/register").expect(200);
    const $ = cheerio.load(response1.text);
    const csrfToken = $("input[name='x-csrf-token']").val();

    const response2 = await agent.post("/register").send({
      username: "test_user2",
      password: "123",
      "confirm-password": "123",
      "x-csrf-token": csrfToken
    });

    assert.equal(response2.status, 400);
  });

 it("should not allow registering with password and confirm password doesn't match, even a completed captcha", async () => {
    const app = createWebServer();
    const agent = request.agent(app);

    const scope = nock("https://www.google.com")
      .post("/recaptcha/api/siteverify")
      .query(true)
      .reply(200, { "success": true });

    const response1 = await agent.get("/register").expect(200);
    const $ = cheerio.load(response1.text);
    const csrfToken = $("input[name='x-csrf-token']").val();

    const response2 = await agent.post("/register").send({
      username: "test_user2",
      password: "12345678aaaaa",
      "confirm-password": "test_user2",
      "x-csrf-token": csrfToken
    });

    assert.equal(response2.status, 400);
  });


  afterEach(async function () {
    await nock.cleanAll();
    await databaseConnection.connection.db.dropDatabase();
  });

  after(async function () {
    await databaseConnection.connection.close();
  });
});
