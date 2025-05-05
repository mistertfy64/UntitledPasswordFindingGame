import express from "express";
const router = express.Router();

router.get("/logout", async (request: express.Request, response) => {
  response.cookie("username", "");
  response.cookie("token", "");
  response.redirect("/");
});

export { router };
