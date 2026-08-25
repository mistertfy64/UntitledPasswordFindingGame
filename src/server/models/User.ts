import { Model, Schema, Types, model } from "mongoose";
import { sha384 } from "../utilities/hashing";

interface UserCorrectAnswerInterface {
  problem: Types.ObjectId;
  timestamp: Date;
}
interface UserInterface {
  username: string;
  lowercasedUsername: string;
  passwordHash: string;
  correctAnswers: Array<UserCorrectAnswerInterface>;
  tokens: Array<string>;
  email: string;
  creationDateAndTime: Date;
  isAdministrator: boolean;
  isContributor: boolean;
}

interface UserMethods {
  addToken(token: string): Promise<void>;
  addCorrectAnswer(problem: Types.ObjectId, timestamp: Date): Promise<void>;
  setNewEmail(newEmail: string): Promise<void>;
}

interface UserModel extends Model<UserInterface, UserModel, UserMethods> {
  safeFindByUsername(username: string): Promise<UserInterface>;
  safeFindByUsernameWithEmail(username: string): Promise<UserInterface>;
}

const userSchema = new Schema({
  username: String,
  lowercasedUsername: String,
  passwordHash: String,
  correctAnswers: [
    new Schema<UserCorrectAnswerInterface>(
      {
        problem: {
          type: Schema.Types.ObjectId,
          ref: "Problem",
          required: true
        },
        timestamp: { type: Date, required: true }
      },
      { _id: false }
    )
  ],
  tokens: Array<String>,
  email: String,
  creationDateAndTime: Date,
  isAdministrator: Boolean,
  isContributor: Boolean
});

userSchema.virtual("submissions",{
  ref: "Submission",
  localField: "_id",
  foreignField: "user"
})

userSchema.static("safeFindByUsername", async function (username: string) {
  return await this.findOne({ username: username }).select({
    "passwordHash": 0,
    "tokens": 0,
    "email": 0
  });
});

userSchema.static(
  "safeFindByUsernameWithEmail",
  async function (username: string) {
    return await this.findOne({ username: username }).select({
      "passwordHash": 0,
      "tokens": 0
    });
  }
);

userSchema.method("addToken", async function addToken(token) {
  const hashedToken: string = await sha384(token);
  await this.updateOne({
    $push: {
      tokens: hashedToken
    }
  });
});

userSchema.method(
  "addCorrectAnswer",
  async function addCorrectAnswer(problem: Types.ObjectId, timestamp: Date) {
    await this.updateOne({
      $push: {
        correctAnswers: { problem, timestamp }
      }
    });
  }
);

userSchema.method("setNewEmail", async function setNewEmail(newEmail) {
  await this.updateOne({ email: newEmail });
});

const User = model<UserInterface, UserModel>("User", userSchema, "users");

export { User, UserCorrectAnswerInterface, UserInterface, UserModel, UserMethods };
