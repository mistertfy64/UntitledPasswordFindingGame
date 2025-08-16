import express from "express";
import markdownit from "markdown-it";
import { Announcement } from "../models/Announcement";
import DOMPurify from "dompurify";
import { JSDOM } from "jsdom";

const router = express.Router();
const md = markdownit({ html: false });
const window = new JSDOM("").window;
const purify = DOMPurify(window);

router.get("/", async (request: express.Request, response) => {
  const announcements = await Announcement.getVisibleAnnouncements(5);
  for (const announcement of announcements) {
    const rendered = md.render(announcement.body);
    announcement.sanitizedBody = purify.sanitize(rendered, {
      USE_PROFILES: { html: true }
    });
  }
  response.render("pages/index", {
    authentication: request.authentication,
    csrfToken: request.generatedCSRFToken,
    sessionID: request.sessionID,
    announcements: announcements
  });
});

export { router };
