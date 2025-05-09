import express from "express";
import mongoSanitize from "express-mongo-sanitize";
import { User } from "../models/User";
import { log } from "../utilities/log";
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const router = express.Router();

router.get("/login", async (request: express.Request, response) => {
  if (!request.authentication.ok) {
    response.render("pages/login", {
      diagnosticMessage: "",
      authentication: request.authentication,
      csrfToken: request.generatedCSRFToken,
      sessionID: request.sessionID
    });
  }
});

router.post("/login", async (request: express.Request, response) => {
  const username = request.body["username"];
  const password = request.body["password"];

  if (!username) {
    response.render("pages/login", {
      diagnosticMessage: "Username field is empty.",
      authentication: request.authentication,
      csrfToken: request.generatedCSRFToken,
      sessionID: request.sessionID
    });
    return;
  }

  if (!password) {
    response.render("pages/login", {
      diagnosticMessage: "Password field is empty.",
      authentication: request.authentication,
      csrfToken: request.generatedCSRFToken,
      sessionID: request.sessionID
    });
    return;
  }

  const sanitizedUsername = mongoSanitize.sanitize(username);
  const user = await User.findOne({ username: sanitizedUsername });

  if (!user) {
    response.render("pages/login", {
      diagnosticMessage: "Username or password is incorrect.",
      authentication: request.authentication,
      csrfToken: request.generatedCSRFToken,
      sessionID: request.sessionID
    });
    return;
  }

  const passwordResult = await bcrypt.compare(password, user.passwordHash);
  if (!passwordResult) {
    response.render("pages/login", {
      diagnosticMessage: "Username or password is incorrect.",
      authentication: request.authentication,
      csrfToken: request.generatedCSRFToken,
      sessionID: request.sessionID
    });
    return;
  }

  log.info(`User ${request.authentication.username} successfully logged in.`);

  // add cookies
  const token = await crypto.randomBytes(40).toString("hex");
  response.cookie("username", username);
  response.cookie("token", token);
  await user.addToken(token);
  response.redirect("/");
});

export { router };
