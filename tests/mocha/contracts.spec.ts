import assert from "node:assert";
import { describe, it } from "mocha";
import mongoose from "mongoose";
import { Problem } from "../../src/server/models/Problem";
import { Submission } from "../../src/server/models/Submission";
import { User } from "../../src/server/models/User";
import { isAuthenticated } from "../../src/server/utilities/authentication";
import { sha384 } from "../../src/server/utilities/hashing";
import { createTestProblem, createTestUser } from "./helpers";

describe("utility and model contracts", () => {
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

  describe("sha384", () => {
    it("matches the published SHA-384 digest for abc", async () => {
      assert.equal(
        await sha384("abc"),
        "cb00753f45a35e8bb5a03d699ac65007272c32ab0eded1631a8b605a43ff5bed" +
          "8086072ba1e7cc2358baeca134c825a7"
      );
    });

    it("hashes Unicode input deterministically", async () => {
      const first = await sha384("รหัสผ่าน 🔐");
      const second = await sha384("รหัสผ่าน 🔐");

      assert.equal(first, second);
      assert.equal(first.length, 96);
      assert.match(first, /^[a-f0-9]+$/);
    });
  });

  describe("isAuthenticated", () => {
    it("rejects missing credentials without querying a user", async () => {
      assert.equal((await isAuthenticated("", "token")).ok, false);
      assert.equal((await isAuthenticated("test_user", "")).ok, false);
    });

    it("rejects unknown users and incorrect tokens", async () => {
      assert.equal(
        (await isAuthenticated("unknown-user", "some-token")).ok,
        false
      );

      const user = await createTestUser();
      await user.addToken("correct-token");

      assert.equal(
        (await isAuthenticated("test_user", "incorrect-token")).ok,
        false
      );
    });

    it("returns identity, role, and solve statistics for a valid token", async () => {
      const solvedAt = new Date();
      const user = await createTestUser({
        isAdministrator: true,
        correctAnswers: [{ problemID: "solved-problem", timestamp: solvedAt }]
      });
      await user.addToken("correct-token");

      const result = await isAuthenticated("test_user", "correct-token");

      assert.equal(result.ok, true);
      assert.equal(result.username, "test_user");
      assert.equal(result.isAdministrator, true);
      assert.equal(result.statistics.correctAnswers.length, 1);
      assert.equal(
        result.statistics.correctAnswers[0].problemID,
        "solved-problem"
      );
    });
  });

  describe("safe user queries", () => {
    it("excludes secrets and only includes email when requested", async () => {
      const user = await createTestUser();
      user.email = "test@example.com";
      await user.addToken("secret-token");
      await user.save();

      const publicUser = await User.safeFindByUsername("test_user");
      const accountSettingsUser =
        await User.safeFindByUsernameWithEmail("test_user");
      const publicObject = publicUser!.toObject() as Record<string, unknown>;
      const settingsObject = accountSettingsUser!.toObject() as Record<
        string,
        unknown
      >;

      assert.equal("passwordHash" in publicObject, false);
      assert.equal("tokens" in publicObject, false);
      assert.equal("email" in publicObject, false);
      assert.equal("passwordHash" in settingsObject, false);
      assert.equal("tokens" in settingsObject, false);
      assert.equal(settingsObject.email, "test@example.com");
    });
  });

  describe("problem queries", () => {
    it("hides the correct password unless it is explicitly requested", async () => {
      await createTestProblem({ correctPassword: "classified" });

      const hidden = await Problem.findProblemWithProblemID("test-problem");
      const visible = await Problem.findProblemWithProblemID(
        "test-problem",
        true
      );

      assert.equal("correctPassword" in hidden, false);
      assert.equal(visible.correctPassword, "classified");
    });
  });

  describe("submission queries", () => {
    it("orders, filters, and paginates submissions", async () => {
      const [alice, bob] = await Promise.all([
        createTestUser({ username: "alice" }),
        createTestUser({ username: "bob" })
      ]);
      const [firstProblem, secondProblem] = await Promise.all([
        createTestProblem({ problemID: "first-problem" }),
        createTestProblem({ problemID: "second-problem" })
      ]);
      await Submission.create([
        submission(alice._id, firstProblem._id, 1),
        submission(bob._id, firstProblem._id, 2),
        submission(alice._id, secondProblem._id, 3),
        submission(alice._id, firstProblem._id, 4)
      ]);

      const newestPage = await Submission.getAccordingToQuery(1, 2);
      const oldestPage = await Submission.getAccordingToQuery(2, 2, true);
      const problemSubmissions =
        await Submission.getByProblemIDAccordingToQuery("first-problem", 1, 10);
      const userSubmissions = await Submission.getByUsernameAccordingToQuery(
        "alice",
        1,
        10,
        true
      );

      assert.deepEqual(
        newestPage.map((entry) => entry.answer),
        ["answer-4", "answer-3"]
      );
      assert.deepEqual(
        oldestPage.map((entry) => entry.answer),
        ["answer-3", "answer-4"]
      );
      assert.deepEqual(
        problemSubmissions.map((entry) => entry.answer),
        ["answer-4", "answer-2", "answer-1"]
      );
      assert.deepEqual(
        userSubmissions.map((entry) => entry.answer),
        ["answer-1", "answer-3", "answer-4"]
      );
    });
  });
});

function submission(
  user: mongoose.Types.ObjectId,
  problem: mongoose.Types.ObjectId,
  minute: number
) {
  return {
    user,
    problem,
    answer: `answer-${minute}`,
    verdict: "wrong answer",
    timestamp: new Date(2025, 0, 1, 0, minute)
  };
}
