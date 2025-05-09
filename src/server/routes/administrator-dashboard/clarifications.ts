import express from "express";
import ExpressMongoSanitize from "express-mongo-sanitize";
import { log } from "../../utilities/log";
import { Clarification } from "../../models/Clarification";
const router = express.Router();

function authorized(request: express.Request) {
  return request.authentication.ok && request.authentication.isAdministrator;
}

const LIMIT = 100;

router.get(
  "/administrator/clarifications",
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
      const clarifications = await Clarification.getAccordingToQuery(
        page,
        amount
      );
      response.render("pages/administrator-dashboard/clarifications.ejs", {
        authentication: request.authentication,
        csrfToken: request.generatedCSRFToken,
        sessionID: request.sessionID,
        data: clarifications,
        page: page,
        amount: amount
      });
      return;
    } catch (error: unknown) {
      log.error("Unable to fetch clarifications.");
      if (error instanceof Error) {
        log.error(error.stack);
      } else {
        log.error(error);
      }
      response.render("pages/administrator-dashboard/clarifications.ejs", {
        authentication: request.authentication,
        csrfToken: request.generatedCSRFToken,
        sessionID: request.sessionID
      });
      return;
    }
  }
);

router.get(
  "/administrator/clarifications/:clarificationID",
  async (request: express.Request, response) => {
    if (!authorized(request)) {
      const username = request.authentication?.username ?? "";
      log.warn(`${username} tried to access admin page without permission.`);
      response.redirect("/");
      return;
    }

    const sanitizedID = ExpressMongoSanitize.sanitize(
      request.params.clarificationID as any
    );

    try {
      const clarification = await Clarification.findOne({
        _id: sanitizedID
      });
      response.render(
        "pages/administrator-dashboard/answer-clarification.ejs",
        {
          authentication: request.authentication,
          csrfToken: request.generatedCSRFToken,
          sessionID: request.sessionID,
          data: clarification,
          errored: false
        }
      );
      return;
    } catch (error: unknown) {
      log.error(`Unable to fetch clarification with id ${sanitizedID}.`);
      if (error instanceof Error) {
        log.error(error.stack);
      } else {
        log.error(error);
      }
      response.render(
        "pages/administrator-dashboard/answer-clarification.ejs",
        {
          authentication: request.authentication,
          csrfToken: request.generatedCSRFToken,
          sessionID: request.sessionID,
          data: null,
          errored: true
        }
      );
      return;
    }
  }
);

router.post(
  "/administrator/clarifications/:clarificationID",
  async (request: express.Request, response) => {
    if (!authorized(request)) {
      const username = request.authentication?.username ?? "";
      log.warn(`${username} tried to access admin page without permission.`);
      response.redirect("/");
      return;
    }

    const sanitizedID = ExpressMongoSanitize.sanitize(
      request.params.clarificationID as any
    );

    if (request.body["response"].length > 1024) {
      log.error(`Answer to clarification with id ${sanitizedID} too long.`);
      response.redirect(`/administrator/clarifications/${sanitizedID}`);
      return;
    }

    try {
      const clarification = await Clarification.findOne({
        _id: sanitizedID
      });

      if (!clarification) {
        log.error(`Clarification with id ${sanitizedID} not found.`);
        response.redirect("/administrator/clarifications");
        return;
      }

      clarification.responseAnsweredBy = request.authentication.username;
      clarification.response = request.body["response"];
      clarification.timestampOnAnswer = new Date();

      await clarification.save();

      log.info(
        `${request.authentication.username} answered clarification with ID ${sanitizedID}`
      );

      response.redirect("/administrator/clarifications");
      return;
    } catch (error: unknown) {
      log.error(`Unable to answer to clarification with id ${sanitizedID}.`);
      if (error instanceof Error) {
        log.error(error.stack);
      } else {
        log.error(error);
      }
      response.render(
        "pages/administrator-dashboard/answer-clarification.ejs",
        {
          authentication: request.authentication,
          csrfToken: request.generatedCSRFToken,
          sessionID: request.sessionID,
          data: null,
          errored: true
        }
      );
      return;
    }
  }
);

export { router };
