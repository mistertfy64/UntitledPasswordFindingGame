import express from "express";
import ejs from "ejs";
const router = express.Router();

router.get("/", async (request: express.Request, response) => {
	response.render("pages/index", {
		authentication: request.authentication,
	});
});

export { router };
