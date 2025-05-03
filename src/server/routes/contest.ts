import express from "express";
import mongoSanitize from "express-mongo-sanitize";
import { Contest } from "../models/Contest";
const router = express.Router();

router.get("/contests", async (request: express.Request, response) => {
	response.render("pages/contests", {
		authentication: request.authentication,
		csrfToken: request.generatedCSRFToken,
		sessionID: request.sessionID,
	});
});

router.get(
	"/contests/:contestID",
	async (request: express.Request, response) => {
		const sanitizedContestID = mongoSanitize.sanitize(
			request.params.contestID as any
		);
		const contest = await Contest.findOne({
			contestID: sanitizedContestID,
		});

		if (!contest) {
			response.redirect("/contests");
			return;
		}

		response.render("pages/contest-standings", {
			authentication: request.authentication,
			csrfToken: request.generatedCSRFToken,
			sessionID: request.sessionID,
			contestData: contest,
		});
	}
);

export { router };
