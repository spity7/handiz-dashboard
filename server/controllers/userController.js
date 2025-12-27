const User = require("../models/userModel.js");
const generateTokenAndSetCookie = require("../utils/helpers/generateTokenAndSetCookie.js");
const isPasswordComplex = require("../utils/helpers/isPasswordComplex.js");
const sendVerificationEmail = require("../utils/helpers/sendVerificationEmail.js");
const { Parser } = require("json2csv");
const moment = require("moment");
const logger = require("../config/logger.js");
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: process.env.EMAIL_USER, // Your Gmail address
    pass: process.env.EMAIL_PASS, // Your Gmail App Password
  },
  tls: {
    rejectUnauthorized: false, // Allow local dev
  },
});

exports.signupUser = async (req, res) => {
  try {
    const { firstname, lastname, email, username, password, role } = req.body;

    // Validate password complexity
    if (!isPasswordComplex(password)) {
      logger.debug(`Password isn't complex enough`);
      return res.status(400).json({
        error: "Password does not meet the complexity requirements",
        errorCode: "PASSWORD_COMPLEXITY_ERROR",
      });
    }

    // Search for the email in the database
    const userEmail = await User.findOne({ email });
    if (userEmail) {
      return res.status(400).json({ error: "Email already taken" });
    }

    // Search for the username in the database
    const userUsername = await User.findOne({ username });
    if (userUsername) {
      return res.status(400).json({ error: "Username already taken" });
    }

    // Create a new user
    const newUser = new User({
      firstname,
      lastname,
      email,
      username,
      password,
      role,
    });

    // Save the new user
    await newUser.save();

    await sendVerificationEmail(newUser);

    res.status(201).json({
      message:
        "Signup successful! Please check your email to verify your account.",
    });
  } catch (err) {
    logger.error("Error in signupUser: ", err.message);
    res.status(500).json({ error: err.message });
  }
};

exports.verifyEmail = async (req, res) => {
  try {
    const { token } = req.query;

    const user = await User.findOne({
      verificationToken: token,
      verificationTokenExpiry: { $gt: Date.now() },
    });

    if (!user) {
      return res
        .status(400)
        .json({ error: "Invalid or expired verification token" });
    }

    user.isVerified = true;
    user.verificationToken = undefined;
    user.verificationTokenExpiry = undefined;
    await user.save();

    res.status(200).json({
      message:
        "Email verified successfully! Please close this page to login to the application!",
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
    logger.error("Error in verifyEmail: ", err.message);
  }
};

exports.loginUser = async (req, res) => {
  try {
    const { emailOrUsername, password } = req.body;

    // search for user via username or email
    const user = await User.findOne({
      $or: [{ email: emailOrUsername }, { username: emailOrUsername }],
    });

    // user not found
    if (!user) {
      return res.status(400).json({
        error: "Invalid credentials. Try again!",
        errorcode: "USER_NOT_FOUND",
      });
    }

    // check password
    const isPasswordCorrect = await user.comparePassword(password);

    // password not correct
    if (!isPasswordCorrect) {
      return res.status(400).json({
        error: "Invalid credentials. Try again!",
        errorcode: "PASSWORD_NOT_CORRECT",
      });
    }

    // check if user is verified
    if (!user.isVerified) {
      return res
        .status(400)
        .json({ error: "Please verify your email before logging in." });
    }

    // generate and set JWT token
    generateTokenAndSetCookie(user._id, res);

    // successfully logged in
    logger.debug(`User ${emailOrUsername} logged in successfully.`);

    // Return the user data
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
    logger.error("Error in loginUser: ", error.message);
    res.status(500).json({ error: "An error occurred. Please try again." });
  }
};

exports.logoutUser = (req, res) => {
  try {
    res.clearCookie("jwt", {
      httpOnly: true,
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      secure: process.env.NODE_ENV === "production",
    });

    res.status(200).json({ message: "User logged out successfully" });
  } catch (err) {
    logger.error("Error in logoutUser: ", err.message);
    res.status(500).json({ error: "An error occurred. Please try again." });
  }
};

exports.getRoles = async (req, res) => {
  try {
    const roles = await User.distinct("role");
    res.status(200).json(roles);
  } catch (error) {
    res.status(500).json({ error: "Server Error" });
  }
};

exports.getAllEmployees = async (req, res) => {
  try {
    const { search, roles = [], page = 1, limit = 10 } = req.query;
    const query = { isVerified: true }; // only verified users

    if (search) {
      const searchRegex = new RegExp(search, "i"); // Case-insensitive regex
      query.$or = [
        { firstname: { $regex: searchRegex } },
        { lastname: { $regex: searchRegex } },
        {
          $expr: {
            $regexMatch: {
              input: { $concat: ["$firstname", " ", "$lastname"] },
              regex: searchRegex,
            },
          },
        },
      ];
    }

    if (roles.length > 0) {
      // ensure roles is an array of strings
      const rolesArray = Array.isArray(roles) ? roles : roles.split(",");
      query.role = { $in: rolesArray };
    }

    const employees = await User.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const total = await User.countDocuments(query);

    res
      .status(200)
      .json({ employees, total, page: Number(page), limit: Number(limit) });
  } catch (error) {
    res.status(500).json({ error: "Server Error" });
  }
};

exports.exportAllEmployeesToCSV = async (req, res) => {
  try {
    const employees = await User.find({ isVerified: true }); // only verified users

    const formattedEmployees = employees.map((employee) => ({
      firstname: employee.firstname,
      lastname: employee.lastname,
      username: employee.username,
      email: employee.email,
      role: employee.role,
      createdAt: moment(employee.createdAt).format("DD.MM.YYYY HH:mm"),
    }));

    const fields = [
      "firstname",
      "lastname",
      "username",
      "email",
      "role",
      "createdAt",
    ];
    const opts = { fields };
    const parser = new Parser(opts);
    const csv = parser.parse(formattedEmployees);

    res.header("Content-Type", "text/csv");
    res.attachment("employees.csv");
    return res.send(csv);
  } catch (error) {
    res.status(500).json({ error: "Server Error" });
  }
};

exports.exportFilteredEmployeesToCSV = async (req, res) => {
  try {
    const { search = "", roles = [] } = req.query;

    const query = { isVerified: true }; // only verified users
    if (search) {
      query.$or = [
        { firstname: { $regex: search, $options: "i" } },
        { lastname: { $regex: search, $options: "i" } },
      ];
    }

    if (roles.length > 0) {
      const rolesArray = Array.isArray(roles) ? roles : roles.split(",");
      query.role = { $in: rolesArray };
    }

    const employees = await User.find(query);

    const formattedEmployees = employees.map((employee) => ({
      firstname: employee.firstname,
      lastname: employee.lastname,
      username: employee.username,
      email: employee.email,
      role: employee.role,
      createdAt: moment(employee.createdAt).format("DD.MM.YYYY HH:mm"),
    }));

    const fields = [
      "firstname",
      "lastname",
      "username",
      "email",
      "role",
      "createdAt",
    ];
    const opts = { fields };
    const parser = new Parser(opts);
    const csv = parser.parse(formattedEmployees);

    res.header("Content-Type", "text/csv");
    res.attachment("filtered_employees.csv");
    return res.send(csv);
  } catch (error) {
    logger.error("Error exporting filtered employees:", error);
    res.status(500).json({ error: "Server Error" });
  }
};

exports.updateEmployee = async (req, res) => {
  try {
    const { id } = req.params;
    const { firstname, lastname, username, role } = req.body;

    // Find the current user being updated
    const currentUser = await User.findById(id);

    if (!currentUser) {
      return res.status(404).json({ error: "Employee not found" });
    }

    const usernameTaken = await User.findOne({ username, _id: { $ne: id } });

    if (usernameTaken) {
      return res.status(400).json({ error: "Username already taken" });
    }

    // Proceed with updating the employee
    const updatedEmployee = await User.findByIdAndUpdate(
      id,
      { firstname, lastname, username, role },
      { new: true, runValidators: true }
    );

    if (!updatedEmployee) {
      return res.status(404).json({ error: "Employee not found" });
    }

    res.status(200).json(updatedEmployee);
  } catch (error) {
    res.status(500).json({ error: "Server Error" });
  }
};

exports.deleteEmployee = async (req, res) => {
  try {
    const { id } = req.params;

    // Versuche, den Mitarbeiter zu finden und zu löschen
    const deletedEmployee = await User.findByIdAndDelete(id);

    if (!deletedEmployee) {
      return res.status(404).json({ error: "Employee not found" });
    }

    res.status(200).json({ message: "Employee deleted successfully" });
  } catch (error) {
    logger.error("Error deleting employee:", error);
    res.status(500).json({ error: "Server Error" });
  }
};

// Get user details by ID
exports.getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: "Server Error" });
  }
};

// Update profile details by ID
exports.updateProfile = async (req, res) => {
  try {
    const { id } = req.params;
    const { firstname, lastname, username } = req.body;

    const currentUser = await User.findById(id);

    if (!currentUser) {
      return res.status(404).json({ error: "User not found" });
    }

    // Check if the new username is already taken by another user
    const usernameTaken = await User.findOne({ username, _id: { $ne: id } });

    if (usernameTaken) {
      return res.status(400).json({ error: "Username already taken" });
    }

    const updatedUser = await User.findByIdAndUpdate(
      id,
      { firstname, lastname, username },
      { new: true, runValidators: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ error: "User not found" });
    }

    res.status(200).json(updatedUser);
  } catch (error) {
    res.status(500).json({ error: "Server Error" });
  }
};

exports.deleteUnverifiedUsers = async () => {
  try {
    const oneHourAgo = Date.now() - 3600000; // 1 hour in millisecs

    // Find and delete all users whose verification token has expired
    await User.deleteMany({
      verificationTokenExpiry: { $lt: oneHourAgo },
      isVerified: false,
    });

    logger.info("Unverified users deleted successfully.");
  } catch (error) {
    logger.error("Error deleting unverified users:", error.message);
  }
};

exports.contactUs = async (req, res) => {
  try {
    const { name, email, phone, subject, message } = req.body;

    if (!name || !email || !phone || !subject || !message) {
      return res.status(400).json({ message: "All fields are required." });
    }

    logger.info(
      `Contact form submitted: ${name} (${email}, ${phone}) - ${subject}: ${message}`
    );

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: "info@milaresidence.com",
      subject: `Contact Form: ${subject}`,
      text: `Name: ${name}\nEmail: ${email}\nPhone: ${phone}\nSubject: ${subject}\nMessage: ${message}`,
    };

    await transporter.sendMail(mailOptions);

    res
      .status(200)
      .json({ message: "Your message has been sent successfully!" });
  } catch (error) {
    logger.error("Contact form error:", error);
    res.status(500).json({ message: "Failed to send your message." });
  }
};
