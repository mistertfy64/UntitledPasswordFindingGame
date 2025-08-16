import express from "express";
import markdownit from "markdown-it";
import { Announcement } from "../models/Announcement";

const router = express.Router();
const md = markdownit();

router.get("/", async (request: express.Request, response) => {
  const announcements = await Announcement.getVisibleAnnouncements(5);
  for (const announcement of announcements) {
    announcement.body = md.render(announcement.body);
  }
  response.render("pages/index", {
    authentication: request.authentication,
    csrfToken: request.generatedCSRFToken,
    sessionID: request.sessionID,
    announcements: announcements
  });
});

export { router };
