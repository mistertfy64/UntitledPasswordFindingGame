import express from "express";
import ejs from "ejs";
import { User } from "../models/User";
import mongoSanitize from "express-mongo-sanitize";
import { isAuthenticated } from "../utilities/authentication";
import { log } from "../utilities/log";
const router = express.Router();

router.get("/account", async (request: express.Request, response) => {
	if (!request.authentication.ok) {
		response.redirect("/login");
		return;
	}

	const username = request.authentication.username;
	const sanitizedUsername = mongoSanitize.sanitize(username as any);
	const user = await User.safeFindByUsername(username);

	if (!user) {
		response.redirect("/login");
		return;
	}

	response.render("pages/account", {
		username: sanitizedUsername,
		data: user,
		authentication: request.authentication,
		csrfToken: request.generatedCSRFToken,
		sessionID: request.sessionID,
	});
});

router.get("/account/settings", async (request: express.Request, response) => {
	if (!request.authentication.ok) {
		response.redirect("/login");
		return;
	}

	const username = request.authentication.username;
	const sanitizedUsername = mongoSanitize.sanitize(username as any);
	const user = await User.safeFindByUsernameWithEmail(sanitizedUsername);

	if (!user) {
		response.redirect("/login");
		return;
	}

	response.render("pages/account-settings", {
		username: sanitizedUsername,
		data: user,
		authentication: request.authentication,
		csrfToken: request.generatedCSRFToken,
		sessionID: request.sessionID,
		email: user.email,
	});
});

router.post("/account/settings", async (request: express.Request, response) => {
	if (!request.authentication.ok) {
		response.redirect("/login");
		return;
	}

	const username = request.authentication.username;
	const sanitizedUsername = mongoSanitize.sanitize(username as any);
	const user = await User.findOne({ username: sanitizedUsername });

	if (!user) {
		response.redirect("/login");
		return;
	}

	const newEmail = request.body["email"];
	const sanitizedNewEmail = mongoSanitize.sanitize(newEmail);
	try {
		user.setNewEmail(sanitizedNewEmail);
	} catch (error: unknown) {
		if (error instanceof Error) {
			log.error(
				`Unable to set new e-mail address for user ${user.username}\n${error.stack}`
			);
		} else {
			log.error(
				`Unable to set new e-mail address for user ${user.username}\n${error}`
			);
		}

		response.redirect("/account/settings");
		return;
	}

	log.info(`Successfully set new e-mail address for user ${user.username}`);
	response.redirect("/account/settings");
});

export { router };
