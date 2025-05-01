import express, { NextFunction, Request, Response } from "express";
import crypto from "crypto";
import { log } from "./server/utilities/log";
import path from "path";
import mongoose from "mongoose";
import bodyParser from "body-parser";
import { isAuthenticated } from "./server/utilities/authentication";
import { doubleCsrf } from "csrf-csrf";

require("dotenv").config();

declare global {
	namespace Express {
		interface Request {
			authentication: {
				ok: boolean;
				username: string;
			};
		}
	}
}

const {
	invalidCsrfTokenError,
	generateCsrfToken,
	validateRequest,
	doubleCsrfProtection,
} = doubleCsrf({
	getSecret: (req) => crypto.randomBytes(32).toString("hex"),
	getSessionIdentifier: (request: express.Request) =>
		request.body["csrf-token"],
});

const app = express();
const cookieParser = require("cookie-parser");
app.set("trust proxy", 2);
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "server/views"));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname + "/public"));
app.use(cookieParser());
app.use(doubleCsrfProtection);
app.use(bodyParser.json());

const loggedIn = async function (
	request: express.Request,
	response: express.Response,
	next: NextFunction
) {
	const username = request.cookies["username"];
	const token = request.cookies["token"];
	request.authentication = await isAuthenticated(username, token);
	next();
};

app.use(loggedIn);

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

app.all("*splat", function (request: Request, response: Response) {
	response.status(404).render(__dirname + "/server/views/pages/404");
});

app.listen(process.env.PORT, () => {
	mongoose.connect(process.env.DATABASE_URI as string);
	log.info(`App listening at http://localhost:${process.env.PORT}`);
});
