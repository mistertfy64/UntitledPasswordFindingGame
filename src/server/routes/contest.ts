import express from "express";
import ejs from "ejs";
const router = express.Router();

router.get("/contest", async (request: express.Request, response) => {
	response.render("pages/contest", {
		authentication: request.authentication,
		csrfToken: request.generatedCSRFToken,
		sessionID: request.sessionID,
	});
});

export { router };
