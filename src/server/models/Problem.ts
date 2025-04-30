import { Model, Schema, model } from "mongoose";

interface ProblemInterface {
	problemName: string;
	problemStatement: string;
	problemID: string;
	correctPassword: string;
	number: number;
}

interface ProblemModel extends Model<ProblemInterface, ProblemModel> {
	findProblemWithProblemID(problemID: string): Promise<ProblemInterface>;
}

const problemSchema = new Schema({
	problemName: String,
	problemStatement: String,
	problemID: String,
	correctPassword: String,
	number: Number,
});

problemSchema.static(
	"findProblemWithProblemID",
	async function (problemID: string) {
		return await this.findOne({ problemID: problemID }).select({
			"correctPassword": 0,
		});
	}
);

const Problem = model<ProblemInterface, ProblemModel>(
	"Problem",
	problemSchema,
	"problems"
);

export { Problem };
