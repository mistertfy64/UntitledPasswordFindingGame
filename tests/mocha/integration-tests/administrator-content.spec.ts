import assert from "node:assert";
import { describe, it } from "mocha";
import mongoose from "mongoose";
import { Announcement } from "../../../src/server/models/Announcement";
import { Problem } from "../../../src/server/models/Problem";
import {
  createAdministratorAgent,
  createTestProblem,
  extractCsrfToken
} from "../helpers";

describe("administrator content management", () => {
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

  describe("announcements", () => {
    it("creates an announcement and records the administrator as author", async () => {
      const agent = await createAdministratorAgent();
      const page = await agent
        .get("/administrator/add-announcement")
        .expect(200);

      await agent
        .post("/administrator/add-announcement")
        .send({
          "announcement-title": "Contest Update",
          "announcement-body": "The contest starts **soon**.",
          "x-csrf-token": extractCsrfToken(page.text)
        })
        .expect(302)
        .expect("Location", "/");

      const announcement = await Announcement.findOne({}).lean();
      assert.equal(announcement?.title, "Contest Update");
      assert.equal(announcement?.body, "The contest starts **soon**.");
      assert.equal(announcement?.author, "test_user");
      assert.ok(announcement?.creationDateAndTime instanceof Date);
    });

    it("rejects empty and oversized announcement fields", async () => {
      const agent = await createAdministratorAgent();
      const page = await agent
        .get("/administrator/add-announcement")
        .expect(200);
      const csrfToken = extractCsrfToken(page.text);
      const invalidAnnouncements = [
        { title: "", body: "Body" },
        { title: "   ", body: "Body" },
        { title: "x".repeat(129), body: "Body" },
        { title: "Title", body: "" },
        { title: "Title", body: "x".repeat(16_001) }
      ];

      for (const invalid of invalidAnnouncements) {
        const response = await agent
          .post("/administrator/add-announcement")
          .send({
            "announcement-title": invalid.title,
            "announcement-body": invalid.body,
            "x-csrf-token": csrfToken
          })
          .expect(200);

        assert.match(response.text, /message--error/);
      }

      assert.equal(await Announcement.countDocuments(), 0);
    });

    it("rejects an invalid CSRF token without creating an announcement", async () => {
      const agent = await createAdministratorAgent();

      await agent
        .post("/administrator/add-announcement")
        .send({
          "announcement-title": "Unauthorized",
          "announcement-body": "No CSRF token",
          "x-csrf-token": "invalid"
        })
        .expect(403);

      assert.equal(await Announcement.countDocuments(), 0);
    });
  });

  describe("adding problems", () => {
    it("creates a problem with all optional fields", async () => {
      const agent = await createAdministratorAgent();
      const page = await agent.get("/administrator/add-problem").expect(200);
      const releaseTimestamp = Date.now() + 60_000;

      await agent
        .post("/administrator/add-problem")
        .send({
          ...validProblemPayload("new-problem"),
          "problem-author": "Guest Author",
          "problem-difficulty": "8",
          "problem-categories": "web,cryptography",
          "problem-hidden": "on",
          "problem-release-timestamp": releaseTimestamp.toString(),
          "x-csrf-token": extractCsrfToken(page.text)
        })
        .expect(302)
        .expect("Location", "/problem/new-problem");

      const problem = await Problem.findOne({ problemID: "new-problem" }).lean();
      assert.equal(problem?.problemName, "New Problem");
      assert.equal(problem?.problemStatement, "Find the password.");
      assert.equal(problem?.correctPassword, "answer");
      assert.equal(problem?.problemNumber, 10);
      assert.equal(problem?.author, "Guest Author");
      assert.equal(problem?.difficulty, 8);
      assert.deepEqual(problem?.categories, ["web", "cryptography"]);
      assert.equal(problem?.hidden, true);
      assert.equal(problem?.releaseDateAndTime.getTime(), releaseTimestamp);
      assert.deepEqual(problem?.correctAnswers, []);
    });

    it("uses the administrator as author when no author is supplied", async () => {
      const agent = await createAdministratorAgent();
      const page = await agent.get("/administrator/add-problem").expect(200);

      await agent
        .post("/administrator/add-problem")
        .send({
          ...validProblemPayload("self-authored"),
          "problem-author": "",
          "x-csrf-token": extractCsrfToken(page.text)
        })
        .expect(302);

      const problem = await Problem.findOne({
        problemID: "self-authored"
      }).lean();
      assert.equal(problem?.author, "test_user");
      assert.equal(problem?.hidden, false);
      assert.deepEqual(problem?.categories, []);
    });

    it("rejects duplicate, missing, oversized, and invalid numeric fields", async () => {
      await createTestProblem({ problemID: "duplicate-problem" });
      const agent = await createAdministratorAgent();
      const page = await agent.get("/administrator/add-problem").expect(200);
      const csrfToken = extractCsrfToken(page.text);
      const invalidProblems = [
        validProblemPayload("duplicate-problem"),
        { ...validProblemPayload("missing-name"), "problem-name": "" },
        {
          ...validProblemPayload("oversized-name"),
          "problem-name": "x".repeat(129)
        },
        {
          ...validProblemPayload("oversized-statement"),
          "problem-statement": "x".repeat(16_001)
        },
        {
          ...validProblemPayload("oversized-answer"),
          "correct-password": "x".repeat(65)
        },
        {
          ...validProblemPayload("invalid-number"),
          "problem-number": "not-a-number"
        },
        {
          ...validProblemPayload("invalid-release"),
          "problem-release-timestamp": "not-a-timestamp"
        },
        {
          ...validProblemPayload("invalid-difficulty"),
          "problem-difficulty": "1.5"
        }
      ];

      for (const invalid of invalidProblems) {
        const response = await agent
          .post("/administrator/add-problem")
          .send({ ...invalid, "x-csrf-token": csrfToken })
          .expect(200);

        assert.match(response.text, /message--error/);
      }

      assert.equal(await Problem.countDocuments(), 1);
    });

    it("rejects invalid CSRF without creating a problem", async () => {
      const agent = await createAdministratorAgent();

      await agent
        .post("/administrator/add-problem")
        .send({
          ...validProblemPayload("csrf-problem"),
          "x-csrf-token": "invalid"
        })
        .expect(403);

      assert.equal(await Problem.countDocuments(), 0);
    });
  });

  describe("editing problems", () => {
    it("prefills the edit form with the existing problem", async () => {
      await createTestProblem({
        problemName: "Existing Problem",
        correctPassword: "existing-answer",
        difficulty: 4,
        categories: ["logic", "web"],
        hidden: true
      });
      const agent = await createAdministratorAgent();

      const response = await agent
        .get("/administrator/edit-problem/test-problem")
        .expect(200);

      assert.match(response.text, /value="Existing Problem"/);
      assert.match(response.text, /value="existing-answer"/);
      assert.match(response.text, /value="4"/);
      assert.match(response.text, /value="logic,web"/);
      assert.match(response.text, /name="problem-hidden" checked/);
    });

    it("persists mutable fields while retaining the problem ID and number", async () => {
      await createTestProblem({ problemNumber: 27 });
      const agent = await createAdministratorAgent();
      const page = await agent
        .get("/administrator/edit-problem/test-problem")
        .expect(200);
      const releaseTimestamp = Date.now() + 120_000;

      await agent
        .post("/administrator/edit-problem/test-problem")
        .send({
          ...validEditPayload(),
          "problem-author": "New Author",
          "problem-difficulty": "9",
          "problem-categories": "osint,web",
          "problem-hidden": true,
          "problem-release-timestamp": releaseTimestamp.toString(),
          "x-csrf-token": extractCsrfToken(page.text)
        })
        .expect(302)
        .expect("Location", "/problem/test-problem");

      const problem = await Problem.findOne({ problemID: "test-problem" }).lean();
      assert.equal(problem?.problemID, "test-problem");
      assert.equal(problem?.problemNumber, 27);
      assert.equal(problem?.problemName, "Edited Problem");
      assert.equal(problem?.problemStatement, "Edited statement");
      assert.equal(problem?.correctPassword, "edited-answer");
      assert.equal(problem?.author, "New Author");
      assert.equal(problem?.difficulty, 9);
      assert.deepEqual(problem?.categories, ["osint", "web"]);
      assert.equal(problem?.hidden, true);
      assert.equal(problem?.releaseDateAndTime.getTime(), releaseTimestamp);
    });

    it("leaves the problem unchanged when edit validation fails", async () => {
      await createTestProblem();
      const agent = await createAdministratorAgent();
      const page = await agent
        .get("/administrator/edit-problem/test-problem")
        .expect(200);

      const response = await agent
        .post("/administrator/edit-problem/test-problem")
        .send({
          ...validEditPayload(),
          "problem-difficulty": "invalid",
          "x-csrf-token": extractCsrfToken(page.text)
        })
        .expect(200);

      assert.match(response.text, /Problem difficulty isn&#39;t an integer/);
      const problem = await Problem.findOne({ problemID: "test-problem" }).lean();
      assert.equal(problem?.problemName, "Test Problem");
      assert.equal(problem?.correctPassword, "correct-password");
    });

    it("redirects missing problems and rejects invalid CSRF", async () => {
      await createTestProblem();
      const agent = await createAdministratorAgent();

      await agent
        .get("/administrator/edit-problem/does-not-exist")
        .expect(302)
        .expect("Location", "/administrator");
      await agent
        .post("/administrator/edit-problem/test-problem")
        .send({ ...validEditPayload(), "x-csrf-token": "invalid" })
        .expect(403);

      const problem = await Problem.findOne({ problemID: "test-problem" }).lean();
      assert.equal(problem?.problemName, "Test Problem");
    });
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
