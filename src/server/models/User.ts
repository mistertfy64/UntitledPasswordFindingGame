import { Model, Schema, model } from "mongoose";
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
}

interface UserMethods {
	setToken(token: string): void;
	addCorrectAnswer(problemID: string, timestamp: Date): void;
}

interface UserModel extends Model<UserInterface, UserModel, UserMethods> {
	safeFindByUsername(username: string): Promise<UserInterface>;
}

const userSchema = new Schema({
	username: String,
	lowercasedUsername: String,
	passwordHash: String,
	correctAnswers: Array<UserCorrectAnswerInterface>,
	tokens: Array<String>,
});

userSchema.static("safeFindByUsername", async function (username: string) {
	return await this.findOne({ username: username }).select({
		"passwordHash": 0,
		"tokens": 0,
	});
});

userSchema.method("setToken", async function addToken(token) {
	const hashedToken: string = await bcrypt.hash(token, 8);
	await this.updateOne({ tokens: [hashedToken] });
});

userSchema.method(
	"addCorrectAnswer",
	async function addCorrectAnswer(problemID: string, timestamp: Date) {
		await this.updateOne({
			$push: {
				correctAnswers: { problemID: problemID, timestamp: timestamp },
			},
		});
	}
);

const User = model<UserInterface, UserModel>("User", userSchema, "users");

export { User };
