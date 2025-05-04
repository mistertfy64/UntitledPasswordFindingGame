import express from "express";
import ejs from "ejs";
import { Problem } from "../models/Problem";
import markdownit from "markdown-it";
import mongoSanitize from "express-mongo-sanitize";
import { User } from "../models/User";
import { log } from "../utilities/log";
import { Submission } from "../models/Submission";

const md = markdownit().use(require("markdown-it-sub"));
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

		if (
			problem.releaseDateAndTime != null &&
			problem.releaseDateAndTime > new Date()
		) {
			response.redirect("/problemset");
			return;
		}
		const name = problem.problemName;
		const statement = md.render(problem.problemStatement);

		problem.correctAnswers.sort(
			(a, b) => a.timestamp.getTime() - b.timestamp.getTime()
		);

		response.render("pages/problem", {
			problemName: name,
			problemStatement: statement,
			authentication: request.authentication,
			correctAnswers: problem.correctAnswers,
			csrfToken: request.generatedCSRFToken,
			sessionID: request.sessionID,
		});
	}
);

router.post(
	"/problem/:problemID",
	async (request: express.Request, response) => {
		if (!request.authentication.ok) {
			response.redirect("/login");
			return;
		}

		const answer = request.body["password"];

		// Ignore empty answers or answers with more than 64 characters
		if (!answer || answer.length > 64) {
			response.redirect(`/problem/${request.params.problemID}`);
			return;
		}

		const sanitizedProblemID = mongoSanitize.sanitize(
			request.params.problemID as any
		);
		const problem = await Problem.findOne({
			problemID: sanitizedProblemID,
		});

		if (!problem) {
			response.render("pages/404", {
				authentication: request.authentication,
			});
			return;
		}

		if (
			problem.releaseDateAndTime != null &&
			problem.releaseDateAndTime > new Date()
		) {
			response.redirect("/problemset");
			return;
		}

		// create submission object
		const submission = new Submission();

		const timestamp = new Date();
		const number = problem?.problemNumber;
		const correctAnswer = problem.correctPassword;
		const sanitizedUsername = mongoSanitize.sanitize(
			request.authentication.username as any
		);

		submission.problemNumber = number;
		submission.problemID = problem.problemID;
		submission.username = sanitizedUsername;
		submission.answer = answer;
		submission.timestamp = new Date();

		if (correctAnswer !== answer) {
			// wrong answer
			response.render("pages/wrong-answer", {
				answer: answer,
				number: number,
				problemID: sanitizedProblemID,
				authentication: request.authentication,
				csrfToken: request.generatedCSRFToken,
				sessionID: request.sessionID,
			});
			log.info(
				`${sanitizedUsername} incorrectly answered ${answer} to problem with ID ${sanitizedProblemID}.`
			);

			// add submission
			submission.verdict = "wrong answer";
			try {
				submission.save();
			} catch (error: unknown) {
				log.error("Unable to save submission.");
				if (error instanceof Error) {
					log.error(error.stack);
				} else {
					log.error(error);
				}
			}
			return;
		}

		// correct answer + passed all checks

		const user = await User.findOne({ username: sanitizedUsername });

		if (!user) {
			response.redirect("/login");
			return;
		}

		// user must not have solved problem before
		if (
			!user.correctAnswers.find(
				(e) => e.problemID === sanitizedProblemID
			) &&
			!problem.correctAnswers.find(
				(e) => e.username === sanitizedUsername
			)
		) {
			user.addCorrectAnswer(sanitizedProblemID, timestamp);
			problem.addCorrectAnswer(sanitizedUsername, timestamp);
			log.info(
				`${sanitizedUsername} solved problem with ID ${sanitizedProblemID} on ${timestamp.toISOString()}.`
			);
		}

		response.render("pages/correct-answer", {
			answer: answer,
			number: number,
			problemID: sanitizedProblemID,
			authentication: request.authentication,
			csrfToken: request.generatedCSRFToken,
			sessionID: request.sessionID,
		});

		// add submission
		submission.verdict = "correct answer";
		try {
			submission.save();
		} catch (error: unknown) {
			log.error("Unable to save submission.");
			if (error instanceof Error) {
				log.error(error.stack);
			} else {
				log.error(error);
			}
		}
		log.info(
			`${sanitizedUsername} correctly answered ${answer} to problem with ID ${sanitizedProblemID}.`
		);
	}
);

export { router };
