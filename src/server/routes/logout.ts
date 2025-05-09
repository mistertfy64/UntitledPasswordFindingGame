import express from "express";
import { User } from "../models/User";
import { log } from "../utilities/log";
const router = express.Router();
const bcrypt = require("bcrypt");

router.get("/logout{-all}", async (request: express.Request, response) => {
  if (!request.authentication.ok) {
    response.redirect("/login");
    return;
  }

  const user = await User.findOne({
    username: request.authentication.username
  });

  if (!user) {
    log.error(`User ${user} not found on logging out.`);
    response.redirect("/login");
    return;
  }

  if (request.path === "/logout-all") {
    user.tokens = [];
  } else {
    const index = await user.tokens.findIndex(
      async (e) => await bcrypt.compare(request.cookies.token, e)
    );
    user.tokens.splice(index, 1);
  }

  try {
    user.save();
  } catch (error: unknown) {
    log.error("Unable to clear user's token(s).");
    if (error instanceof Error) {
      log.error(error.stack);
    } else {
      log.error(error);
    }
  }

  log.info(`User ${request.authentication.username} logged out.`);

  response.cookie("username", "");
  response.cookie("token", "");
  response.redirect("/");
});

export { router };
