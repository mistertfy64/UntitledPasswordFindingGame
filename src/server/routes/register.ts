import express from "express";
import { User } from "../models/User";
import { log } from "../utilities/log";
const bcrypt = require("bcrypt");
const router = express.Router();
const SALT_ROUNDS = 12;

router.get("/register", async (request, response) => {
	if (!loggedIn()) {
		if (process.env.ENVIRONMENT !== "production") {
			// testing credentials
			response.render("pages/register", {
				recaptchaSiteKey: process.env.TESTING_RECAPTCHA_SITE_KEY,
				diagnosticMessage: "",
			});
		} else {
			// real credentials
			response.render("pages/register", {
				recaptchaSiteKey: process.env.RECAPTCHA_SITE_KEY,
				diagnosticMessage: "",
			});
		}
		return;
	}
	response.redirect("/account");
});

router.post("/register", async (request, response) => {
	// validate credentials
	const username = request.body["username"];
	const password = request.body["password"];
	const confirmPassword = request.body["confirm-password"];

	const result = await validateRegistration(
		username,
		password,
		confirmPassword,
		request.body["g-recaptcha-response"]
	);

	if (!result.ok) {
		// TODO: DRY
		if (process.env.ENVIRONMENT !== "production") {
			// testing credentials
			response.render("pages/register", {
				recaptchaSiteKey: process.env.TESTING_RECAPTCHA_SITE_KEY,
				diagnosticMessage: result.reason,
			});
		} else {
			// real credentials
			response.render("pages/register", {
				recaptchaSiteKey: process.env.RECAPTCHA_SITE_KEY,
				diagnosticMessage: result.reason,
			});
		}
		return;
	}

	const createResult = createNewUser(username, password);

	if (!createResult) {
		// TODO: DRY
		if (process.env.ENVIRONMENT !== "production") {
			// testing credentials
			response.render("pages/register", {
				recaptchaSiteKey: process.env.TESTING_RECAPTCHA_SITE_KEY,
				diagnosticMessage:
					"Unable to create user account due to an internal error. If this persists, please contact mistertfy64.",
			});
		} else {
			// real credentials
			response.render("pages/register", {
				recaptchaSiteKey: process.env.RECAPTCHA_SITE_KEY,
				diagnosticMessage:
					"Unable to create user account due to an internal error. If this persists, please contact mistertfy64.",
			});
		}
		return;
	}

	response.redirect("/login");
});

async function validateRegistration(
	username: string,
	password: string,
	confirmPassword: string,
	captchaResponse: unknown
) {
	// validate captcha
	if (!validateCaptcha(captchaResponse)) {
		return {
			ok: false,
			reason: "reCAPTCHA not completed.",
		};
	}

	if (!username) {
		return {
			ok: false,
			reason: "Username field is empty.",
		};
	}

	if (!password) {
		return {
			ok: false,
			reason: "Password field is empty.",
		};
	}

	if (!confirmPassword) {
		return {
			ok: false,
			reason: "Confirm password field is empty.",
		};
	}

	if (password)
		if (password !== confirmPassword) {
			return {
				ok: false,
				reason: "Passwords do not match.",
			};
		}

	if (username.length < 3 || username.length > 20) {
		return {
			ok: false,
			reason: "Usernames can only be 3 to 20 characters long.",
		};
	}

	if (password.length < 8 || password.length > 32) {
		return {
			ok: false,
			reason: "Passwords can only be 8 to 32 characters long.",
		};
	}

	const usernameRegex = /^[A-Za-z0-9_\-]{3,20}$/;
	if (!usernameRegex.test(username)) {
		return {
			ok: false,
			reason: "Usernames can only contain alphanumeric characters, underscores, and/or dashes.",
		};
	}

	const duplicateUser = await User.findOne({
		lowercasedUsername: username.toLowerCase(),
	});

	if (duplicateUser) {
		return {
			ok: false,
			reason: "Username is already taken.",
		};
	}

	return {
		ok: true,
		reason: "All checks passed.",
	};
}

async function validateCaptcha(captchaResponse: unknown) {
	let secretKey = "";
	if (process.env.ENVIRONMENT !== "production") {
		secretKey = process.env.TESTING_RECAPTCHA_SECRET_KEY as string;
	} else {
		secretKey = process.env.RECAPTCHA_SECRET_KEY as string;
	}
	const url = `https://www.google.com/recaptcha/api/siteverify?secret=${secretKey}&response=${captchaResponse}`;
	const result: any = (await fetch(url)).json();
	if (!result.success) {
		return false;
	}
	return true;
}

async function createNewUser(username: string, password: string) {
	const user = new User();
	user.username = username;
	user.lowercasedUsername = username.toLowerCase();
	user.solved = {};
	user.passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

	try {
		user.save();
	} catch (error: unknown) {
		if (error instanceof Error) {
			log.error("Unable to create user: ", error.stack);
		} else {
			log.error("Unable to create user: ", error);
		}
		return false;
	}

	log.info(`New user with username ${username} created.`);
	return true;
}

// TODO: implement this
function loggedIn() {
	return false;
}

export { router };
