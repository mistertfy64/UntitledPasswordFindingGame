import express from "express";
import ejs from "ejs";
import { User } from "../models/User";
import mongoSanitize from "express-mongo-sanitize";
import { isAuthenticated } from "../utilities/authentication";
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

export { router };
