import { Model, Schema, model } from "mongoose";
import { sha384 } from "../utilities/hashing";
const bcrypt = require("bcrypt");

interface UserCorrectAnswerInterface {
  problemID: string;
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
  addToken(token: string): void;
  addCorrectAnswer(problemID: string, timestamp: Date): void;
  setNewEmail(newEmail: string): void;
}

interface UserModel extends Model<UserInterface, UserModel, UserMethods> {
  safeFindByUsername(username: string): Promise<UserInterface>;
  safeFindByUsernameWithEmail(username: string): Promise<UserInterface>;
}

const userSchema = new Schema({
  username: String,
  lowercasedUsername: String,
  passwordHash: String,
  correctAnswers: Array<UserCorrectAnswerInterface>,
  tokens: Array<String>,
  email: String,
  creationDateAndTime: Date,
  isAdministrator: Boolean,
  isContributor: Boolean
});

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
  async function addCorrectAnswer(problemID: string, timestamp: Date) {
    await this.updateOne({
      $push: {
        correctAnswers: { problemID: problemID, timestamp: timestamp }
      }
    });
  }
);

userSchema.method("setNewEmail", async function setNewEmail(newEmail) {
  await this.updateOne({ email: newEmail });
});

const User = model<UserInterface, UserModel>("User", userSchema, "users");

export { User, UserCorrectAnswerInterface };
