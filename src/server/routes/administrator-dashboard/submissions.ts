import express from "express";
import ejs from "ejs";
import { log } from "../../utilities/log";
import { Submission } from "../../models/Submission";
const router = express.Router();

function authorized(request: express.Request) {
  return request.authentication.ok && request.authentication.isAdministrator;
}

const LIMIT = 100;

router.get(
  "/administrator/submissions",
  async (request: express.Request, response) => {
    if (!authorized(request)) {
      const username = request.authentication?.username ?? "";
      log.warn(`${username} tried to access admin page without permission.`);
      response.redirect("/");
      return;
    }

    const queryAmount = !isNaN(
      parseFloat((request?.query?.amount as string) ?? "")
    )
      ? Number(request.query.amount)
      : 100;

    const amount = Math.min(LIMIT, queryAmount);

    const queryPage = !isNaN(parseFloat((request?.query?.page as string) ?? ""))
      ? Number(request.query.page)
      : 1;

    const page = Math.max(1, queryPage);

    try {
      const estimatedTotal = await Submission.estimatedDocumentCount();
      const submissions = await Submission.getAccordingToQuery(page, amount);
      response.render("pages/administrator-dashboard/submissions.ejs", {
        authentication: request.authentication,
        csrfToken: request.generatedCSRFToken,
        sessionID: request.sessionID,
        data: submissions,
        page: page,
        amount: amount,
        shown: submissions.length,
        estimatedTotal: estimatedTotal
      });
      return;
    } catch (error: unknown) {
      log.error("Unable to fetch submissions.");
      if (error instanceof Error) {
        log.error(error.stack);
      } else {
        log.error(error);
      }
      response.render("pages/500.ejs", {
        authentication: request.authentication,
        csrfToken: request.generatedCSRFToken,
        sessionID: request.sessionID
      });
      return;
    }
  }
);

router.get(
  "/administrator/submissions/problem/:problemID",
  async (request: express.Request, response) => {
    if (!authorized(request)) {
      const username = request.authentication?.username ?? "";
      log.warn(`${username} tried to access admin page without permission.`);
      response.redirect("/");
      return;
    }

    const queryAmount = !isNaN(
      parseFloat((request?.query?.amount as string) ?? "")
    )
      ? Number(request.query.amount)
      : 100;

    const amount = Math.min(LIMIT, queryAmount);

    const queryPage = !isNaN(parseFloat((request?.query?.page as string) ?? ""))
      ? Number(request.query.page)
      : 1;

    const page = Math.max(1, queryPage);

    try {
      const estimatedTotal = await Submission.estimatedDocumentCount();
      const submissions = await Submission.getByProblemIDAccordingToQuery(
        request.params.problemID,
        page,
        amount
      );
      response.render("pages/administrator-dashboard/submissions.ejs", {
        authentication: request.authentication,
        csrfToken: request.generatedCSRFToken,
        sessionID: request.sessionID,
        data: submissions,
        page: page,
        amount: amount,
        shown: submissions.length,
        estimatedTotal: estimatedTotal
      });
      return;
    } catch (error: unknown) {
      log.error("Unable to fetch submissions.");
      if (error instanceof Error) {
        log.error(error.stack);
      } else {
        log.error(error);
      }
      response.render("pages/500.ejs", {
        authentication: request.authentication,
        csrfToken: request.generatedCSRFToken,
        sessionID: request.sessionID
      });
      return;
    }
  }
);

router.get(
  "/administrator/submissions/username/:username",
  async (request: express.Request, response) => {
    if (!authorized(request)) {
      const username = request.authentication?.username ?? "";
      log.warn(`${username} tried to access admin page without permission.`);
      response.redirect("/");
      return;
    }

    const queryAmount = !isNaN(
      parseFloat((request?.query?.amount as string) ?? "")
    )
      ? Number(request.query.amount)
      : 100;

    const amount = Math.min(LIMIT, queryAmount);

    const queryPage = !isNaN(parseFloat((request?.query?.page as string) ?? ""))
      ? Number(request.query.page)
      : 1;

    const page = Math.max(1, queryPage);

    try {
      const estimatedTotal = await Submission.estimatedDocumentCount();
      const submissions = await Submission.getByUsernameAccordingToQuery(
        request.params.username,
        page,
        amount
      );
      response.render("pages/administrator-dashboard/submissions.ejs", {
        authentication: request.authentication,
        csrfToken: request.generatedCSRFToken,
        sessionID: request.sessionID,
        data: submissions,
        page: page,
        amount: amount,
        shown: submissions.length,
        estimatedTotal: estimatedTotal
      });
      return;
    } catch (error: unknown) {
      log.error("Unable to fetch submissions.");
      if (error instanceof Error) {
        log.error(error.stack);
      } else {
        log.error(error);
      }
      response.render("pages/500.ejs", {
        authentication: request.authentication,
        csrfToken: request.generatedCSRFToken,
        sessionID: request.sessionID
      });
      return;
    }
  }
);

export { router };
