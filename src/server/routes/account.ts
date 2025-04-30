import express from "express";
import ejs from "ejs";
const router = express.Router();

router.get("/account", async (request, response) => {
	if (!loggedIn()) {
		response.redirect("/login");
	}
});

// TODO: implement this
function loggedIn() {
	return false;
}

export { router };
