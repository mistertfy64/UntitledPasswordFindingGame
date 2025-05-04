import express from "express";
import mongoSanitize from "express-mongo-sanitize";
import { Contest, ContestInterface } from "../models/Contest";
import { Submission, SubmissionInterface } from "../models/Submission";
import { Problem, ProblemInterface } from "../models/Problem";
const router = express.Router();

type LeaderboardsScore = {
	totalScore: number;
	username: string;
	detailed: { [key: string]: TotalScoreInterface };
};

type TotalScoreInterface = {
	score: number;
	wrongAnswers: number;
	timeTaken: number;
	solved: boolean;
};

interface ExtendedContestInterface extends ContestInterface {
	scores: Array<LeaderboardsScore>;
	contestProblems: Array<ProblemInterface>;
}

router.get("/contests", async (request: express.Request, response) => {
	const contest = await Contest.find({});
	response.render("pages/contests", {
		authentication: request.authentication,
		csrfToken: request.generatedCSRFToken,
		sessionID: request.sessionID,
		contests: contest,
	});
});

router.get(
	"/contests/:contestID",
	async (request: express.Request, response) => {
		const sanitizedContestID = mongoSanitize.sanitize(
			request.params.contestID as any
		);
		const contest = (await Contest.findOne({
			contestID: sanitizedContestID,
		})) as ExtendedContestInterface;

		if (!contest) {
			response.redirect("/contests");
			return;
		}

		if (contest.startDateAndTime <= new Date()) {
			// contest has already started, get data as well
			contest.scores = await getContestScores(contest);
			contest.contestProblems = [];
			for (const contestProblem of contest.problems) {
				const contestProblemData =
					await Problem.findProblemWithProblemID(
						contestProblem.problemID
					);
				contest.contestProblems.push(contestProblemData);
			}
		}

		response.render("pages/contest-status", {
			authentication: request.authentication,
			csrfToken: request.generatedCSRFToken,
			sessionID: request.sessionID,
			contestData: contest,
		});
	}
);

async function getContestScores(contest: ExtendedContestInterface) {
	const submissions = await getContestSubmissions(contest);
	const scores = formatScores(submissions, contest);
	return scores;
}

/**
 * Gets all submissions to contest problems within time period.
 * @param contest
 */
async function getContestSubmissions(contest: ExtendedContestInterface) {
	const problems = contest.problems.map((e) => e.problemID);
	const submissions = await Submission.find({
		$and: [
			{ problemID: { $in: problems } },
			{
				timestamp: {
					$gte: contest.startDateAndTime,
					$lte: contest.endDateAndTime,
				},
			},
		],
	});
	return submissions;
}

function formatScores(
	submissions: Array<SubmissionInterface>,
	contest: ExtendedContestInterface
) {
	const scores: { [key: string]: { [key: string]: TotalScoreInterface } } =
		{};
	const penalties: {
		[key: string]: {
			[key: string]: {
				solved: boolean;
				timeTaken: number;
				wrongAnswers: number;
			};
		};
	} = {};
	submissions.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
	for (const submission of submissions) {
		// add keys to new users
		if (!penalties[submission.username]) {
			penalties[submission.username] = {};
		}

		if (!penalties[submission.username][submission.problemID]) {
			penalties[submission.username][submission.problemID] = {
				solved: false,
				wrongAnswers: 0,
				timeTaken: 0,
			};
		}

		// skip users who already found solutions
		if (penalties[submission.username][submission.problemID].solved) {
			continue;
		}

		if (submission.verdict == "correct answer") {
			penalties[submission.username][submission.problemID].solved = true;
			penalties[submission.username][submission.problemID].timeTaken =
				submission.timestamp.getTime() -
				contest.startDateAndTime.getTime();
		} else {
			penalties[submission.username][submission.problemID].wrongAnswers++;
		}
	}

	for (const username of Object.keys(penalties)) {
		// add keys again
		if (!scores[username]) {
			scores[username] = {};
		}

		for (const problem of contest.problems) {
			if (!scores[username][problem.problemID]) {
				scores[username][problem.problemID] = {
					solved: false,
					wrongAnswers: 0,
					timeTaken: 0,
					score: 0,
				};
			}

			const penalty = penalties[username][problem.problemID];

			// in case user hasn't attempted problem, assume everything is 0.
			if (!penalty) {
				scores[username][problem.problemID] = {
					score: 0,
					wrongAnswers: 0,
					timeTaken: 0,
					solved: false,
				};
				continue;
			}

			const lostFromTime = Math.round(
				Math.floor(
					penalty.timeTaken / contest.rules.pointsLostPer.interval
				) * contest.rules.pointsLostPer.intervalAmount
			);
			const lostFromWrongAnswers = Math.round(
				Math.floor(
					penalty.wrongAnswers /
						contest.rules.pointsLostPer.wrongAnswers
				) * contest.rules.pointsLostPer.wrongAnswersAmount
			);

			const score = penalty.solved
				? Math.max(
						contest.rules.minimumPointsPerProblem,
						problem.maximumPoints -
							lostFromTime -
							lostFromWrongAnswers
				  )
				: 0;

			scores[username][problem.problemID] = {
				score: score,
				wrongAnswers: penalty.wrongAnswers,
				timeTaken: penalty.timeTaken,
				solved: penalty.solved,
			};
		}
	}

	const finalScores: Array<LeaderboardsScore> = [];
	for (const username in scores) {
		let total = 0;
		for (const problem in scores[username]) {
			total += scores[username][problem].score;
		}
		finalScores.push({
			username: username,
			totalScore: total,
			detailed: scores[username],
		});
	}
	finalScores.sort((a, b) => b.totalScore - a.totalScore);
	return finalScores;
}

export { router };
