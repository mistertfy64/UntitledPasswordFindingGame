import express from "express";
import { User } from "../models/User";
import { log } from "../utilities/log";
import mongoSanitize from "express-mongo-sanitize";
import { CsrfTokenGeneratorRequestUtil } from "csrf-csrf";
const bcrypt = require("bcrypt");
const router = express.Router();
const SALT_ROUNDS = 12;

router.get("/register", async (request: express.Request, response) => {
  if (!request.authentication.ok) {
    if (process.env.ENVIRONMENT !== "production") {
      // testing credentials
      response.render("pages/register", {
        recaptchaSiteKey: process.env.TESTING_RECAPTCHA_SITE_KEY,
        authentication: request.authentication,
        diagnosticMessage: "",
        csrfToken: request.generatedCSRFToken,
        sessionID: request.sessionID
      });
    } else {
      // real credentials
      response.render("pages/register", {
        recaptchaSiteKey: process.env.RECAPTCHA_SITE_KEY,
        diagnosticMessage: "",
        authentication: request.authentication,
        csrfToken: request.generatedCSRFToken,
        sessionID: request.sessionID
      });
    }
    return;
  }
  response.redirect("/account");
});

router.post("/register", async (request: express.Request, response) => {
  // validate credentials
  const username = request.body["username"];
  const password = request.body["password"];
  const confirmPassword = request.body["confirm-password"];

  const result = await validateRegistration(
    username,
    password,
    confirmPassword,
    request.body["g-recaptcha-response"]
  );

  if (!result.ok) {
    // TODO: DRY
    if (process.env.ENVIRONMENT !== "production") {
      // testing credentials
      response.render("pages/register", {
        recaptchaSiteKey: process.env.TESTING_RECAPTCHA_SITE_KEY,
        diagnosticMessage: result.reason,
        authentication: request.authentication,
        csrfToken: request.generatedCSRFToken,
        sessionID: request.sessionID
      });
    } else {
      // real credentials
      response.render("pages/register", {
        recaptchaSiteKey: process.env.RECAPTCHA_SITE_KEY,
        diagnosticMessage: result.reason,
        authentication: request.authentication,
        csrfToken: request.generatedCSRFToken,
        sessionID: request.sessionID
      });
    }
    return;
  }

  const createResult = createNewUser(username, password);

  if (!createResult) {
    // TODO: DRY
    if (process.env.ENVIRONMENT !== "production") {
      // testing credentials
      response.render("pages/register", {
        recaptchaSiteKey: process.env.TESTING_RECAPTCHA_SITE_KEY,
        diagnosticMessage:
          "Unable to create user account due to an internal error. If this persists, please contact mistertfy64.",
        authentication: request.authentication,
        csrfToken: request.generatedCSRFToken,
        sessionID: request.sessionID
      });
    } else {
      // real credentials
      response.render("pages/register", {
        recaptchaSiteKey: process.env.RECAPTCHA_SITE_KEY,
        diagnosticMessage:
          "Unable to create user account due to an internal error. If this persists, please contact mistertfy64.",
        authentication: request.authentication,
        csrfToken: request.generatedCSRFToken,
        sessionID: request.sessionID
      });
    }
    return;
  }

  response.redirect("/login");
});

async function validateRegistration(
  username: string,
  password: string,
  confirmPassword: string,
  captchaResponse: unknown
) {
  // validate captcha
  if (!(await validateCaptcha(captchaResponse))) {
    return {
      ok: false,
      reason: "reCAPTCHA not completed."
    };
  }

  // sanitize data
  const sanitizedUsername = mongoSanitize.sanitize(username as any);
  if (sanitizedUsername !== username) {
    return {
      ok: false,
      reason: "Username is invalid."
    };
  }

  if (!username) {
    return {
      ok: false,
      reason: "Username field is empty."
    };
  }

  if (!password) {
    return {
      ok: false,
      reason: "Password field is empty."
    };
  }

  if (!confirmPassword) {
    return {
      ok: false,
      reason: "Confirm password field is empty."
    };
  }

  if (password)
    if (password !== confirmPassword) {
      return {
        ok: false,
        reason: "Passwords do not match."
      };
    }

  if (username.length < 3 || username.length > 20) {
    return {
      ok: false,
      reason: "Usernames can only be 3 to 20 characters long."
    };
  }

  if (password.length < 8 || password.length > 32) {
    return {
      ok: false,
      reason: "Passwords can only be 8 to 32 characters long."
    };
  }

  const usernameRegex = /^[A-Za-z0-9_\-]{3,20}$/;
  if (!usernameRegex.test(username)) {
    return {
      ok: false,
      reason:
        "Usernames can only contain alphanumeric characters, underscores, and/or dashes."
    };
  }

  const duplicateUser = await User.findOne({
    lowercasedUsername: username.toLowerCase()
  });

  if (duplicateUser) {
    return {
      ok: false,
      reason: "Username is already taken."
    };
  }

  return {
    ok: true,
    reason: "All checks passed."
  };
}

async function validateCaptcha(captchaResponse: unknown) {
  let secretKey = "";
  if (process.env.ENVIRONMENT !== "production") {
    secretKey = process.env.TESTING_RECAPTCHA_SECRET_KEY as string;
  } else {
    secretKey = process.env.RECAPTCHA_SECRET_KEY as string;
  }
  const url = `https://www.google.com/recaptcha/api/siteverify?secret=${secretKey}&response=${captchaResponse}`;
  const result: any = (await fetch(url)).json();
  if (!result.success) {
    return false;
  }
  return true;
}

async function createNewUser(username: string, password: string) {
  const user = new User();
  user.username = username;
  user.lowercasedUsername = username.toLowerCase();
  user.correctAnswers = [];
  user.passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  user.creationDateAndTime = new Date();

  try {
    user.save();
  } catch (error: unknown) {
    if (error instanceof Error) {
      log.error("Unable to create user: ", error.stack);
    } else {
      log.error("Unable to create user: ", error);
    }
    return false;
  }

  log.info(`New user with username ${username} created.`);
  return true;
}

export { router };
