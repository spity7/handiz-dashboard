const User = require("../../models/userModel.js");

async function generateUniqueUsername(base) {
  const sanitized =
    base
      .replace(/[^a-zA-Z0-9_]/g, "")
      .toLowerCase()
      .slice(0, 20) || "user";
  let username = sanitized;
  let counter = 1;

  while (await User.findOne({ username })) {
    username = `${sanitized}${counter}`;
    counter += 1;
  }

  return username;
}

module.exports = generateUniqueUsername;
