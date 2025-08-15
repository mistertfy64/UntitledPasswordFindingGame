import express from "express";
import ejs from "ejs";
import { Problem } from "../models/Problem";
const router = express.Router();

router.get("/problemset", async (request: express.Request, response) => {
  const problems = await Problem.getVisibleProblems();
  problems.sort((a, b) => a.problemNumber - b.problemNumber);
  const detail = await getDetailToShow(request);
  response.render("pages/problemset", {
    authentication: request.authentication,
    problems: problems,
    csrfToken: request.generatedCSRFToken,
    sessionID: request.sessionID,
    detail: detail
  });
});

async function getDetailToShow(request: express.Request) {
  const detail = request.query.detail;
  switch (detail) {
    case "solved": {
      return { header: "Solved", value: "solved" };
    }
    case "difficulty": {
      return { header: "Difficulty", value: "difficulty" };
    }
    case "categories": {
      return { header: "Categories", value: "categories" };
    }
    default: {
      return { header: "Solved", value: "solved" };
    }
  }
}

export { router };
