import { Model, Schema, model } from "mongoose";

interface ProblemCorrectAnswerInterface {
	username: string;
	timestamp: Date;
}
interface ProblemInterface {
	problemName: string;
	problemStatement: string;
	problemID: string;
	correctPassword: string;
	problemNumber: number;
	correctAnswers: Array<ProblemCorrectAnswerInterface>;
	creationDateAndTime: Date;
	releaseDateAndTime: Date;
}

interface ProblemMethods {
	addCorrectAnswer(username: string, timestamp: Date): void;
}

interface ProblemModel
	extends Model<ProblemInterface, ProblemModel, ProblemMethods> {
	findProblemWithProblemID(problemID: string): Promise<ProblemInterface>;
	getProblems(): Promise<Array<ProblemInterface>>;
}

const problemSchema = new Schema({
	problemName: String,
	problemStatement: String,
	problemID: String,
	correctPassword: String,
	problemNumber: Number,
	correctAnswers: Array<ProblemCorrectAnswerInterface>,
	creationDateAndTime: Date,
	releaseDateAndTime: Date,
});

problemSchema.static(
	"findProblemWithProblemID",
	async function (problemID: string) {
		return await this.findOne({ problemID: problemID }).select({
			"correctPassword": 0,
		});
	}
);

problemSchema.static("getProblems", async function (problemID: string) {
	return await this.find({}).select({
		"correctPassword": 0,
	});
});

problemSchema.method(
	"addCorrectAnswer",
	async function addCorrectAnswer(username: string, timestamp: Date) {
		await this.updateOne({
			$push: {
				correctAnswers: { username: username, timestamp: timestamp },
			},
		});
	}
);

const Problem = model<ProblemInterface, ProblemModel>(
	"Problem",
	problemSchema,
	"problems"
);

export { Problem };
