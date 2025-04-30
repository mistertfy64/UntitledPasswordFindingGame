import express from "express";
import mongoSanitize from "express-mongo-sanitize";
import { User } from "../models/User";
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const router = express.Router();

router.get("/login", async (request: express.Request, response) => {
	if (!loggedIn()) {
		response.render("pages/login", {
			diagnosticMessage: "",
			authentication: request.authentication,
		});
	}
});

router.post("/login", async (request: express.Request, response) => {
	const username = request.body["username"];
	const password = request.body["password"];

	if (!username) {
		response.render("pages/login", {
			diagnosticMessage: "Username field is empty.",
			authentication: request.authentication,
		});
		return;
	}

	if (!password) {
		response.render("pages/login", {
			diagnosticMessage: "Password field is empty.",
			authentication: request.authentication,
		});
		return;
	}

	const sanitizedUsername = mongoSanitize.sanitize(username);
	const user = await User.findOne({ username: sanitizedUsername });

	if (!user) {
		response.render("pages/login", {
			diagnosticMessage: "Username or password is incorrect.",
			authentication: request.authentication,
		});
		return;
	}

	const passwordResult = await bcrypt.compare(password, user.passwordHash);
	if (!passwordResult) {
		response.render("pages/login", {
			diagnosticMessage: "Username or password is incorrect.",
			authentication: request.authentication,
		});
		return;
	}

	// add cookies
	const token = await crypto.randomBytes(40).toString("hex");
	response.cookie("username", username);
	response.cookie("token", token);
	await user.addToken(token);
	response.redirect("/");
});

// TODO: implement this
function loggedIn() {
	return false;
}

export { router };
