import assert from "node:assert";
import { describe, it } from "mocha";
import mongoose from "mongoose";
import request from "supertest";
import { createWebServer } from "../../../src/server";
import { Announcement } from "../../../src/server/models/Announcement";
import { Clarification } from "../../../src/server/models/Clarification";
import { Problem } from "../../../src/server/models/Problem";
import {
  createAdministratorAgent,
  createTestProblem,
  createTestUser,
  extractCsrfToken,
  logIn
} from "../helpers";

describe("administrator access", () => {
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

  const protectedPages = [
    "/administrator",
    "/administrator/add-announcement",
    "/administrator/add-problem",
    "/administrator/edit-problem",
    "/administrator/edit-problem/test-problem",
    "/administrator/submissions",
    "/administrator/clarifications"
  ];

  it("redirects anonymous users from every administrator page", async () => {
    const app = createWebServer();

    for (const path of protectedPages) {
      await request(app).get(path).expect(302).expect("Location", "/");
    }
  });

  it("redirects authenticated non-administrators from every administrator page", async () => {
    await createTestUser();
    const agent = request.agent(createWebServer());
    await logIn(agent);

    for (const path of protectedPages) {
      await agent.get(path).expect(302).expect("Location", "/");
    }
  });

  it("allows an administrator to open every management page", async () => {
    const problem = await createTestProblem();
    const participant = await createTestUser({ username: "participant" });
    const clarification = await Clarification.create({
      questionAskedBy: participant._id,
      question: "A question",
      response: null,
      timestampOnAsk: new Date()
    });
    const agent = await createAdministratorAgent();

    const pages = [
      "/administrator",
      "/administrator/add-announcement",
      "/administrator/add-problem",
      "/administrator/edit-problem",
      `/administrator/edit-problem/${problem.problemID}`,
      "/administrator/submissions",
      "/administrator/clarifications",
      `/administrator/clarifications/${clarification._id}`
    ];

    for (const path of pages) {
      await agent.get(path).expect(200);
    }
  });

  it("rejects non-administrator mutations even with a valid CSRF token", async () => {
    const user = await createTestUser();
    await createTestProblem();
    const clarification = await Clarification.create({
      questionAskedBy: user._id,
      question: "Original question",
      response: null,
      timestampOnAsk: new Date()
    });
    const agent = request.agent(createWebServer());
    await logIn(agent);
    const settings = await agent.get("/account/settings").expect(200);
    const csrfToken = extractCsrfToken(settings.text);

    const mutations = [
      () =>
        agent.post("/administrator/add-announcement").send({
          "announcement-title": "Unauthorized",
          "announcement-body": "Unauthorized",
          "x-csrf-token": csrfToken
        }),
      () =>
        agent.post("/administrator/add-problem").send({
          ...validProblemPayload("unauthorized-problem"),
          "x-csrf-token": csrfToken
        }),
      () =>
        agent.post("/administrator/edit-problem/test-problem").send({
          ...validEditPayload(),
          "x-csrf-token": csrfToken
        }),
      () =>
        agent
          .post(`/administrator/clarifications/${clarification._id}`)
          .send({
            response: "Unauthorized answer",
            "x-csrf-token": csrfToken
          })
    ];

    for (const mutation of mutations) {
      await mutation().expect(302).expect("Location", "/");
    }

    assert.equal(await Announcement.countDocuments(), 0);
    assert.equal(
      await Problem.countDocuments({ problemID: "unauthorized-problem" }),
      0
    );
    const problem = await Problem.findOne({ problemID: "test-problem" }).lean();
    assert.equal(problem?.problemName, "Test Problem");
    const unchangedClarification = await Clarification.findById(
      clarification._id
    ).lean();
    assert.equal(unchangedClarification?.response, null);
  });
});

function validProblemPayload(problemID: string) {
  return {
    "problem-name": "New Problem",
    "problem-statement": "Find the password.",
    "problem-id": problemID,
    "correct-password": "answer",
    "problem-number": "10",
    "problem-release-timestamp": Date.now().toString()
  };
}

function validEditPayload() {
  return {
    "problem-name": "Edited Problem",
    "problem-statement": "Edited statement",
    "correct-password": "edited-answer",
    "problem-release-timestamp": Date.now().toString()
  };
}
