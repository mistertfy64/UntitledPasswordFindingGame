import express from "express";
import ejs from "ejs";
const router = express.Router();

router.get("/account", async (request: express.Request, response) => {
	if (!request.authentication.ok) {
		response.redirect("/login");
	}
	// ...
	response.redirect("/");
});

export { router };
