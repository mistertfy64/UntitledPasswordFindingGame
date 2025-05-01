import express from "express";
import ejs from "ejs";
import { Problem } from "../models/Problem";
const router = express.Router();

router.get("/problemset", async (request: express.Request, response) => {
	const problems = await Problem.getProblems();
	problems.sort((a, b) => a.problemNumber - b.problemNumber);
	response.render("pages/problemset", {
		authentication: request.authentication,
		problems: problems,
		csrfToken: request.generatedCSRFToken,
		sessionID: request.sessionID,
	});
});

export { router };
