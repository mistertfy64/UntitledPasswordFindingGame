import { Model, Schema, model } from "mongoose";

interface ContestInterface {
	contestID: string;
	contestName: string;
	startDateAndTime: Date;
	endDateAndTime: Date;
	rules: {
		pointsLostPer: {
			interval: number;
			intervalAmount: number;
			wrongAnswers: number;
			wrongAnswersAmount: number;
		};
	};
	participants: Array<string>;
}

interface ContestModel extends Model<ContestInterface, ContestModel> {}

const contestSchema = new Schema({
	username: String,
	answer: String,
	verdict: String,
	problemNumber: Number,
	problemID: String,
	timestamp: Date,
	rules: {
		pointsLostPer: {
			interval: Number,
			intervalAmount: Number,
			wrongAnswers: Number,
			wrongAnswersAmount: Number,
		},
	},
	participants: Array<String>,
});

const Contest = model<ContestModel, ContestModel>(
	"Contest",
	contestSchema,
	"contests"
);

export { Contest };
