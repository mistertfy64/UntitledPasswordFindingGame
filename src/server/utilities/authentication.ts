import mongoSanitize from "express-mongo-sanitize";
import { User } from "../models/User";
import { sha384 } from "./hashing";

async function isAuthenticated(username: string, token: string) {
  const NOT_GOOD = {
    ok: false,
    username: null,
    isAdministrator: false,
    statistics: {
      correctAnswers: []
    }
  };
  if (!username || !token) {
    return NOT_GOOD;
  }
  const sanitizedUsername = mongoSanitize.sanitize(username as any);
  const user = await User.findOne({ username: sanitizedUsername });
  if (!user) {
    return NOT_GOOD;
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
    return NOT_GOOD;
  }
  const isAdministrator = user.isAdministrator;
  return {
    ok: true,
    username: sanitizedUsername,
    isAdministrator: isAdministrator ?? false,
    statistics: {
      correctAnswers: user.correctAnswers
    }
  };
}

export { isAuthenticated };
