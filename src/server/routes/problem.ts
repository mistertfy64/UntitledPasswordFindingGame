import express from "express";
import ejs from "ejs";
import { Problem } from "../models/Problem";
import markdownit from "markdown-it";

const md = markdownit();
const router = express.Router();

router.get("/problem", async (request, response) => {
	response.redirect("/problemset");
});

router.get("/problem/:number", async (request: express.Request, response) => {
	const number = parseInt(request.params.number);

	const problem = await Problem.findProblemWithNumber(number);

	if (!problem) {
		response.render("pages/404");
		return;
	}

	const name = problem.problemName;
	const statement = md.render(problem.problemStatement);

	response.render("pages/problem", {
		problemName: name,
		problemStatement: statement,
	});
});

export { router };
