import assert from "node:assert";
import { describe, it } from "mocha";
import mongoose from "mongoose";
import request from "supertest";
import { createWebServer } from "../../../src/server";
import { User } from "../../../src/server/models/User";
import {
  createTestUser,
  extractCsrfToken,
  logIn
} from "../helpers";

describe("/account", () => {
  let databaseConnection: mongoose.Mongoose;

  before(async () => {
    databaseConnection = await mongoose.connect(process.env.DATABASE_URI ?? "");
  });

  afterEach(async () => {
    await databaseConnection.connection.db!.dropDatabase();
  });

  after(async () => {
    await databaseConnection.connection.close();
  });

  it("redirects anonymous account requests to login", async () => {
    const app = createWebServer();

    await request(app).get("/account").expect(302).expect("Location", "/login");
    await request(app)
      .get("/account/settings")
      .expect(302)
      .expect("Location", "/login");
  });

  it("shows the authenticated user's role and solve count", async () => {
    await createTestUser({
      isAdministrator: true,
      correctAnswers: [
        { problemID: "one", timestamp: new Date() },
        { problemID: "two", timestamp: new Date() }
      ]
    });
    const agent = request.agent(createWebServer());
    await logIn(agent);

    const response = await agent.get("/account").expect(200);

    assert.match(response.text, /test_user/);
    assert.match(response.text, /Administrator/);
    assert.match(response.text, /Correct Answers:\s*2/);
  });

  it("prefills the authenticated user's email address", async () => {
    const user = await createTestUser();
    user.email = "old@example.com";
    await user.save();
    const agent = request.agent(createWebServer());
    await logIn(agent);

    const response = await agent.get("/account/settings").expect(200);

    assert.match(response.text, /value="old@example.com"/);
  });

  it("updates the authenticated user's email address", async () => {
    await createTestUser();
    const agent = request.agent(createWebServer());
    await logIn(agent);
    const settingsPage = await agent.get("/account/settings").expect(200);

    await agent
      .post("/account/settings")
      .send({
        email: "new@example.com",
        "x-csrf-token": extractCsrfToken(settingsPage.text)
      })
      .expect(302)
      .expect("Location", "/account/settings");

    const user = await User.findOne({ username: "test_user" }).lean();
    assert.equal(user?.email, "new@example.com");
  });

  it("does not update the email when the CSRF token is invalid", async () => {
    const user = await createTestUser();
    user.email = "unchanged@example.com";
    await user.save();
    const agent = request.agent(createWebServer());
    await logIn(agent);

    await agent
      .post("/account/settings")
      .send({ email: "attacker@example.com", "x-csrf-token": "invalid" })
      .expect(403);

    const unchangedUser = await User.findOne({ username: "test_user" }).lean();
    assert.equal(unchangedUser?.email, "unchanged@example.com");
  });

  it("logs out all sessions and clears authentication cookies", async () => {
    await createTestUser();
    const agent = request.agent(createWebServer());
    await logIn(agent);

    const response = await agent
      .get("/logout?scope=all")
      .expect(302)
      .expect("Location", "/");

    const cookies = response.headers["set-cookie"] as unknown as string[];
    assert.ok(cookies.some((cookie) => cookie.startsWith("username=;")));
    assert.ok(cookies.some((cookie) => cookie.startsWith("token=;")));

    const user = await User.findOne({ username: "test_user" }).lean();
    assert.deepEqual(user?.tokens, []);
    await agent.get("/account").expect(302).expect("Location", "/login");
  });
});
