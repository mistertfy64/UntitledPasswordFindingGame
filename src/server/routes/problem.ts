import express from "express";
import ejs from "ejs";
import { Problem } from "../models/Problem";
import markdownit from "markdown-it";
import mongoSanitize from "express-mongo-sanitize";

const md = markdownit();
const router = express.Router();

router.get("/problem", async (request: express.Request, response) => {
	response.redirect("/problemset");
});

router.get(
	"/problem/:problemID",
	async (request: express.Request, response) => {
		const sanitizedProblemID = mongoSanitize.sanitize(
			request.params.problemID as any
		);

		const problem = await Problem.findProblemWithProblemID(
			sanitizedProblemID
		);

		if (!problem) {
			response.render("pages/404", {
				authentication: request.authentication,
			});
			return;
		}

		const name = problem.problemName;
		const statement = md.render(problem.problemStatement);

		response.render("pages/problem", {
			problemName: name,
			problemStatement: statement,
			authentication: request.authentication,
		});
	}
);

router.post("/problem/:number", async (request: express.Request, response) => {
	const answer = request.body["password"];

	const number = parseInt(request.params.number);

	const problem = await Problem.findOne({ number: number });

	if (!problem) {
		response.render("pages/404", {
			authentication: request.authentication,
		});
		return;
	}

	const correctAnswer = problem.correctPassword;

	if (correctAnswer !== answer) {
		// wrong answer
		response.render("pages/wrong-answer", {
			answer: answer,
			number: number,
			authentication: request.authentication,
		});
		return;
	}

	// correct answer + passed all checks
	response.render("pages/correct-answer", {
		answer: answer,
		number: number,
		authentication: request.authentication,
	});
});

export { router };
