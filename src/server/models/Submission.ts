import { Model, Schema, model } from "mongoose";

interface SubmissionInterface {
	username: string;
	answer: string;
	verdict: "accepted" | "wrong answer" | "ignored";
	problemNumber: number;
	problemID: string;
}

interface SubmissionModel extends Model<SubmissionInterface, SubmissionModel> {}

const submissionSchema = new Schema({
	username: String,
	answer: String,
	verdict: String,
	problemNumber: Number,
	problemID: String,
});

const Submission = model<SubmissionModel, SubmissionModel>(
	"Submission",
	submissionSchema,
	"submissions"
);

export { Submission };
