import { Model, Schema, model } from "mongoose";

interface SubmissionInterface {
  username: string;
  answer: string;
  verdict: "correct answer" | "wrong answer" | "ignored";
  problemNumber: number;
  problemID: string;
  timestamp: Date;
}

interface SubmissionModel extends Model<SubmissionInterface, SubmissionModel> {
  getAccordingToQuery(
    page: number,
    amount: number,
    keepOrder?: boolean
  ): Promise<Array<SubmissionInterface>>;
}

const submissionSchema = new Schema({
  username: String,
  answer: String,
  verdict: String,
  problemNumber: Number,
  problemID: String,
  timestamp: Date
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

const Submission = model<SubmissionModel, SubmissionModel>(
  "Submission",
  submissionSchema,
  "submissions"
);

export { Submission, SubmissionInterface };
