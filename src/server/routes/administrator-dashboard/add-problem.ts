import express from "express";
import { log } from "../../utilities/log";
const router = express.Router();

function authorized(request: express.Request) {
  return request.authentication.ok && request.authentication.isAdministrator;
}

router.get(
  "/administrator/add-problem",
  async (request: express.Request, response) => {
    if (!authorized(request)) {
      const username = request.authentication?.username ?? "";
      log.warn(`${username} tried to access admin page without permission.`);
      response.redirect("/");
      return;
    }

    response.render("pages/administrator-dashboard/add-problem.ejs", {
      authentication: request.authentication,
      csrfToken: request.generatedCSRFToken,
      sessionID: request.sessionID,
      diagnosticMessage: ""
    });
    return;
  }
);

export { router };
