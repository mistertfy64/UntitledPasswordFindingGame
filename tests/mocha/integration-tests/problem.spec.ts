import { describe, it } from "mocha";
import assert from "node:assert";
import mongoose from "mongoose";
import request from "supertest";
import { createWebServer } from "../../../src/server";
import { Problem } from "../../../src/server/models/Problem";
import { Submission } from "../../../src/server/models/Submission";
import { User } from "../../../src/server/models/User";
import {
  createTestProblem,
  createTestUser,
  extractCsrfToken,
  logIn
} from "../helpers";

describe("/problem", () => {
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

  it("redirects /problem to /problemset", async () => {
    await request(createWebServer())
      .get("/problem")
      .expect(302)
      .expect("Location", "/problemset");
  });

  it("renders a problem and its Markdown statement for an authenticated user", async () => {
    await createTestUser();
    await createTestProblem({
      problemName: "Markdown Problem",
      problemStatement: "Find the **important** clue.",
      author: "Puzzle Author"
    });
    const agent = request.agent(createWebServer());
    await logIn(agent);

    const response = await agent.get("/problem/test-problem").expect(200);

    assert.match(response.text, /Markdown Problem/);
    assert.match(response.text, /Puzzle Author/);
    assert.match(response.text, /<strong>important<\/strong>/);
    assert.match(response.text, /name="password"/);
  });

  it("does not reveal the password to a user who has not solved the problem", async () => {
    await createTestUser();
    await createTestProblem({ correctPassword: "do-not-leak-this" });
    const agent = request.agent(createWebServer());
    await logIn(agent);

    const response = await agent.get("/problem/test-problem").expect(200);

    assert.doesNotMatch(response.text, /do-not-leak-this/);
  });

  it("reveals the password to the user who solved the problem", async () => {
    const solvedAt = new Date();
    const user = await createTestUser();
    const problem = await createTestProblem({
      correctPassword: "revealed-password",
      correctAnswers: [{ username: "test_user", timestamp: solvedAt }]
    });
    await user.addCorrectAnswer(problem._id, solvedAt);
    const agent = request.agent(createWebServer());
    await logIn(agent);

    const response = await agent.get("/problem/test-problem").expect(200);

    assert.match(response.text, /revealed-password/);
  });

  it("returns 404 for a nonexistent problem", async () => {
    await request(createWebServer()).get("/problem/does-not-exist").expect(404);
  });

  it("redirects ordinary users from unreleased problems", async () => {
    await createTestUser();
    await createTestProblem({
      releaseDateAndTime: new Date(Date.now() + 86_400_000)
    });
    const agent = request.agent(createWebServer());
    await logIn(agent);

    await agent
      .get("/problem/test-problem")
      .expect(302)
      .expect("Location", "/problemset");
  });

  it("allows administrators to preview unreleased problems", async () => {
    await createTestUser({ isAdministrator: true });
    await createTestProblem({
      releaseDateAndTime: new Date(Date.now() + 86_400_000)
    });
    const agent = request.agent(createWebServer());
    await logIn(agent);

    const response = await agent.get("/problem/test-problem").expect(200);

    assert.match(response.text, /Bypassing problem restrictions/);
  });

  it("allows a hidden released problem to be opened by direct URL", async () => {
    await createTestProblem({ hidden: true });

    const response = await request(createWebServer())
      .get("/problem/test-problem")
      .expect(200);

    assert.match(response.text, /Test Problem/);
  });

  it("redirects anonymous submissions to login without saving them", async () => {
    await createTestProblem();
    const agent = request.agent(createWebServer());
    const loginPage = await agent.get("/login").expect(200);
    const csrfToken = extractCsrfToken(loginPage.text);

    await agent
      .post("/problem/test-problem")
      .send({ password: "guess", "x-csrf-token": csrfToken })
      .expect(302)
      .expect("Location", "/login");

    assert.equal(await Submission.countDocuments(), 0);
  });

  it("rejects empty and oversized answers without saving them", async () => {
    await createTestUser();
    await createTestProblem();
    const agent = request.agent(createWebServer());
    await logIn(agent);

    let page = await agent.get("/problem/test-problem").expect(200);
    await agent
      .post("/problem/test-problem")
      .send({ password: "", "x-csrf-token": extractCsrfToken(page.text) })
      .expect(302);

    page = await agent.get("/problem/test-problem").expect(200);
    await agent
      .post("/problem/test-problem")
      .send({
        password: "x".repeat(65),
        "x-csrf-token": extractCsrfToken(page.text)
      })
      .expect(302);

    assert.equal(await Submission.countDocuments(), 0);
  });

  it("records a wrong answer without recording a solve", async () => {
    await createTestUser();
    await createTestProblem();
    const agent = request.agent(createWebServer());
    await logIn(agent);
    const page = await agent.get("/problem/test-problem").expect(200);

    const response = await agent
      .post("/problem/test-problem")
      .send({
        password: "wrong-password",
        "x-csrf-token": extractCsrfToken(page.text)
      })
      .expect(200);

    assert.match(response.text, /Wrong Answer/);
    const submissions = await Submission.find({}).lean();
    const user = await User.findOne({ username: "test_user" }).lean();
    const problem = await Problem.findOne({ problemID: "test-problem" }).lean();
    assert.equal(submissions.length, 1);
    assert.equal(submissions[0].verdict, "wrong answer");
    assert.equal(submissions[0].user.toString(), user?._id.toString());
    assert.equal(submissions[0].problem.toString(), problem?._id.toString());
    assert.equal(user?.correctAnswers.length, 0);
    assert.equal(problem?.correctAnswers.length, 0);
  });

  it("records a correct submission and both solve records", async () => {
    await createTestUser();
    await createTestProblem();
    const agent = request.agent(createWebServer());
    await logIn(agent);
    const page = await agent.get("/problem/test-problem").expect(200);

    const response = await agent
      .post("/problem/test-problem")
      .send({
        password: "correct-password",
        "x-csrf-token": extractCsrfToken(page.text)
      })
      .expect(200);

    assert.match(response.text, /Correct Answer/);
    const submissions = await Submission.find({}).lean();
    const user = await User.findOne({ username: "test_user" }).lean();
    const problem = await Problem.findOne({ problemID: "test-problem" }).lean();
    assert.equal(submissions.length, 1);
    assert.equal(submissions[0].verdict, "correct answer");
    assert.equal(user?.correctAnswers.length, 1);
    assert.ok(user?.correctAnswers[0].problem instanceof mongoose.Types.ObjectId);
    assert.equal(
      user?.correctAnswers[0].problem.toString(),
      problem?._id.toString()
    );
    assert.equal(problem?.correctAnswers.length, 1);
    assert.equal(
      problem?.correctAnswers[0].user.toString(),
      user?._id.toString()
    );
  });

  it("does not duplicate solve records for a repeated correct answer", async () => {
    await createTestUser();
    await createTestProblem();
    const agent = request.agent(createWebServer());
    await logIn(agent);

    for (let attempt = 0; attempt < 2; attempt++) {
      const page = await agent.get("/problem/test-problem").expect(200);
      await agent
        .post("/problem/test-problem")
        .send({
          password: "correct-password",
          "x-csrf-token": extractCsrfToken(page.text)
        })
        .expect(200);
    }

    const user = await User.findOne({ username: "test_user" }).lean();
    const problem = await Problem.findOne({ problemID: "test-problem" }).lean();
    assert.equal(await Submission.countDocuments(), 2);
    assert.equal(user?.correctAnswers.length, 1);
    assert.equal(problem?.correctAnswers.length, 1);
  });

  it("rejects submissions to unreleased problems without saving them", async () => {
    await createTestUser();
    await createTestProblem({
      releaseDateAndTime: new Date(Date.now() + 86_400_000)
    });
    const agent = request.agent(createWebServer());
    await logIn(agent);
    const settingsPage = await agent.get("/account/settings").expect(200);

    await agent
      .post("/problem/test-problem")
      .send({
        password: "correct-password",
        "x-csrf-token": extractCsrfToken(settingsPage.text)
      })
      .expect(302)
      .expect("Location", "/problemset");

    assert.equal(await Submission.countDocuments(), 0);
  });

  it("rejects an invalid CSRF token", async () => {
    await createTestUser();
    await createTestProblem();
    const agent = request.agent(createWebServer());
    await logIn(agent);

    await agent
      .post("/problem/test-problem")
      .send({ password: "correct-password", "x-csrf-token": "invalid" })
      .expect(403);

    assert.equal(await Submission.countDocuments(), 0);
  });
});
