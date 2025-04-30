import { Model, Schema, model } from "mongoose";

interface ProblemInterface {
	problemName: string;
	problemStatement: string;
	number: number;
	correctPassword: string;
}

interface ProblemModel extends Model<ProblemInterface, ProblemModel> {
	findProblemWithNumber(number: number): Promise<ProblemInterface>;
}

const problemSchema = new Schema({
	problemName: String,
	problemStatement: String,
	number: Number,
	correctPassword: String,
});

problemSchema.static("findProblemWithNumber", async function (number: number) {
	return await this.findOne({ number: number }).select({
		"correctPassword": 0,
	});
});

const Problem = model<ProblemInterface, ProblemModel>(
	"Problem",
	problemSchema,
	"problems"
);

export { Problem };
