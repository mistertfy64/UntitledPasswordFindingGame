import assert from "node:assert";
import { describe, it } from "mocha";
import * as cheerio from "cheerio";
import mongoose from "mongoose";
import { Clarification } from "../../../src/server/models/Clarification";
import { Submission } from "../../../src/server/models/Submission";
import { User } from "../../../src/server/models/User";
import {
  createAdministratorAgent,
  createTestProblem,
  createTestUser,
  extractCsrfToken
} from "../helpers";

describe("administrator review queues", () => {
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

  describe("submissions", () => {
    it("shows newest submissions first and paginates them", async () => {
      await createSubmissions([
        submission("alice", "problem-a", 1),
        submission("bob", "problem-b", 2),
        submission("carol", "problem-c", 3)
      ]);
      const agent = await createAdministratorAgent();

      const firstPage = await agent
        .get("/administrator/submissions?page=1&amount=2")
        .expect(200);
      const secondPage = await agent
        .get("/administrator/submissions?page=2&amount=2")
        .expect(200);

      assert.deepEqual(submissionAnswers(firstPage.text), [
        "answer-3",
        "answer-2"
      ]);
      assert.deepEqual(submissionAnswers(secondPage.text), ["answer-1"]);
      assert.match(firstPage.text, /Showing 2 selected submissions/);
      assert.match(secondPage.text, /Page 2/);
    });

    it("caps the amount at 100 and clamps the page to one", async () => {
      const agent = await createAdministratorAgent();

      const response = await agent
        .get("/administrator/submissions?page=-5&amount=1000")
        .expect(200);

      assert.match(response.text, /Page 1/);
      assert.match(response.text, /amount=100/);
    });

    it("filters submissions by problem ID and username", async () => {
      await createSubmissions([
        submission("alice", "target-problem", 1),
        submission("bob", "target-problem", 2),
        submission("alice", "other-problem", 3)
      ]);
      const agent = await createAdministratorAgent();

      const byProblem = await agent
        .get("/administrator/submissions/problem/target-problem")
        .expect(200);
      const byUsername = await agent
        .get("/administrator/submissions/username/alice")
        .expect(200);

      assert.deepEqual(submissionAnswers(byProblem.text), [
        "answer-2",
        "answer-1"
      ]);
      assert.deepEqual(submissionAnswers(byUsername.text), [
        "answer-3",
        "answer-1"
      ]);
    });

    it("renders correct, wrong, and ignored verdicts", async () => {
      await createSubmissions([
        { ...submission("alice", "problem-a", 1), verdict: "correct answer" },
        { ...submission("bob", "problem-b", 2), verdict: "wrong answer" },
        { ...submission("carol", "problem-c", 3), verdict: "ignored" }
      ]);
      const agent = await createAdministratorAgent();

      const response = await agent.get("/administrator/submissions").expect(200);

      assert.match(response.text, /CORRECT ANSWER/);
      assert.match(response.text, /WRONG ANSWER/);
      assert.match(response.text, /IGNORED/);
    });
  });

  describe("clarifications", () => {
    it("shows only unanswered clarifications in newest-first order", async () => {
      await Clarification.create(
        await Promise.all([
          clarification("old unanswered", 1),
          clarification("already answered", 2, "An answer"),
          clarification("new unanswered", 3)
        ])
      );
      const agent = await createAdministratorAgent();

      const response = await agent
        .get("/administrator/clarifications")
        .expect(200);

      assert.doesNotMatch(response.text, /already answered/);
      assert.ok(
        response.text.indexOf("new unanswered") <
          response.text.indexOf("old unanswered")
      );
    });

    it("paginates unanswered clarifications", async () => {
      await Clarification.create(
        await Promise.all([
          clarification("old question", 1),
          clarification("middle question", 2),
          clarification("new question", 3)
        ])
      );
      const agent = await createAdministratorAgent();

      const response = await agent
        .get("/administrator/clarifications?page=2&amount=1")
        .expect(200);

      assert.match(response.text, /middle question/);
      assert.doesNotMatch(response.text, /new question/);
      assert.doesNotMatch(response.text, /old question/);
      assert.match(response.text, /Page 2/);
    });

    it("renders existing and nonexistent clarification detail states", async () => {
      const existing = await Clarification.create(
        await clarification("Can I have a hint?", 1)
      );
      const missingID = new mongoose.Types.ObjectId();
      const agent = await createAdministratorAgent();

      const existingResponse = await agent
        .get(`/administrator/clarifications/${existing._id}`)
        .expect(200);
      const missingResponse = await agent
        .get(`/administrator/clarifications/${missingID}`)
        .expect(200);

      assert.match(existingResponse.text, /Can I have a hint/);
      assert.match(existingResponse.text, new RegExp(existing._id.toString()));
      assert.match(
        missingResponse.text,
        /Unable to find clarification with this ID/
      );
    });

    it("records a response, administrator identity, and answer timestamp", async () => {
      const item = await Clarification.create(
        await clarification("What is the format?", 1)
      );
      const agent = await createAdministratorAgent();
      const page = await agent
        .get(`/administrator/clarifications/${item._id}`)
        .expect(200);

      await agent
        .post(`/administrator/clarifications/${item._id}`)
        .send({
          response: "Use lowercase letters.",
          "x-csrf-token": extractCsrfToken(page.text)
        })
        .expect(302)
        .expect("Location", "/administrator/clarifications");

      const answered = await Clarification.findById(item._id).lean();
      const administrator = await User.findOne({
        username: "test_user"
      });
      assert.equal(answered?.response, "Use lowercase letters.");
      assert.equal(
        answered?.responseAnsweredBy?.toString(),
        administrator?._id.toString()
      );
      assert.ok(answered?.timestampOnAnswer instanceof Date);
    });

    it("rejects wrong-type and oversized responses without mutation", async () => {
      const item = await Clarification.create(
        await clarification("What is the format?", 1)
      );
      const agent = await createAdministratorAgent();
      const page = await agent
        .get(`/administrator/clarifications/${item._id}`)
        .expect(200);
      const csrfToken = extractCsrfToken(page.text);

      await agent
        .post(`/administrator/clarifications/${item._id}`)
        .send({ response: { invalid: true }, "x-csrf-token": csrfToken })
        .expect(302)
        .expect("Location", `/administrator/clarifications/${item._id}`);
      await agent
        .post(`/administrator/clarifications/${item._id}`)
        .send({ response: "x".repeat(1025), "x-csrf-token": csrfToken })
        .expect(302)
        .expect("Location", `/administrator/clarifications/${item._id}`);

      const unchanged = await Clarification.findById(item._id).lean();
      assert.equal(unchanged?.response, null);
      assert.equal(unchanged?.responseAnsweredBy, null);
      assert.equal(unchanged?.timestampOnAnswer, null);
    });

    it("redirects nonexistent responses and rejects invalid CSRF", async () => {
      const item = await Clarification.create(
        await clarification("What is the format?", 1)
      );
      const missingID = new mongoose.Types.ObjectId();
      const agent = await createAdministratorAgent();
      const page = await agent
        .get(`/administrator/clarifications/${item._id}`)
        .expect(200);
      const csrfToken = extractCsrfToken(page.text);

      await agent
        .post(`/administrator/clarifications/${missingID}`)
        .send({ response: "An answer", "x-csrf-token": csrfToken })
        .expect(302)
        .expect("Location", "/administrator/clarifications");
      await agent
        .post(`/administrator/clarifications/${item._id}`)
        .send({ response: "An answer", "x-csrf-token": "invalid" })
        .expect(403);

      const unchanged = await Clarification.findById(item._id).lean();
      assert.equal(unchanged?.response, null);
    });
  });
});

function submission(username: string, problemID: string, minute: number) {
  return {
    username,
    answer: `answer-${minute}`,
    verdict: "wrong answer",
    problemNumber: minute,
    problemID,
    timestamp: new Date(2025, 0, 1, 0, minute)
  };
}

async function createSubmissions(
  submissions: Array<ReturnType<typeof submission>>
) {
  const users = new Map<string, mongoose.Types.ObjectId>();
  const problems = new Map<string, mongoose.Types.ObjectId>();

  for (const entry of submissions) {
    if (!users.has(entry.username)) {
      users.set(
        entry.username,
        (await createTestUser({ username: entry.username }))._id
      );
    }
    if (!problems.has(entry.problemID)) {
      problems.set(
        entry.problemID,
        (await createTestProblem({ problemID: entry.problemID }))._id
      );
    }
  }

  return await Submission.create(
    submissions.map((entry) => ({
      user: users.get(entry.username),
      problem: problems.get(entry.problemID),
      answer: entry.answer,
      verdict: entry.verdict,
      timestamp: entry.timestamp
    }))
  );
}

async function clarification(question: string, minute: number, response?: string) {
  let participant = await User.findOne({
    username: "participant"
  });
  participant ??= await createTestUser({ username: "participant" });

  let previousAdministrator = null;
  if (response) {
    previousAdministrator = await User.findOne({
      username: "previous-admin"
    });
    previousAdministrator ??= await createTestUser({
      username: "previous-admin"
    });
  }

  return {
    questionAskedBy: participant._id,
    question,
    response: response ?? null,
    responseAnsweredBy: previousAdministrator?._id ?? null,
    timestampOnAsk: new Date(2025, 0, 1, 0, minute),
    timestampOnAnswer: response ? new Date(2025, 0, 1, 1, minute) : null
  };
}

function submissionAnswers(html: string) {
  const $ = cheerio.load(html);
  return $("#submissions-table tr")
    .slice(1)
    .map((_, row) => $(row).find("td").eq(3).text().trim())
    .get()
    .filter((answer) => answer.length > 0);
}
