import assert from "node:assert";
import * as cheerio from "cheerio";
import request from "supertest";
import { createWebServer } from "../../src/server";
import { Problem } from "../../src/server/models/Problem";
import { User } from "../../src/server/models/User";
import { Types } from "mongoose";
const bcrypt = require("bcrypt");

type CorrectAnswer = {
  problemID: string;
  timestamp: Date;
};

type CreateUserOptions = {
  username?: string;
  password?: string;
  isAdministrator?: boolean;
  correctAnswers?: Array<CorrectAnswer>;
};

type CreateProblemOptions = {
  problemName?: string;
  problemStatement?: string;
  problemID?: string;
  correctPassword?: string;
  problemNumber?: number;
  correctAnswers?: Array<{ username: string; timestamp: Date }>;
  releaseDateAndTime?: Date | null;
  hidden?: boolean;
  author?: string | Types.ObjectId;
  difficulty?: number;
  categories?: Array<string>;
};

async function createTestUser(options: CreateUserOptions = {}) {
  const username = options.username ?? "test_user";
  const password = options.password ?? "test_password";

  return await User.create({
    username,
    lowercasedUsername: username.toLowerCase(),
    passwordHash: await bcrypt.hash(password, 4),
    correctAnswers: options.correctAnswers ?? [],
    tokens: [],
    creationDateAndTime: new Date(),
    isAdministrator: options.isAdministrator ?? false,
    isContributor: false
  });
}

async function createTestProblem(options: CreateProblemOptions = {}) {
  const author = await resolveTestUserReference(options.author ?? "test_author");
  const correctAnswers = await Promise.all(
    (options.correctAnswers ?? []).map(async (answer) => ({
      user: await resolveTestUserReference(answer.username),
      timestamp: answer.timestamp
    }))
  );

  const problem = new Problem({
    problemName: options.problemName ?? "Test Problem",
    problemStatement: options.problemStatement ?? "Find the password.",
    problemID: options.problemID ?? "test-problem",
    correctPassword: options.correctPassword ?? "correct-password",
    problemNumber: options.problemNumber ?? 1,
    correctAnswers,
    creationDateAndTime: new Date(),
    hidden: options.hidden ?? false,
    author,
    difficulty: options.difficulty,
    categories: options.categories ?? []
  });

  if (options.releaseDateAndTime !== null) {
    problem.releaseDateAndTime =
      options.releaseDateAndTime ?? new Date(Date.now() - 60_000);
  }

  return await problem.save();
}

async function resolveTestUserReference(usernameOrID: string | Types.ObjectId) {
  if (usernameOrID instanceof Types.ObjectId) {
    return usernameOrID;
  }

  const existing = await User.findOne({ username: usernameOrID });
  if (existing) {
    return existing._id;
  }

  const user = await createTestUser({ username: usernameOrID });
  return user._id;
}

function extractCsrfToken(html: string) {
  const $ = cheerio.load(html);
  const token = $("input[name='x-csrf-token']").val();
  assert.equal(typeof token, "string", "Expected the page to contain a CSRF token");
  return token as string;
}

async function logIn(
  agent: any,
  username = "test_user",
  password = "test_password"
) {
  const loginPage = await agent.get("/login").expect(200);
  const csrfToken = extractCsrfToken(loginPage.text);

  await agent
    .post("/login")
    .send({ username, password, "x-csrf-token": csrfToken })
    .expect(302)
    .expect("Location", "/");
}

async function createAdministratorAgent() {
  await createTestUser({ isAdministrator: true });
  const agent = request.agent(createWebServer());
  await logIn(agent);
  return agent;
}

export {
  createAdministratorAgent,
  createTestProblem,
  createTestUser,
  extractCsrfToken,
  logIn
};
