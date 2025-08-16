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

    const problemToEdit = await getProblem(request.params.problemID);
    if (!problemToEdit) {
      response.redirect("/administrator");
      return;
    }

    response.render("pages/administrator-dashboard/edit-problem.ejs", {
      authentication: request.authentication,
      csrfToken: request.generatedCSRFToken,
      sessionID: request.sessionID,
      diagnosticMessage: "",
      problemToEdit: problemToEdit
    });
    return;
  }
);

router.post(
  "/administrator/edit-problem/:problemID",
  async (request: express.Request, response) => {
    if (!authorized(request)) {
      const username = request.authentication?.username ?? "";
      log.warn(`${username} tried to access admin page without permission.`);
      response.redirect("/");
      return;
    }

    const problemToEdit = await getProblem(request.params.problemID);
    if (!problemToEdit) {
      response.redirect("/administrator");
      return;
    }

    const validationResult = await validateProblem(request);
    if (!validationResult.ok) {
      response.render("pages/administrator-dashboard/edit-problem.ejs", {
        authentication: request.authentication,
        csrfToken: request.generatedCSRFToken,
        sessionID: request.sessionID,
        diagnosticMessage: validationResult.reason,
        problemToEdit: problemToEdit
      });
      return;
    }

    const editResult = await editProblem(request);
    if (!editResult.ok) {
      response.render("pages/administrator-dashboard/edit-problem.ejs", {
        authentication: request.authentication,
        csrfToken: request.generatedCSRFToken,
        sessionID: request.sessionID,
        diagnosticMessage: editResult.reason,
        problemToEdit: problemToEdit
      });
      return;
    }

    log.info(
      `User ${request.authentication.username} edited problem with ID ${request.params.problemID}`
    );
    response.redirect(`/problem/${request.params.problemID}`);
    return;
  }
);

async function validateProblem(request: express.Request) {
  const fields = [
    "problem-name",
    "problem-statement",
    "correct-password",
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

  if (request.body["correct-password"].length > 64) {
    return {
      ok: false,
      reason: `Problem's answer is too long.`
    };
  }

  if (!Number.isInteger(["problem-release-timestamp"])) {
    return {
      ok: false,
      reason: `Release timestamp isn't a integer.`
    };
  }

  if (
    request.body["problem-difficulty"] &&
    !Number.isInteger(request.body["problem-difficulty"])
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
  const problem = await getProblem(request.params.problemID);

  if (!problem) {
    return {
      ok: false,
      reason: `Problem doesn't exist.`
    };
  }

  const body = request.body;
  problem.problemName = purify.sanitize(body["problem-name"]);
  problem.problemStatement = body["problem-statement"];
  problem.correctPassword = purify.sanitize(body["correct-password"]);
  if (body["problem-difficulty"]) {
    problem.difficulty = parseInt(body["problem-difficulty"]);
  }
  if (body["problem-categories"]) {
    problem.categories = body["problem-categories"].toString().split(",");
  }
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

async function getProblem(problemID: string) {
  const sanitizedProblemID = await ExpressMongoSanitize.sanitize(
    problemID as any
  );
  const problemToEdit = await Problem.findOne({
    problemID: sanitizedProblemID
  });
  return problemToEdit;
}
export { router };
