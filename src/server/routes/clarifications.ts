import express from "express";
import { log } from "../utilities/log";
const router = express.Router();

router.get("/clarifications", async (request: express.Request, response) => {
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
});

export { router };
