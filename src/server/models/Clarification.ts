import { Model, Schema, model, Types } from "mongoose";

interface ClarificationInterface {
  questionAskedBy: Types.ObjectId;
  question: string;
  response: string | null;
  responseAnsweredBy: Types.ObjectId | null;
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
  questionAskedBy: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  question: String,
  response: String,
  responseAnsweredBy: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
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
