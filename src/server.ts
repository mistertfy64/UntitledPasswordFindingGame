import express, {
	ErrorRequestHandler,
	NextFunction,
	Request,
	Response,
} from "express";
import crypto from "crypto";
import { log } from "./server/utilities/log";
import path from "path";
import mongoose from "mongoose";
import bodyParser from "body-parser";
import { isAuthenticated } from "./server/utilities/authentication";
import { CsrfTokenGeneratorRequestUtil, doubleCsrf } from "csrf-csrf";
import { rateLimit } from "express-rate-limit";
const favicon = require("serve-favicon");
const session = require("cookie-session");
require("@dotenvx/dotenvx").config();

declare global {
	namespace Express {
		interface Request {
			authentication: {
				ok: boolean;
				username: string;
			};
			session: string;
			generatedCSRFToken: string;
		}
	}
}

const limiter = rateLimit({
	windowMs: 10 * 60 * 1000,
	limit: 100,
	standardHeaders: "draft-8",
	legacyHeaders: false, // Disable the `X-RateLimit-*` headers.
});

const {
	invalidCsrfTokenError,
	generateCsrfToken,
	validateRequest,
	doubleCsrfProtection,
} = doubleCsrf({
	getSecret: () => process.env.CSRF_SECRET as string,
	getSessionIdentifier: (request: express.Request) => request.session,
	cookieName:
		process.env.ENVIRONMENT === "production"
			? "__Host-psifi.x-csrf-token"
			: "testing",
	getCsrfTokenFromRequest: (request) => request.body?.["x-csrf-token"],
});

const loggedIn = async function (
	request: express.Request,
	response: express.Response,
	next: NextFunction
) {
	const username = request?.cookies?.["username"];
	const token = request?.cookies?.["token"];
	request.authentication = await isAuthenticated(username, token);
	next();
};

const setSessionID = async function (
	request: express.Request,
	response: express.Response,
	next: NextFunction
) {
	request.sessionID = crypto.randomBytes(32).toString("hex");
	next();
};

const setCSRFToken = async function (
	request: express.Request,
	response: express.Response,
	next: NextFunction
) {
	const csrfToken = generateCsrfToken(request, response);
	request.generatedCSRFToken = csrfToken;
	next();
};

const errorHandling: ErrorRequestHandler = async function (
	error,
	request: express.Request,
	response: express.Response,
	next: NextFunction
) {
	log.error(error.stack);
	if (error.status === 400) {
		response.status(400).render(__dirname + "/server/views/pages/400");
		return;
	}
	if (error.status === 403) {
		response.status(403).render(__dirname + "/server/views/pages/403");
		return;
	}
	if (error.status === 404) {
		response.status(404).render(__dirname + "/server/views/pages/404");
		return;
	}
	if (error.status === 500) {
		response.status(500).render(__dirname + "/server/views/pages/500");
		return;
	}
	response.status(500).render(__dirname + "/server/views/pages/500");
};

const app = express();
const cookieParser = require("cookie-parser");
app.set("trust proxy", 2);
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "server/views"));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname + "/public"));
app.use(
	session({
		secret: crypto.randomBytes(32).toString("hex"),
		resave: false,
		saveUninitialized: true,
		cookie: { secure: process.env.ENVIRONMENT === "production" },
	})
);
app.use(cookieParser());
app.use(bodyParser.json());
app.use(setCSRFToken);
app.use(loggedIn);
app.use(doubleCsrfProtection);
app.use(errorHandling);
app.use(limiter);
app.use(favicon(path.join(__dirname, "public", "favicon.ico")));

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
