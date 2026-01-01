import express from "express";
import { Problem, ProblemInterface } from "../models/Problem";
import markdownit from "markdown-it";
import mongoSanitize from "express-mongo-sanitize";
import { User } from "../models/User";
import { log } from "../utilities/log";
import { Submission, SubmissionInterface } from "../models/Submission";
import { alreadySolved } from "../utilities/already-solved";
import { HydratedDocument } from "mongoose";

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

    const solvedProblem = await alreadySolved(request, sanitizedProblemID);

    const problem = await Problem.findProblemWithProblemID(
      sanitizedProblemID,
      solvedProblem
    );

    if (!problem) {
      response.render("pages/404", {
        authentication: request.authentication
      });
      return;
    }

    if (
      problem.releaseDateAndTime != null &&
      problem.releaseDateAndTime > new Date() &&
      (!request.authentication.ok || !request.authentication.isAdministrator)
    ) {
      response.redirect("/problemset");
      return;
    }
    const name = problem.problemName;
    const statement = md.render(problem.problemStatement);
    const author = problem.author;

    const bypassed =
      problem.releaseDateAndTime != null &&
      problem.releaseDateAndTime > new Date() &&
      request.authentication.ok &&
      request.authentication.isAdministrator;

    problem.correctAnswers.sort(
      (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
    );

    const correctPassword = problem.correctPassword ?? "";

    response.render("pages/problem", {
      problemName: name,
      problemAuthor: author ?? "(unknown)",
      problemStatement: statement,
      authentication: request.authentication,
      correctAnswers: problem.correctAnswers,
      csrfToken: request.generatedCSRFToken,
      sessionID: request.sessionID,
      bypassed: bypassed,
      showCorrectPassword: solvedProblem,
      correctPassword: correctPassword
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

    const sent = request.body["password"];

    // Ignore answers that aren't `string`s
    if (typeof sent !== "string") {
      response.redirect(`/problem/${request.params.problemID}`);
      return;
    }

    // Ignore empty answers or answers with more than 64 characters
    if (!sent || sent.length > 64) {
      response.redirect(`/problem/${request.params.problemID}`);
      return;
    }

    const answer = sent.trim();

    const problemID = request.params.problemID;

    const problem = await Problem.findOne({
      problemID: problemID
    });

    if (!problem) {
      response.render("pages/404", {
        authentication: request.authentication
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

    const username = request.authentication.username;
    const user = await User.exists({ username: username });

    if (!user) {
      response.redirect("/login");
      return;
    }

    const timestamp = new Date();

    // create submission object
    const submission = createSubmissionObject(
      problem,
      answer,
      request.authentication.username,
      timestamp
    );

    if (problem.correctPassword !== answer) {
      // wrong answer
      await handleWrongAnswer(submission);
      log.info(`[WA] ${username} answered ${answer} to problem ${problemID}.`);
      response.render("pages/wrong-answer", {
        answer: answer,
        number: problem.problemNumber,
        problemID: request.params.problemID,
        authentication: request.authentication,
        csrfToken: request.generatedCSRFToken,
        sessionID: request.sessionID
      });
      return;
    }

    // correct answer + passed all checks
    log.info(`[AC] ${username} answered ${answer} to problem ${problemID}.`);
    await handleCorrectAnswer(submission, username, problemID);
    response.render("pages/correct-answer", {
      answer: answer,
      number: problem.problemNumber,
      problemID: problemID,
      authentication: request.authentication,
      csrfToken: request.generatedCSRFToken,
      sessionID: request.sessionID
    });
  }
);

function createSubmissionObject(
  problem: ProblemInterface,
  answer: string,
  username: string,
  timestamp: Date
) {
  const submission = new Submission();

  const number = problem?.problemNumber;
  const correctAnswer = problem.correctPassword;

  submission.problemNumber = number;
  submission.problemID = problem.problemID;
  submission.username = username;
  submission.answer = answer;
  submission.timestamp = timestamp;
  submission.verdict =
    correctAnswer === answer ? "correct answer" : "wrong answer";

  return submission;
}

async function handleWrongAnswer(
  submission: HydratedDocument<SubmissionInterface>
) {
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

async function handleCorrectAnswer(
  submission: HydratedDocument<SubmissionInterface>,
  username: string,
  problemID: string
) {
  const user = await User.findOne({ username: username });
  const problem = await Problem.findOne({ problemID: problemID });
  const isoTimestamp = submission.timestamp.toISOString();

  if (!user) {
    log.error("Unable to find user when handling correct answer.");
    return;
  }

  if (!problem) {
    log.error("Unable to find problem when handling correct answer.");
    return;
  }

  // user must not have solved problem before
  const userSolvedProblem = user.correctAnswers.some(
    (e) => e.problemID === problem.problemID
  );
  const problemHasUserAsSolved = problem.correctAnswers.some(
    (e) => e.username === user.username
  );

  if (!userSolvedProblem && !problemHasUserAsSolved) {
    user.addCorrectAnswer(problemID, submission.timestamp);
    problem.addCorrectAnswer(username, submission.timestamp);

    log.info(
      `${user.username} solved problem with ID ${problem.problemID} on ${isoTimestamp}.`
    );
  }

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
}

export { router };
