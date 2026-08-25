import { Model, Schema, model, Types } from "mongoose";
import { UserInterface } from "./User";

interface ProblemCorrectAnswerInterface {
  user: Types.ObjectId;
  timestamp: Date;
}

interface PopulatedProblemCorrectAnswerInterface {
  user: UserInterface;
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
  hidden: boolean;
  author: Types.ObjectId;
  difficulty?: number;
  categories?: Array<string>;
}

interface ProblemMethods {
  addCorrectAnswer(user: UserInterface, timestamp: Date): void;
}

interface ProblemModel
  extends Model<ProblemInterface, ProblemModel, ProblemMethods> {
  findProblemWithProblemID(
    problemID: string,
    solvedProblem?: boolean
  ): Promise<ProblemInterface>;
  getVisibleProblems(): Promise<Array<ProblemInterface>>;
}

const problemSchema = new Schema<ProblemInterface>({
  problemName: String,
  problemStatement: String,
  problemID: String,
  correctPassword: String,
  problemNumber: Number,
  correctAnswers: Array<ProblemCorrectAnswerInterface>,
  creationDateAndTime: Date,
  releaseDateAndTime: Date,
  hidden: Boolean,
  author: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  difficulty: Number,
  categories: { type: [String], default: [] }
});

problemSchema.virtual("submissions", {
  ref: "Submission",
  localField: "_id",
  foreignField: "problem"
})

problemSchema.static(
  "findProblemWithProblemID",
  async function (problemID: string, showCorrectPassword?: boolean) {
    if (showCorrectPassword) {
      return await this.findOne({ problemID: problemID }).lean();
    } else {
      return await this.findOne({ problemID: problemID })
        .select({
          "correctPassword": 0
        })
        .lean();
    }
  }
);

problemSchema.static("getVisibleProblems", async function (problemID: string) {
  const currentTime = Date.now();
  return await this.find({
    $and: [
      { $nor: [{ hidden: true }] },
      {
        $or: [
          { releaseDateAndTime: { $lte: currentTime } },
          { releaseDateAndTime: undefined },
          { releaseDateAndTime: null }
        ]
      }
    ]
  })
    .select({
      "correctPassword": 0
    })
    .lean();
});

problemSchema.method(
  "addCorrectAnswer",
  async function addCorrectAnswer(user: UserInterface, timestamp: Date) {
    await this.updateOne({
      $push: {
        correctAnswers: { user: user, timestamp: timestamp }
      }
    });
  }
);

const Problem = model<ProblemInterface, ProblemModel>(
  "Problem",
  problemSchema,
  "problems"
);

export { Problem, ProblemInterface, ProblemModel, ProblemCorrectAnswerInterface };
