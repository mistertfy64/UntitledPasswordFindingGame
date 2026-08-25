import { Model, Schema, model, Types } from "mongoose";

// TODO: Add proper contest interface
interface ContestProblemInterface {
  problemID: Types.ObjectId;
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
  problems: Array<ContestProblemInterface>
});

const Contest = model<ContestModel, ContestModel>(
  "Contest",
  contestSchema,
  "contests"
);

export { Contest, ContestInterface };
