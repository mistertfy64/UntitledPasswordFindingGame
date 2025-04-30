import express, { NextFunction, Request, Response } from "express";
import ejs from "ejs";
import { log } from "./server/utilities/log";
import path from "path";

const app = express();
app.set("trust proxy", 2);
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "server/views"));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname + "/public"));

// TODO: move port to .env file
const PORT = 12345;

// Routes
require("fs")
	.readdirSync(path.join(__dirname, "./server/routes"))
	.forEach((file: string) => {
		const route = require("path").join(__dirname, "./server/routes", file);
		app.use(require(route).router);
	});

// PUT THIS LAST (404 page)
app.get("*splat", function (request: Request, response: Response) {
	response.status(404).render(__dirname + "/server/views/pages/404");
});

app.listen(PORT, () => {
	log.info(`App listening at http://localhost:${PORT}`);
});
