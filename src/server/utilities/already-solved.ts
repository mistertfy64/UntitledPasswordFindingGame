import { Request } from "express";
import mongoSanitize from "express-mongo-sanitize";

const alreadySolved = async function (request: Request) {
  if (!request.params.problemID) {
    return false;
  }
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
