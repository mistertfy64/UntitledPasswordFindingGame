import express from "express";
import { log } from "../utilities/log";
import { Clarification } from "../models/Clarification";
const router = express.Router();

router.get("/clarifications", async (request: express.Request, response) => {
  if (!request.authentication.ok) {
    response.redirect("/login");
    return;
  }

  const data = await Clarification.find({
    questionAskedBy: request.authentication.username
  })
    .limit(10)
    .lean();

  if (process.env.ENVIRONMENT !== "production") {
    // testing credentials
    response.render("pages/clarifications", {
      recaptchaSiteKey: process.env.TESTING_RECAPTCHA_SITE_KEY,
      authentication: request.authentication,
      diagnosticMessage: "",
      csrfToken: request.generatedCSRFToken,
      sessionID: request.sessionID,
      data: data
    });
  } else {
    // real credentials
    response.render("pages/clarifications", {
      recaptchaSiteKey: process.env.RECAPTCHA_SITE_KEY,
      diagnosticMessage: "",
      authentication: request.authentication,
      csrfToken: request.generatedCSRFToken,
      sessionID: request.sessionID,
      data: data
    });
  }
  return;
});

router.post("/clarifications", async (request: express.Request, response) => {
  if (!request.authentication.ok) {
    response.redirect("/login");
    return;
  }
  const captcha = await validateCaptcha(request.body["g-recaptcha-response"]);

  if (!captcha) {
    // TODO: DRY this
    if (process.env.ENVIRONMENT !== "production") {
      // testing credentials
      response.render("pages/clarifications", {
        recaptchaSiteKey: process.env.TESTING_RECAPTCHA_SITE_KEY,
        authentication: request.authentication,
        diagnosticMessage: "CAPTCHA Incomplete. Clarification not sent.",
        csrfToken: request.generatedCSRFToken,
        sessionID: request.sessionID
      });
    } else {
      // real credentials
      response.render("pages/clarifications", {
        recaptchaSiteKey: process.env.RECAPTCHA_SITE_KEY,
        diagnosticMessage: "CAPTCHA Incomplete. Clarification not sent.",
        authentication: request.authentication,
        csrfToken: request.generatedCSRFToken,
        sessionID: request.sessionID
      });
    }
    return;
  }

  if (request.body["question"].length > 512) {
    // TODO: DRY this
    if (process.env.ENVIRONMENT !== "production") {
      // testing credentials
      response.render("pages/clarifications", {
        recaptchaSiteKey: process.env.TESTING_RECAPTCHA_SITE_KEY,
        authentication: request.authentication,
        diagnosticMessage:
          "Question too long. Maximum is 512 characters. Clarification not sent.",
        csrfToken: request.generatedCSRFToken,
        sessionID: request.sessionID
      });
    } else {
      // real credentials
      response.render("pages/clarifications", {
        recaptchaSiteKey: process.env.RECAPTCHA_SITE_KEY,
        diagnosticMessage:
          "Question too long. Maximum is 512 characters. Clarification not sent.",
        authentication: request.authentication,
        csrfToken: request.generatedCSRFToken,
        sessionID: request.sessionID
      });
    }
    return;
  }

  try {
    // create clarification
    const clarification = new Clarification();
    clarification.question = request.body["question"];
    clarification.questionAskedBy = request.authentication.username;
    clarification.timestampOnAsk = new Date();
    clarification.save();

    if (process.env.ENVIRONMENT !== "production") {
      // testing credentials
      response.render("pages/clarifications", {
        recaptchaSiteKey: process.env.TESTING_RECAPTCHA_SITE_KEY,
        authentication: request.authentication,
        diagnosticMessage: "",
        csrfToken: request.generatedCSRFToken,
        sessionID: request.sessionID
      });
    } else {
      // real credentials
      response.render("pages/clarifications", {
        recaptchaSiteKey: process.env.RECAPTCHA_SITE_KEY,
        diagnosticMessage: "",
        authentication: request.authentication,
        csrfToken: request.generatedCSRFToken,
        sessionID: request.sessionID
      });
    }
    return;
  } catch (error: unknown) {
    if (error instanceof Error) {
      log.error(
        `Unable to set new send clarification for user ${request.authentication.username}\n${error.stack}`
      );
    } else {
      log.error(
        `Unable to set new send clarification for user ${request.authentication.username}\n${error}`
      );
    }
    if (process.env.ENVIRONMENT !== "production") {
      // testing credentials
      response.render("pages/clarifications", {
        recaptchaSiteKey: process.env.TESTING_RECAPTCHA_SITE_KEY,
        authentication: request.authentication,
        diagnosticMessage:
          "An internal error has occurred. Please contact the server administrator if this persists. Clarification not sent.",
        csrfToken: request.generatedCSRFToken,
        sessionID: request.sessionID
      });
    } else {
      // real credentials
      response.render("pages/clarifications", {
        recaptchaSiteKey: process.env.RECAPTCHA_SITE_KEY,
        diagnosticMessage:
          "An internal error has occurred. Please contact the server administrator if this persists. Clarification not sent.",
        authentication: request.authentication,
        csrfToken: request.generatedCSRFToken,
        sessionID: request.sessionID
      });
    }
    return;
  }
});

async function validateCaptcha(captchaResponse: unknown) {
  let secretKey = "";
  if (process.env.ENVIRONMENT !== "production") {
    secretKey = process.env.TESTING_RECAPTCHA_SECRET_KEY as string;
  } else {
    secretKey = process.env.RECAPTCHA_SECRET_KEY as string;
  }
  const url = `https://www.google.com/recaptcha/api/siteverify?secret=${secretKey}&response=${captchaResponse}`;
  const result: any = await (await fetch(url, { method: "POST" })).json();
  if (!result.success) {
    return false;
  }
  return true;
}

export { router };
