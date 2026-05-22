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

    const response2 = await agent
      .post("/login")
      .send({
        username: TESTING_CONSTANTS.TESTING_USER_USERNAME,
        password: TESTING_CONSTANTS.TESTING_USER_PASSWORD,
        "x-csrf-token": csrfToken
      })
      .expect(302)
      .expect("Location", "/");

    console.log(response2);
  });

  afterEach(async function () {
    await databaseConnection.connection.db.dropDatabase();
  });

  after(async function () {
    await databaseConnection.connection.close();
  });
});
