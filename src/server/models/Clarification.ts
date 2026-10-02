import { Model, Schema, model, Types } from "mongoose";
import { UserInterface } from "./User";

interface ClarificationInterface {
  questionAskedBy: Types.ObjectId;
  question: string;
  response: string | null;
  responseAnsweredBy: Types.ObjectId | null;
  timestampOnAsk: Date;
  timestampOnAnswer: Date | null;
}

type PopulatedClarificationInterface = Omit<
  ClarificationInterface,
  "questionAskedBy" | "responseAnsweredBy"
> & {
  questionAskedBy: Pick<UserInterface, "username">;
  responseAnsweredBy: Pick<UserInterface, "username"> | null;
};

interface ClarificationModel
  extends Model<ClarificationInterface, ClarificationModel> {
  getAccordingToQuery(
    page: number,
    amount: number,
    keepOrder?: boolean
  ): Promise<Array<PopulatedClarificationInterface>>;
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
    default: null
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
      .populate({ path: "questionAskedBy", select: "username" })
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

export {
  Clarification,
  ClarificationInterface,
  PopulatedClarificationInterface
};
