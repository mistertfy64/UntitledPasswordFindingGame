import { NextFunction, Request, Response } from "express";
import mongoSanitize from "express-mongo-sanitize";

const alreadySolved = async function (
  request: Request,
  response: Response,
  next: NextFunction
) {
  if (!request.authentication.ok) {
    return false;
  }
  const correctAnswers = request.authentication.statistics.correctAnswers.map(
    (e) => e.problemID
  );
  const sanitizedProblemID = mongoSanitize.sanitize(
    request.params.problemID as any
  );
  return correctAnswers.indexOf(sanitizedProblemID) > -1;
};
export { alreadySolved };
