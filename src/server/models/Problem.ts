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
  hidden: boolean;
  author: string;
  difficulty: number;
  category: Array<string>;
}

interface ProblemMethods {
  addCorrectAnswer(username: string, timestamp: Date): void;
}

interface ProblemModel
  extends Model<ProblemInterface, ProblemModel, ProblemMethods> {
  findProblemWithProblemID(
    problemID: string,
    solvedProblem?: boolean
  ): Promise<ProblemInterface>;
  getVisibleProblems(): Promise<Array<ProblemInterface>>;
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
  hidden: Boolean,
  author: String,
  difficulty: Number,
  category: Array<String>
});

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
  async function addCorrectAnswer(username: string, timestamp: Date) {
    await this.updateOne({
      $push: {
        correctAnswers: { username: username, timestamp: timestamp }
      }
    });
  }
);

const Problem = model<ProblemInterface, ProblemModel>(
  "Problem",
  problemSchema,
  "problems"
);

export { Problem, ProblemInterface };
