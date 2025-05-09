import mongoSanitize from "express-mongo-sanitize";
import { User } from "../models/User";
const bcrypt = require("bcrypt");

async function isAuthenticated(username: string, token: string) {
  if (!username || !token) {
    return { ok: false, username: null, isAdministrator: false };
  }
  const sanitizedUsername = mongoSanitize.sanitize(username as any);
  const user = await User.findOne({ username: sanitizedUsername });
  if (!user) {
    return { ok: false, username: null, isAdministrator: false };
  }
  const tokenResult = await user.tokens.findIndex(
    async (e) => await bcrypt.compare(token, e)
  );
  if (tokenResult === -1) {
    return { ok: false, username: null, isAdministrator: false };
  }
  const isAdministrator = user.isAdministrator;
  return {
    ok: true,
    username: sanitizedUsername,
    isAdministrator: isAdministrator ?? false
  };
}

export { isAuthenticated };
