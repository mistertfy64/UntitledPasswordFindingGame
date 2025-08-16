import express from "express";
import { log } from "../../utilities/log";
import { Problem } from "../../models/Problem";
const router = express.Router();
import ExpressMongoSanitize from "express-mongo-sanitize";
import { JSDOM } from "jsdom";
import DOMPurify from "dompurify";

const window = new JSDOM("").window;
const purify = DOMPurify(window);

function authorized(request: express.Request) {
  return request.authentication.ok && request.authentication.isAdministrator;
}

router.get(
  "/administrator/edit-problem",
  async (request: express.Request, response) => {
    if (!authorized(request)) {
      const username = request.authentication?.username ?? "";
      log.warn(`${username} tried to access admin page without permission.`);
      response.redirect("/");
      return;
    }

    response.render(
      "pages/administrator-dashboard/edit-problem-information.ejs",
      {
        authentication: request.authentication,
        csrfToken: request.generatedCSRFToken,
        sessionID: request.sessionID
      }
    );
    return;
  }
);

router.get(
  "/administrator/edit-problem/:problemID",
  async (request: express.Request, response) => {
    if (!authorized(request)) {
      const username = request.authentication?.username ?? "";
      log.warn(`${username} tried to access admin page without permission.`);
      response.redirect("/");
      return;
    }

    response.render("pages/administrator-dashboard/edit-problem.ejs", {
      authentication: request.authentication,
      csrfToken: request.generatedCSRFToken,
      sessionID: request.sessionID,
      diagnosticMessage: ""
    });
    return;
  }
);

router.post(
  "/administrator/edit-problem",
  async (request: express.Request, response) => {
    if (!authorized(request)) {
      const username = request.authentication?.username ?? "";
      log.warn(`${username} tried to access admin page without permission.`);
      response.redirect("/");
      return;
    }

    const validationResult = await validateProblem(request);
    if (!validationResult.ok) {
      response.render("pages/administrator-dashboard/edit-problem.ejs", {
        authentication: request.authentication,
        csrfToken: request.generatedCSRFToken,
        sessionID: request.sessionID,
        diagnosticMessage: validationResult.reason
      });
      return;
    }

    const editResult = await editProblem(request);
    if (!editResult.ok) {
      response.render("pages/administrator-dashboard/edit-problem.ejs", {
        authentication: request.authentication,
        csrfToken: request.generatedCSRFToken,
        sessionID: request.sessionID,
        diagnosticMessage: editResult.reason
      });
      return;
    }

    log.info(
      `User ${request.authentication.username} edited new problem with ID ${request.body["problem-id"]}`
    );
    response.redirect(`/problem/${request.body["problem-id"]}`);
    return;
  }
);

async function validateProblem(request: express.Request) {
  const fields = [
    "problem-name",
    "problem-statement",
    "problem-id",
    "correct-password",
    "problem-number",
    "problem-release-timestamp"
  ];

  for (const field of fields) {
    if (request.body[field].toString().trim().length === 0) {
      log.error(`Field empty on ${field}, unable to edit problem.`);
      return {
        ok: false,
        reason: `Field empty on ${field}, unable to edit problem.`
      };
    }
  }

  const sanitizedID = ExpressMongoSanitize.sanitize(request.body["problem-id"]);
  const existingProblem = await Problem.findOne({ problemID: sanitizedID });
  if (existingProblem) {
    return {
      ok: false,
      reason: `Problem with ID ${sanitizedID} already exists.`
    };
  }

  if (request.body["problem-name"].length > 128) {
    return {
      ok: false,
      reason: `Problem name too long.`
    };
  }

  if (request.body["problem-statement"].length > 16000) {
    return {
      ok: false,
      reason: `Problem statement too long.`
    };
  }

  if (request.body["problem-id"].length > 64) {
    return {
      ok: false,
      reason: `Problem ID too long.`
    };
  }

  if (request.body["correct-password"].length > 64) {
    return {
      ok: false,
      reason: `Problem's answer is too long.`
    };
  }

  if (isNaN(parseInt(request.body["problem-number"]))) {
    return {
      ok: false,
      reason: `Problem number isn't a integer.`
    };
  }

  if (isNaN(parseInt(request.body["problem-release-timestamp"]))) {
    return {
      ok: false,
      reason: `Release timestamp isn't a integer.`
    };
  }

  if (
    request.body["problem-difficulty"] &&
    isNaN(parseInt(request.body["problem-difficulty"]))
  ) {
    return {
      ok: false,
      reason: `Problem difficulty isn't an integer.`
    };
  }

  return {
    ok: true,
    reason: `All checks passed.`
  };
}

async function editProblem(request: express.Request) {
  const problem = new Problem();
  const body = request.body;
  problem.problemName = purify.sanitize(body["problem-name"]);
  problem.problemStatement = body["problem-statement"];
  problem.problemID = purify.sanitize(body["problem-id"]);
  problem.correctPassword = purify.sanitize(body["correct-password"]);
  problem.problemNumber = parseInt(body["problem-number"]);
  if (body["problem-difficulty"]) {
    problem.difficulty = parseInt(body["problem-difficulty"]);
  }
  if (body["problem-categories"]) {
    problem.categories = body["problem-categories"].toString().split(",");
  }
  problem.correctAnswers = [];
  problem.creationDateAndTime = new Date();
  problem.releaseDateAndTime = new Date(
    parseInt(body["problem-release-timestamp"])
  );
  problem.hidden =
    body["problem-hidden"] === "on" || body["problem-hidden"] === true;
  problem.author = body["problem-author"] || request.authentication.username;

  try {
    await problem.save();
  } catch (error) {
    log.error("Unable to edit problem.");
    if (error instanceof Error) {
      log.error(error.stack);
    } else {
      log.error(error);
    }
    return {
      ok: false,
      reason: `Unable to edit problem due to an internal server error. If this persists, please contact the server administrator.`
    };
  }

  return {
    ok: true,
    reason: `All checks passed.`
  };
}

export { router };
