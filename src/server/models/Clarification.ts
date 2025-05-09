import { Model, Schema, model } from "mongoose";

interface ClarificationInterface {
  questionAskedBy: string;
  question: string;
  response: string;
  responseAnsweredBy: string;
  timestamp: Date;
}

interface ClarificationModel
  extends Model<ClarificationInterface, ClarificationModel> {
  getAccordingToQuery(
    page: number,
    amount: number,
    keepOrder?: boolean
  ): Promise<Array<ClarificationInterface>>;
}

const clarificationSchema = new Schema({
  questionAskedBy: String,
  question: String,
  response: String,
  responseAnsweredBy: String,
  timestamp: Date
});

/**
 * Gets the first/last (page*amount+1)th to ((page+1)*amount)th clarifications.
 * If `keepOrder` is `true`, gets the first clarifications, otherwise gets the most recent.
 */
clarificationSchema.static(
  "getAccordingToQuery",
  async function (page: number, amount: number, keepOrder?: boolean) {
    return await this.find({})
      .sort({ timestamp: keepOrder ? 1 : -1 })
      .skip((page - 1) * amount)
      .limit(amount);
  }
);

const Clarification = model<ClarificationModel, ClarificationModel>(
  "Clarification",
  clarificationSchema,
  "clarifications"
);

export { Clarification, ClarificationInterface };
