import assert from "node:assert";
import { describe, it } from "mocha";
import * as cheerio from "cheerio";
import mongoose from "mongoose";
import nock from "nock";
import request from "supertest";
import { createWebServer } from "../../../src/server";
import { Clarification } from "../../../src/server/models/Clarification";
import {
  createTestUser,
  extractCsrfToken,
  logIn
} from "../helpers";

describe("/clarifications", () => {
  let databaseConnection: mongoose.Mongoose;

  before(async () => {
    databaseConnection = await mongoose.connect(process.env.DATABASE_URI ?? "");
  });

  afterEach(async () => {
    nock.cleanAll();
    await databaseConnection.connection.db!.dropDatabase();
  });

  after(async () => {
    await databaseConnection.connection.close();
  });

  it("redirects anonymous users to login", async () => {
    await request(createWebServer())
      .get("/clarifications")
      .expect(302)
      .expect("Location", "/login");
  });

  it("shows only the user's ten newest clarifications", async () => {
    await createTestUser();
    const clarifications = [];
    for (let number = 1; number <= 12; number++) {
      clarifications.push({
        questionAskedBy: "test_user",
        question: `Question ${number}`,
        response: null,
        timestampOnAsk: new Date(2025, 0, 1, 0, number)
      });
    }
    clarifications.push({
      questionAskedBy: "another_user",
      question: "Another user's private question",
      response: null,
      timestampOnAsk: new Date(2025, 0, 1, 1)
    });
    await Clarification.create(clarifications);
    const agent = request.agent(createWebServer());
    await logIn(agent);

    const response = await agent.get("/clarifications").expect(200);

    assert.deepEqual(displayedQuestions(response.text), [
      "Question 12",
      "Question 11",
      "Question 10",
      "Question 9",
      "Question 8",
      "Question 7",
      "Question 6",
      "Question 5",
      "Question 4",
      "Question 3"
    ]);
    assert.doesNotMatch(response.text, /Another user&#39;s private question/);
  });

  it("creates a clarification after successful CAPTCHA validation", async () => {
    await createTestUser();
    const agent = request.agent(createWebServer());
    await logIn(agent);
    const page = await agent.get("/clarifications").expect(200);
    const captcha = successfulCaptcha();

    const response = await agent
      .post("/clarifications")
      .send({
        question: "Could I have a hint?",
        "g-recaptcha-response": "completed-captcha",
        "x-csrf-token": extractCsrfToken(page.text)
      })
      .expect(200);

    assert.equal(captcha.isDone(), true);
    assert.match(response.text, /Could I have a hint/);
    const clarification = await Clarification.findOne({}).lean();
    assert.equal(clarification?.question, "Could I have a hint?");
    assert.equal(clarification?.questionAskedBy, "test_user");
    assert.ok(clarification?.timestampOnAsk instanceof Date);
  });

  it("does not create a clarification when CAPTCHA validation fails", async () => {
    await createTestUser();
    const agent = request.agent(createWebServer());
    await logIn(agent);
    const page = await agent.get("/clarifications").expect(200);
    const captcha = nock("https://www.google.com")
      .post("/recaptcha/api/siteverify")
      .query(true)
      .reply(200, { success: false });

    const response = await agent
      .post("/clarifications")
      .send({
        question: "A valid question",
        "g-recaptcha-response": "incomplete-captcha",
        "x-csrf-token": extractCsrfToken(page.text)
      })
      .expect(200);

    assert.equal(captcha.isDone(), true);
    assert.match(response.text, /CAPTCHA Incomplete/);
    assert.equal(await Clarification.countDocuments(), 0);
  });

  it("rejects wrong-type, empty, and oversized questions", async () => {
    await createTestUser();
    const agent = request.agent(createWebServer());
    await logIn(agent);
    const page = await agent.get("/clarifications").expect(200);
    const csrfToken = extractCsrfToken(page.text);
    const captcha = nock("https://www.google.com")
      .post("/recaptcha/api/siteverify")
      .query(true)
      .times(3)
      .reply(200, { success: true });
    const invalidQuestions = [
      { value: { invalid: true }, diagnostic: /Question type is invalid/ },
      { value: "", diagnostic: /Question should not be empty/ },
      { value: "x".repeat(513), diagnostic: /Question too long/ }
    ];

    for (const invalid of invalidQuestions) {
      const response = await agent
        .post("/clarifications")
        .send({
          question: invalid.value,
          "g-recaptcha-response": "completed-captcha",
          "x-csrf-token": csrfToken
        })
        .expect(200);

      assert.match(response.text, invalid.diagnostic);
    }

    assert.equal(captcha.isDone(), true);
    assert.equal(await Clarification.countDocuments(), 0);
  });

  it("rejects invalid CSRF without creating a clarification", async () => {
    await createTestUser();
    const agent = request.agent(createWebServer());
    await logIn(agent);

    await agent
      .post("/clarifications")
      .send({
        question: "A valid question",
        "g-recaptcha-response": "completed-captcha",
        "x-csrf-token": "invalid"
      })
      .expect(403);

    assert.equal(await Clarification.countDocuments(), 0);
  });
});

function successfulCaptcha() {
  return nock("https://www.google.com")
    .post("/recaptcha/api/siteverify")
    .query(true)
    .reply(200, { success: true });
}

function displayedQuestions(html: string) {
  const $ = cheerio.load(html);
  return $("#previous-clarifications tr")
    .slice(1)
    .map((_, row) => $(row).find("td").eq(2).text().trim())
    .get();
}
