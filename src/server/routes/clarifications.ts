import express from "express";
import { log } from "../utilities/log";
import { Clarification } from "../models/Clarification";
const router = express.Router();

router.get("/clarifications", async (request: express.Request, response) => {
  if (!request.authentication.ok) {
    response.redirect("/login");
    return;
  }
  renderPage(request, response);
  return;
});

router.post("/clarifications", async (request: express.Request, response) => {
  if (!request.authentication.ok) {
    response.redirect("/login");
    return;
  }
  const captcha = await validateCaptcha(request.body["g-recaptcha-response"]);

  if (!captcha) {
    renderPage(
      request,
      response,
      "CAPTCHA Incomplete. Clarification not sent."
    );
    return;
  }

  if (typeof request.body["question"] !== "string") {
    renderPage(
      request,
      response,
      "Question type is invalid. Clarification not sent."
    );
    return;
  }

  if (request.body["question"].length <= 0) {
    renderPage(
      request,
      response,
      "Question should not be empty. Clarification not sent."
    );
    return;
  }

  if (request.body["question"].length > 512) {
    renderPage(
      request,
      response,
      "Question too long. Maximum is 512 characters. Clarification not sent."
    );
    return;
  }

  try {
    // create clarification
    const clarification = new Clarification();
    clarification.question = request.body["question"];
    clarification.questionAskedBy = request.authentication.username;
    clarification.timestampOnAsk = new Date();
    await clarification.save();

    renderPage(request, response);

    log.info(`Added new clarification from ${request.authentication.username}`);

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
    renderPage(
      request,
      response,
      "CAPTCHA Incomplete. Clarification not sent."
    );

    return;
  }
});

async function renderPage(
  request: express.Request,
  response: express.Response,
  diagnosticMessage?: string
) {
  const CLARIFICATIONS_TO_SHOW = 10;
  const data = await Clarification.find({
    questionAskedBy: request.authentication.username
  })
    .sort({ timestampOnAsk: -1 })
    .limit(CLARIFICATIONS_TO_SHOW)
    .lean();

  response.render("pages/clarifications", {
    recaptchaSiteKey:
      process.env.ENVIRONMENT === "production"
        ? process.env.RECAPTCHA_SITE_KEY
        : process.env.TESTING_RECAPTCHA_SITE_KEY,
    authentication: request.authentication,
    diagnosticMessage: diagnosticMessage ?? "",
    csrfToken: request.generatedCSRFToken,
    sessionID: request.sessionID,
    data: data
  });
}

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
