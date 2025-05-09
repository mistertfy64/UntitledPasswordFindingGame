import { Model, Schema, model } from "mongoose";

interface SubmissionInterface {
  username: string;
  answer: string;
  verdict: "correct answer" | "wrong answer" | "ignored";
  problemNumber: number;
  problemID: string;
  timestamp: Date;
}

interface SubmissionModel extends Model<SubmissionInterface, SubmissionModel> {}

const submissionSchema = new Schema({
  username: String,
  answer: String,
  verdict: String,
  problemNumber: Number,
  problemID: String,
  timestamp: Date
});

const Submission = model<SubmissionModel, SubmissionModel>(
  "Submission",
  submissionSchema,
  "submissions"
);

export { Submission, SubmissionInterface };
