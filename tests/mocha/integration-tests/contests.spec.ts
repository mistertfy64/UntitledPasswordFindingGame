import assert from "node:assert";
import { describe, it } from "mocha";
import * as cheerio from "cheerio";
import mongoose from "mongoose";
import request from "supertest";
import { createWebServer } from "../../../src/server";
import { Contest } from "../../../src/server/models/Contest";
import { Submission } from "../../../src/server/models/Submission";
import {
  createTestProblem,
  createTestUser,
  logIn
} from "../helpers";

describe("/contests", () => {
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

  it("renders the empty contest state", async () => {
    const response = await request(createWebServer()).get("/contests").expect(200);

    assert.match(response.text, /No contests have been held yet/);
  });

  it("lists contests with their IDs, names, and schedule", async () => {
    const start = new Date("2025-01-01T00:00:00.000Z");
    const end = new Date("2025-01-01T01:00:00.000Z");
    await createContest({
      contestID: "winter-contest",
      contestName: "Winter Contest",
      start,
      end
    });

    const response = await request(createWebServer()).get("/contests").expect(200);

    assert.match(response.text, /winter-contest/);
    assert.match(response.text, /Winter Contest/);
    assert.match(response.text, new RegExp(start.toISOString()));
    assert.match(response.text, new RegExp(end.toISOString()));
    assert.match(response.text, /href="\/contests\/winter-contest"/);
  });

  it("redirects invalid and nonexistent contest IDs", async () => {
    const app = createWebServer();

    await request(app)
      .get("/contests/x")
      .expect(302)
      .expect("Location", "/contests");
    await request(app)
      .get("/contests/invalid!id")
      .expect(302)
      .expect("Location", "/contests");
    await request(app)
      .get("/contests/does-not-exist")
      .expect(302)
      .expect("Location", "/contests");
  });

  it("hides problems and leaderboards before a contest starts", async () => {
    const start = new Date(Date.now() + 60_000);
    const end = new Date(Date.now() + 120_000);
    const problem = await createTestProblem({ problemID: "contest-problem" });
    await createContest({
      start,
      end,
      problems: [{ problem: problem._id, maximumPoints: 100 }]
    });

    const response = await request(createWebServer())
      .get("/contests/test-contest")
      .expect(200);

    assert.match(response.text, /This contest hasn't started yet/);
    assert.doesNotMatch(response.text, /Contest Problems/);
    assert.doesNotMatch(response.text, /Contest Leaderboards/);
    assert.doesNotMatch(response.text, /contest-problem/);
  });

  it("shows only contest problems and marks an authenticated solve", async () => {
    const start = new Date(Date.now() - 60_000);
    const end = new Date(Date.now() + 60_000);
    const user = await createTestUser();
    const includedProblem = await createTestProblem({
      problemID: "included-problem",
      problemName: "Included Problem",
      correctAnswers: [{ username: "test_user", timestamp: new Date() }]
    });
    await user.addCorrectAnswer(includedProblem._id, new Date());
    await createTestProblem({
      problemID: "unrelated-problem",
      problemName: "Unrelated Problem",
      problemNumber: 2
    });
    await createContest({
      start,
      end,
      problems: [{ problem: includedProblem._id, maximumPoints: 100 }]
    });
    const agent = request.agent(createWebServer());
    await logIn(agent);

    const response = await agent.get("/contests/test-contest").expect(200);
    const $ = cheerio.load(response.text);
    const includedRow = $("a[href='/problem/included-problem']").closest("tr");

    assert.match(response.text, /Included Problem/);
    assert.doesNotMatch(response.text, /Unrelated Problem/);
    assert.equal(includedRow.hasClass("cell--solved"), true);
    assert.equal(includedRow.find("td").last().text().trim(), "1");
  });

  it("calculates penalties, minimum scores, and leaderboard order", async () => {
    const start = new Date(Date.now() - 60 * 60_000);
    const end = new Date(Date.now() + 60 * 60_000);
    const problemOne = await createTestProblem({
      problemID: "problem-one",
      problemNumber: 1
    });
    const problemTwo = await createTestProblem({
      problemID: "problem-two",
      problemNumber: 2
    });
    const otherProblem = await createTestProblem({ problemID: "other-problem" });
    const users = new Map(
      await Promise.all(
        ["alice", "bob", "charlie", "outsider", "too-early", "too-late"].map(
          async (username) => [
            username,
            (await createTestUser({ username }))._id
          ] as const
        )
      )
    );
    await createContest({
      start,
      end,
      problems: [
        { problem: problemOne._id, maximumPoints: 100 },
        { problem: problemTwo._id, maximumPoints: 60 }
      ],
      rules: {
        pointsLostPer: {
          interval: 10 * 60_000,
          intervalAmount: 10,
          wrongAnswers: 1,
          wrongAnswersAmount: 5
        },
        minimumPointsPerProblem: 20
      }
    });
    await Submission.create([
      contestSubmission(
        users.get("alice")!,
        problemOne._id,
        "wrong answer",
        at(start, 5)
      ),
      contestSubmission(
        users.get("alice")!,
        problemOne._id,
        "correct answer",
        at(start, 25)
      ),
      contestSubmission(
        users.get("alice")!,
        problemOne._id,
        "wrong answer",
        at(start, 30)
      ),
      contestSubmission(
        users.get("bob")!,
        problemOne._id,
        "correct answer",
        at(start, 55)
      ),
      contestSubmission(
        users.get("bob")!,
        problemTwo._id,
        "correct answer",
        at(start, 59)
      ),
      contestSubmission(
        users.get("charlie")!,
        problemOne._id,
        "wrong answer",
        at(start, 10)
      ),
      contestSubmission(
        users.get("outsider")!,
        otherProblem._id,
        "correct answer",
        at(start, 5)
      ),
      contestSubmission(
        users.get("too-early")!,
        problemOne._id,
        "correct answer",
        new Date(start.getTime() - 1)
      ),
      contestSubmission(
        users.get("too-late")!,
        problemOne._id,
        "correct answer",
        new Date(end.getTime() + 1)
      )
    ]);

    const response = await request(createWebServer())
      .get("/contests/test-contest")
      .expect(200);
    const $ = cheerio.load(response.text);
    const rows = $("#contest-leaderboards tr").slice(1);

    assert.equal(rows.eq(0).find("td").eq(1).text().trim(), "alice");
    assert.equal(rows.eq(0).find("td").eq(2).text().trim(), "75");
    assert.equal(rows.eq(0).find("td").eq(3).text().trim(), "75");
    assert.match(
      rows.eq(0).find("td").eq(3).find("span").attr("title") ?? "",
      /1500000 milliseconds and 1 wrong answer/
    );

    assert.equal(rows.eq(1).find("td").eq(1).text().trim(), "bob");
    assert.equal(rows.eq(1).find("td").eq(2).text().trim(), "70");
    assert.equal(rows.eq(1).find("td").eq(3).text().trim(), "50");
    assert.equal(rows.eq(1).find("td").eq(4).text().trim(), "20");

    assert.equal(rows.eq(2).find("td").eq(1).text().trim(), "charlie");
    assert.equal(rows.eq(2).find("td").eq(2).text().trim(), "0");
    assert.equal(rows.eq(2).find("td").eq(3).text().trim(), "-1");
    assert.doesNotMatch(response.text, /outsider|too-early|too-late/);
  });

  it("labels ended contests and ignores submissions outside the contest window", async () => {
    const start = new Date(Date.now() - 120_000);
    const end = new Date(Date.now() - 60_000);
    const problem = await createTestProblem({ problemID: "contest-problem" });
    const user = await createTestUser({ username: "late-user" });
    await createContest({
      start,
      end,
      problems: [{ problem: problem._id, maximumPoints: 100 }]
    });
    await Submission.create(
      contestSubmission(
        user._id,
        problem._id,
        "correct answer",
        new Date(end.getTime() + 1)
      )
    );

    const response = await request(createWebServer())
      .get("/contests/test-contest")
      .expect(200);

    assert.match(response.text, /This contest has ended/);
    assert.match(response.text, /No submissions have been made yet/);
    assert.doesNotMatch(response.text, /late-user/);
  });
});

type ContestOptions = {
  contestID?: string;
  contestName?: string;
  start?: Date;
  end?: Date;
  problems?: Array<{ problem: mongoose.Types.ObjectId; maximumPoints: number }>;
  rules?: {
    pointsLostPer: {
      interval: number;
      intervalAmount: number;
      wrongAnswers: number;
      wrongAnswersAmount: number;
    };
    minimumPointsPerProblem: number;
  };
};

async function createContest(options: ContestOptions = {}) {
  return await Contest.create({
    contestID: options.contestID ?? "test-contest",
    contestName: options.contestName ?? "Test Contest",
    startDateAndTime: options.start ?? new Date(Date.now() - 60_000),
    endDateAndTime: options.end ?? new Date(Date.now() + 60_000),
    rules: options.rules ?? {
      pointsLostPer: {
        interval: 60_000,
        intervalAmount: 1,
        wrongAnswers: 1,
        wrongAnswersAmount: 1
      },
      minimumPointsPerProblem: 10
    },
    participants: [],
    problems: options.problems ?? [],
    timestamp: new Date()
  });
}

function contestSubmission(
  user: mongoose.Types.ObjectId,
  problem: mongoose.Types.ObjectId,
  verdict: "correct answer" | "wrong answer",
  timestamp: Date
) {
  return {
    user,
    problem,
    answer: "submitted-answer",
    verdict,
    timestamp
  };
}

function at(start: Date, minutes: number) {
  return new Date(start.getTime() + minutes * 60_000);
}
