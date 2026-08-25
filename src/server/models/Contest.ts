import { Model, Schema, model, Types } from "mongoose";
import { ProblemInterface } from "./Problem";

// TODO: Add proper contest interface
interface ContestProblemInterface {
  problem: Types.ObjectId;
  maximumPoints: number;
}

interface PopulatedContestProblemInterface {
  problem: ProblemInterface & { _id: Types.ObjectId };
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
  participants: Array<Types.ObjectId>;
  problems: Array<ContestProblemInterface>;
  timestamp: Date;
}

interface PopulatedContestInterface {
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
  participants: Array<Types.ObjectId>;
  problems: Array<PopulatedContestProblemInterface>;
  timestamp: Date;
}

interface ContestModel extends Model<ContestInterface, ContestModel> {}

const contestProblemSchema = new Schema<ContestProblemInterface>(
  {
    problem: {
      type: Schema.Types.ObjectId,
      ref: "Problem",
      required: true
    },
    maximumPoints: { type: Number, required: true }
  },
  { _id: false }
);

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
      wrongAnswersAmount: Number
    },
    minimumPointsPerProblem: Number
  },
  participants: [
    {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true
    }
  ],
  problems: [contestProblemSchema]
});

const Contest = model<ContestModel, ContestModel>(
  "Contest",
  contestSchema,
  "contests"
);

export { Contest, ContestInterface, PopulatedContestInterface };
