import { Request } from "express";
import mongoSanitize from "express-mongo-sanitize";
import { Problem } from "../models/Problem";

const alreadySolved = async function (request: Request, problemID: string) {
  if (!request.authentication.ok) {
    return false;
  }
  const sanitizedProblemID = mongoSanitize.sanitize(
    problemID as any
  );
  const problem = await Problem.findOne({ problemID: sanitizedProblemID })
    .select("_id")
    .lean();

  if (!problem) {
    return false;
  }

  return request.authentication.statistics.correctAnswers.some((answer) =>
    answer.problem.equals(problem._id)
  );
};
export { alreadySolved };
