import express from "express";
import { log } from "../../utilities/log";
import { Announcement } from "../../models/Announcement";
import { JSDOM } from "jsdom";
import DOMPurify from "dompurify";

const window = new JSDOM("").window;
const purify = DOMPurify(window);
const router = express.Router();

function authorized(request: express.Request) {
  return request.authentication.ok && request.authentication.isAdministrator;
}

router.get(
  "/administrator/add-announcement",
  async (request: express.Request, response) => {
    if (!authorized(request)) {
      const username = request.authentication?.username ?? "";
      log.warn(`${username} tried to access admin page without permission.`);
      response.redirect("/");
      return;
    }
    response.render("pages/administrator-dashboard/add-announcement.ejs", {
      authentication: request.authentication,
      csrfToken: request.generatedCSRFToken,
      sessionID: request.sessionID,
      diagnosticMessage: ""
    });
    return;
  }
);

router.post(
  "/administrator/add-announcement",
  async (request: express.Request, response) => {
    if (!authorized(request)) {
      const username = request.authentication?.username ?? "";
      log.warn(`${username} tried to access admin page without permission.`);
      response.redirect("/");
      return;
    }

    const validationResult = await validateAnnouncement(request);
    if (!validationResult.ok) {
      response.render("pages/administrator-dashboard/add-announcement.ejs", {
        authentication: request.authentication,
        csrfToken: request.generatedCSRFToken,
        sessionID: request.sessionID,
        diagnosticMessage: validationResult.reason
      });
      return;
    }

    const addResult = await addAnnouncement(request);
    if (!addResult.ok) {
      response.render("pages/administrator-dashboard/add-announcement.ejs", {
        authentication: request.authentication,
        csrfToken: request.generatedCSRFToken,
        sessionID: request.sessionID,
        diagnosticMessage: addResult.reason
      });
      return;
    }

    log.info(`User ${request.authentication.username} added new announcement`);
    response.redirect(`/`);
    return;
  }
);

async function validateAnnouncement(request: express.Request) {
  const title = (request.body["announcement-title"] ?? "").trim();
  const bodyText = (request.body["announcement-title"] ?? "").trim();

  if (title.length === 0) {
    return {
      ok: false,
      reason: "Announcement title is empty."
    };
  }
  if (title.length > 128) {
    return {
      ok: false,
      reason: "Announcement title is too long."
    };
  }
  if (bodyText.length === 0) {
    return {
      ok: false,
      reason: "Announcement body is empty."
    };
  }
  if (bodyText.length > 16000) {
    return {
      ok: false,
      reason: "Announcement body is too long."
    };
  }
  return {
    ok: true,
    reason: "All checks passed."
  };
}

async function addAnnouncement(request: express.Request) {
  const announcement = new Announcement();
  const body = request.body;
  announcement.title = purify.sanitize(body["announcement-title"]);
  announcement.body = body["announcement-body"];
  announcement.creationDateAndTime = new Date();
  announcement.author = request.authentication.username;

  try {
    await announcement.save();
  } catch (error) {
    log.error("Unable to add announcement.");
    if (error instanceof Error) {
      log.error(error.stack);
    } else {
      log.error(error);
    }
    return {
      ok: false,
      reason: `Unable to add announcement due to an internal server error. If this persists, please contact the server administrator.`
    };
  }

  return {
    ok: true,
    reason: `All checks passed.`
  };
}

export { router };
