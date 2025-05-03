import { Model, Schema, model } from "mongoose";

interface ContestProblemInterface {
	problemID: string;
	maximumPoints: number;
}

interface ContestInterface {
	contestID: string;
	contestName: string;
	startDateAndTime: Date;
	endDateAndTime: Date;
	rules: {
		pointsLostPer: {
			interval: number; // milliseconds
			intervalAmount: number;
			wrongAnswers: number;
			wrongAnswersAmount: number;
		};
		minimumPointsPerProblem: number;
	};
	participants: Array<string>;
	problems: Array<ContestProblemInterface>;
}

interface ContestModel extends Model<ContestInterface, ContestModel> {}

const contestSchema = new Schema({
	contestID: String,
	contestName: String,
	startDateAndTime: Date,
	endDateAndTime: Date,
	timestamp: Date,
	rules: {
		pointsLostPer: {
			interval: Number,
			intervalAmount: Number,
			wrongAnswers: Number,
			wrongAnswersAmount: Number,
		},
		minimumPointsPerProblem: Number,
	},
	participants: Array<String>,
	problems: Array<ContestProblemInterface>,
});

const Contest = model<ContestModel, ContestModel>(
	"Contest",
	contestSchema,
	"contests"
);

export { Contest, ContestInterface };
