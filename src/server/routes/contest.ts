import express from "express";
import ejs from "ejs";
const router = express.Router();

router.get("/contests", async (request: express.Request, response) => {
	response.render("pages/contests", {
		authentication: request.authentication,
		csrfToken: request.generatedCSRFToken,
		sessionID: request.sessionID,
	});
});

export { router };
