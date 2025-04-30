import { Model, Schema, model } from "mongoose";

interface ProblemInterface {
	problemName: string;
	problemStatement: string;
	number: number;
}

interface ProblemModel extends Model<ProblemInterface, ProblemModel> {
	findProblemWithNumber(number: number): Promise<ProblemInterface>;
}

const problemSchema = new Schema({
	problemName: String,
	problemStatement: String,
	number: Number,
});

problemSchema.static("findProblemWithNumber", async function (number: number) {
	return await this.findOne({ number: number }).select({
		"password": 0,
	});
});

const Problem = model<ProblemInterface, ProblemModel>(
	"Problem",
	problemSchema,
	"problems"
);

export { Problem };
