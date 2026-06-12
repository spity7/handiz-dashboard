const crypto = require("crypto");
const { OAuth2Client } = require("google-auth-library");
const User = require("../models/userModel.js");
const { ROLES } = require("../constants/permissions");
const generateTokenAndSetCookie = require("../utils/helpers/generateTokenAndSetCookie.js");
const generateUniqueUsername = require("../utils/helpers/generateUniqueUsername.js");
const logger = require("../config/logger.js");

const getGoogleClient = () => {
  if (!process.env.GOOGLE_CLIENT_ID) {
    throw new Error("GOOGLE_CLIENT_ID is not configured");
  }
  return new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
};

exports.googleAuth = async (req, res) => {
  try {
    const { credential } = req.body;

    if (!credential) {
      return res.status(400).json({ error: "Google credential is required" });
    }

    const client = getGoogleClient();
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const {
      sub: googleId,
      email,
      given_name: givenName,
      family_name: familyName,
      email_verified: emailVerified,
    } = payload;

    if (!email) {
      return res.status(400).json({ error: "Google account email is missing" });
    }

    if (!emailVerified) {
      return res.status(400).json({ error: "Google email is not verified" });
    }

    let user = await User.findOne({ googleId });

    if (!user) {
      user = await User.findOne({ email });

      if (user) {
        if (user.googleId && user.googleId !== googleId) {
          return res.status(400).json({
            error: "This email is linked to a different Google account",
          });
        }

        user.googleId = googleId;
        user.isVerified = true;
        await user.save();
      } else {
        const username = await generateUniqueUsername(email.split("@")[0]);
        user = new User({
          firstname: givenName || "Google",
          lastname: familyName || "User",
          email,
          username,
          googleId,
          password: crypto.randomBytes(32).toString("hex"),
          role: ROLES.USER,
          isVerified: true,
        });
        await user.save();
      }
    }

    generateTokenAndSetCookie(user._id, res);

    logger.debug(`User ${email} logged in with Google.`);

    res.status(200).json({
      _id: user._id,
      firstname: user.firstname,
      lastname: user.lastname,
      email: user.email,
      username: user.username,
      role: user.role,
      isVerified: user.isVerified,
    });
  } catch (error) {
    logger.error("Error in googleAuth: ", error.message);
    res.status(401).json({ error: "Google authentication failed" });
  }
};
