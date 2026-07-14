import { describe, it } from "mocha";
import assert from "node:assert";
import * as cheerio from "cheerio";
import mongoose from "mongoose";
import request from "supertest";
import { createWebServer } from "../../../src/server";
import {
  createTestProblem,
  createTestUser,
  logIn
} from "../helpers";

describe("/problemset", () => {
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

  it("shows released and unscheduled problems in problem-number order", async () => {
    await createTestProblem({
      problemID: "second-problem",
      problemName: "Second Problem",
      problemNumber: 2
    });
    await createTestProblem({
      problemID: "first-problem",
      problemName: "First Problem",
      problemNumber: 1,
      releaseDateAndTime: null
    });

    const response = await request(createWebServer()).get("/problemset").expect(200);
    const $ = cheerio.load(response.text);
    const problemIDs = $("#problemset tr")
      .slice(1)
      .map((_, row) => $(row).find("td").eq(2).text().trim())
      .get();

    assert.deepEqual(problemIDs, ["first-problem", "second-problem"]);
  });

  it("omits hidden and unreleased problems", async () => {
    await createTestProblem({ problemID: "visible-problem" });
    await createTestProblem({ problemID: "hidden-problem", hidden: true });
    await createTestProblem({
      problemID: "future-problem",
      releaseDateAndTime: new Date(Date.now() + 86_400_000)
    });

    const response = await request(createWebServer()).get("/problemset").expect(200);

    assert.match(response.text, /visible-problem/);
    assert.doesNotMatch(response.text, /hidden-problem/);
    assert.doesNotMatch(response.text, /future-problem/);
  });

  it("shows difficulty when requested", async () => {
    await createTestProblem({ difficulty: 7 });

    const response = await request(createWebServer())
      .get("/problemset?detail=difficulty")
      .expect(200);
    const $ = cheerio.load(response.text);

    assert.equal($("#problemset th").last().text().trim(), "Difficulty");
    assert.equal($("#problemset tr").eq(1).find("td").last().text().trim(), "7");
  });

  it("shows categories when requested", async () => {
    await createTestProblem({ categories: ["web", "cryptography"] });

    const response = await request(createWebServer())
      .get("/problemset?detail=categories")
      .expect(200);
    const $ = cheerio.load(response.text);

    assert.equal($("#problemset th").last().text().trim(), "Categories");
    assert.match($("#problemset tr").eq(1).find("td").last().text(), /web/);
    assert.match(
      $("#problemset tr").eq(1).find("td").last().text(),
      /cryptography/
    );
  });

  it("marks a problem solved for its authenticated solver", async () => {
    const solvedAt = new Date();
    await createTestUser({
      correctAnswers: [{ problemID: "solved-problem", timestamp: solvedAt }]
    });
    await createTestProblem({
      problemID: "solved-problem",
      correctAnswers: [{ username: "test_user", timestamp: solvedAt }]
    });
    const agent = request.agent(createWebServer());
    await logIn(agent);

    const response = await agent.get("/problemset").expect(200);
    const $ = cheerio.load(response.text);
    const row = $("a[href='/problem/solved-problem']").closest("tr");

    assert.equal(row.hasClass("cell--solved"), true);
  });

  it("falls back to solved details for an unsupported detail value", async () => {
    await createTestProblem();

    const response = await request(createWebServer())
      .get("/problemset?detail=unsupported")
      .expect(200);
    const $ = cheerio.load(response.text);

    assert.equal($("#problemset th").last().text().trim(), "Solved");
  });
});
