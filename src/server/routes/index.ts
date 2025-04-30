import express from "express";
import ejs from "ejs";
const router = express.Router();

router.get("/", async (request, response) => {
	response.render("pages/index");
});

export { router };
