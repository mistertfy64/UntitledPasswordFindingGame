import { Model, Schema, model } from "mongoose";

interface UserInterface {
	username: string;
	lowercasedUsername: string;
	passwordHash: string;
	solved: object;
	tokens: Array<string>;
}

interface UserModel extends Model<UserInterface, UserModel> {
	findUserWithNumber(number: number): Promise<UserInterface>;
}

const userSchema = new Schema({
	username: String,
	lowercasedUsername: String,
	passwordHash: String,
	solved: Object,
	tokens: Array<String>,
});

const User = model<UserInterface, UserModel>("User", userSchema, "users");

export { User };
