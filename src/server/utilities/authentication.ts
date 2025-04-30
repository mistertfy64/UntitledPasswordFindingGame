import mongoSanitize from "express-mongo-sanitize";
import { User } from "../models/User";
const bcrypt = require("bcrypt");

async function isAuthenticated(username: string, token: string) {
	if (!username || !token) {
		return { ok: false, username: null };
	}
	const sanitizedUsername = mongoSanitize.sanitize(username as any);
	const user = await User.findOne({ username: sanitizedUsername });
	if (!user) {
		return { ok: false, username: null };
	}
	const tokenResult = await bcrypt.compare(token, user.tokens[0]);
	if (!tokenResult) {
		return { ok: false, username: null };
	}
	return { ok: true, username: sanitizedUsername };
}

export { isAuthenticated };
