import express from "express";
import ejs from "ejs";
const router = express.Router();

router.get("/problemset", async (request, response) => {
	response.render("pages/problemset");
});

export { router };
