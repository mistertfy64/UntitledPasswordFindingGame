import { Model, Schema, model } from "mongoose";

interface ClarificationInterface {
  questionAskedBy: string;
  question: string;
  response: string | null;
  responseAnsweredBy: string | null;
  timestampOnAsk: Date;
  timestampOnAnswer: Date | null;
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
  timestampOnAsk: Date,
  timestampOnAnswer: Date
});

/**
 * Gets the first/last (page*amount+1)th to ((page+1)*amount)th clarifications.
 * If `keepOrder` is `true`, gets the first clarifications, otherwise gets the most recent.
 */
clarificationSchema.static(
  "getAccordingToQuery",
  async function (page: number, amount: number, keepOrder?: boolean) {
    return await this.find({ response: null })
      .sort({ timestampOnAsk: keepOrder ? 1 : -1 })
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
