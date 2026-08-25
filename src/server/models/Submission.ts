import { Model, Schema, model, Types } from "mongoose";

interface SubmissionInterface {
  answer: string;
  verdict: "correct answer" | "wrong answer" | "ignored";
  timestamp: Date;
  problem: Types.ObjectId;
  user: Types.ObjectId;
}

interface SubmissionModel extends Model<SubmissionInterface, SubmissionModel> {
  getAccordingToQuery(
    page: number,
    amount: number,
    keepOrder?: boolean
  ): Promise<Array<SubmissionInterface>>;
  getByProblemIDAccordingToQuery(
    problemID: string,
    page: number,
    amount: number,
    keepOrder?: boolean
  ): Promise<Array<SubmissionInterface>>;
  getByUsernameAccordingToQuery(
    username: string,
    page: number,
    amount: number,
    keepOrder?: boolean
  ): Promise<Array<SubmissionInterface>>;
}

const submissionSchema = new Schema({
  answer: String,
  verdict: String,
  problem: {
    type: Schema.Types.ObjectId,
    ref: "Problem",
    required: true
  },
  timestamp: Date,
  user: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true
  }
});

/**
 * Gets the first/last (page*amount+1)th to ((page+1)*amount)th submissions.
 * If `keepOrder` is `true`, gets the first submissions, otherwise gets the most recent.
 */
submissionSchema.static(
  "getAccordingToQuery",
  async function (page: number, amount: number, keepOrder?: boolean) {
    return await this.find({})
      .sort({ timestamp: keepOrder ? 1 : -1 })
      .skip((page - 1) * amount)
      .limit(amount);
  }
);

submissionSchema.static(
  "getByProblemIDAccordingToQuery",
  async function (
    problemID: string,
    page: number,
    amount: number,
    keepOrder?: boolean
  ) {
    return await this.find({ problemID: problemID })
      .sort({ timestamp: keepOrder ? 1 : -1 })
      .skip((page - 1) * amount)
      .limit(amount);
  }
);

submissionSchema.static(
  "getByUsernameAccordingToQuery",
  async function (
    username: string,
    page: number,
    amount: number,
    keepOrder?: boolean
  ) {
    return await this.find({ username: username })
      .sort({ timestamp: keepOrder ? 1 : -1 })
      .skip((page - 1) * amount)
      .limit(amount);
  }
);

const Submission = model<SubmissionModel, SubmissionModel>(
  "Submission",
  submissionSchema,
  "submissions"
);

export { Submission, SubmissionInterface, SubmissionModel };
