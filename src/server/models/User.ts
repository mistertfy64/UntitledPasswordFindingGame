import { Model, Schema, model } from "mongoose";
const bcrypt = require("bcrypt");

interface UserInterface {
	username: string;
	lowercasedUsername: string;
	passwordHash: string;
	solved: object;
	tokens: Array<string>;
}

interface UserMethods {
	addToken(token: string): void;
}
interface UserModel extends Model<UserInterface, UserModel, UserMethods> {
	findUserWithNumber(number: number): Promise<UserInterface>;
}

const userSchema = new Schema({
	username: String,
	lowercasedUsername: String,
	passwordHash: String,
	solved: Object,
	tokens: Array<String>,
});

userSchema.method("addToken", async function addToken(token) {
	const hashedToken: string = await bcrypt.hash(token, 8);
	await this.updateOne({ tokens: [hashedToken] });
});

const User = model<UserInterface, UserModel>("User", userSchema, "users");

export { User };
