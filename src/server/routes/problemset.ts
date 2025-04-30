import express from "express";
import ejs from "ejs";
const router = express.Router();

router.get("/problemset", async (request: express.Request, response) => {
	response.render("pages/problemset", {
		authentication: request.authentication,
	});
});

export { router };
