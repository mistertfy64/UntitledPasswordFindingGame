import mongoSanitize from "express-mongo-sanitize";
import { User } from "../models/User";
import { sha384 } from "./hashing";

async function isAuthenticated(username: string, token: string) {
  if (!username || !token) {
    return { ok: false, username: null, isAdministrator: false };
  }
  const sanitizedUsername = mongoSanitize.sanitize(username as any);
  const user = await User.findOne({ username: sanitizedUsername });
  if (!user) {
    return { ok: false, username: null, isAdministrator: false };
  }
  let tokenResult = false;
  const hashed = await sha384(token);
  for (const userToken of user.tokens) {
    // const result = await bcrypt.compare(token, userToken);
    if (hashed === userToken) {
      tokenResult = true;
      break;
    }
  }
  if (!tokenResult) {
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
