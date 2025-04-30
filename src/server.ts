import express, { NextFunction, Request, Response } from "express";
import ejs from "ejs";
import { log } from "./server/utilities/log";
import path from "path";
import mongoose from "mongoose";
require("dotenv").config();

const app = express();
app.set("trust proxy", 2);
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "server/views"));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname + "/public"));

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

app.listen(process.env.PORT, () => {
	mongoose.connect(process.env.DATABASE_URI as string);
	log.info(`App listening at http://localhost:${process.env.PORT}`);
});
