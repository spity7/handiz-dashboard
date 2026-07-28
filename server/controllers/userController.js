const User = require("../models/userModel.js");
const Project = require("../models/projectModel.js");
const { ROLES } = require("../constants/permissions");
const generateTokenAndSetCookie = require("../utils/helpers/generateTokenAndSetCookie.js");
const { getCookieOptions } = require("../utils/helpers/cookieOptions.js");
const isPasswordComplex = require("../utils/helpers/isPasswordComplex.js");
const sendVerificationEmail = require("../utils/helpers/sendVerificationEmail.js");
const { Parser } = require("json2csv");
const moment = require("moment");
const logger = require("../config/logger.js");
const nodemailer = require("nodemailer");
const {
  normalizeMobileCountryCode,
  normalizeLocalMobileNumber,
  isValidMobileCountryCode,
  isValidLocalMobileNumber,
  normalizeInstagramUrl,
  isValidInstagramUrl,
  isValidHttpUrl,
  normalizeOptionalHttpUrl,
  formatUserAuthResponse,
} = require("../utils/userProfile");

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
    const { firstname, lastname, email, username, password } = req.body;

    // Validate password complexity
    if (!isPasswordComplex(password)) {
      logger.debug(`Password isn't complex enough`);
      return res.status(400).json({
        error: "Password does not meet the complexity requirements",
        errorCode: "PASSWORD_COMPLEXITY_ERROR",
      });
    }

    // Search for the email in the database
    const userEmail = await User.findOneWithDeleted({ email });
    if (userEmail) {
      return res.status(400).json({ error: "Email already taken" });
    }

    const userUsername = await User.findOneWithDeleted({ username });
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
      role: ROLES.USER,
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

    // search for user via username or email (include soft-deleted to return a clear error)
    const user = await User.findOneWithDeleted({
      $or: [{ email: emailOrUsername }, { username: emailOrUsername }],
    });

    // user not found
    if (!user) {
      return res.status(400).json({
        error: "Invalid credentials. Try again!",
        errorcode: "USER_NOT_FOUND",
      });
    }

    if (user.deletedAt) {
      return res.status(403).json({
        error: "This account has been deactivated. Contact an administrator.",
        errorcode: "ACCOUNT_DEACTIVATED",
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
    res.status(200).json(formatUserAuthResponse(user));
  } catch (error) {
    logger.error("Error in loginUser: ", error.message);
    res.status(500).json({ error: "An error occurred. Please try again." });
  }
};

exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("-password");
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    res.status(200).json(formatUserAuthResponse(user));
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
};

exports.logoutUser = (req, res) => {
  try {
    res.clearCookie("jwt", getCookieOptions());

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
    const query = { isVerified: true };

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

    const employees = await User.findWithDeleted(query)
      .select("-password")
      .sort({ deletedAt: 1, createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .lean();

    const total = await User.findWithDeleted(query).countDocuments();

    const employeeIds = employees.map((employee) => employee._id);
    const projectCounts = employeeIds.length
      ? await Project.aggregate([
          { $match: { createdBy: { $in: employeeIds } } },
          { $group: { _id: "$createdBy", count: { $sum: 1 } } },
        ])
      : [];
    const countByUserId = new Map(
      projectCounts.map(({ _id, count }) => [String(_id), count]),
    );

    const employeesWithCounts = employees.map((employee) => ({
      ...employee,
      projectCount: countByUserId.get(String(employee._id)) || 0,
    }));

    res.status(200).json({
      employees: employeesWithCounts,
      total,
      page: Number(page),
      limit: Number(limit),
    });
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
    const { role } = req.body;

    const currentUser = await User.findById(id);

    if (!currentUser) {
      return res.status(404).json({ error: "Employee not found" });
    }

    if (currentUser.role === ROLES.ADMIN) {
      return res.status(400).json({ error: "Admin role cannot be changed" });
    }

    if (!role || role === currentUser.role) {
      return res.status(200).json(currentUser);
    }

    const updatedEmployee = await User.findByIdAndUpdate(
      id,
      { role },
      { new: true, runValidators: true },
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

    const target = await User.findById(id);
    if (!target) {
      return res.status(404).json({ error: "Employee not found" });
    }
    if (target.role === ROLES.ADMIN) {
      return res
        .status(400)
        .json({ error: "Admin accounts cannot be deleted" });
    }

    const deletedEmployee = await target.softDelete();

    res.status(200).json({ message: "Employee deleted successfully" });
  } catch (error) {
    logger.error("Error deleting employee:", error);
    res.status(500).json({ error: "Server Error" });
  }
};

exports.restoreEmployee = async (req, res) => {
  try {
    const { id } = req.params;

    const target = await User.findOneWithDeleted({ _id: id });
    if (!target) {
      return res.status(404).json({ error: "Employee not found" });
    }
    if (!target.deletedAt) {
      return res.status(400).json({ error: "Account is not deleted" });
    }

    const restoredEmployee = await target.restore();

    res.status(200).json({
      message: "Employee restored successfully",
      employee: restoredEmployee,
    });
  } catch (error) {
    logger.error("Error restoring employee:", error);
    res.status(500).json({ error: "Server Error" });
  }
};

// Get user details by ID
exports.getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-password");
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    if (
      req.user.role === ROLES.EDITOR &&
      user.role !== ROLES.USER &&
      String(user._id) !== String(req.user._id)
    ) {
      return res.status(403).json({ error: "Forbidden" });
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
    const {
      firstname,
      lastname,
      username,
      mobileCountryCode,
      mobileNumber,
      instagramUrl,
      avatarUrl,
      bio,
      location,
      facebookUrl,
      xUrl,
    } = req.body;

    if (req.user.role !== ROLES.ADMIN && String(req.user._id) !== String(id)) {
      return res
        .status(403)
        .json({ error: "You can only update your own profile" });
    }

    const currentUser = await User.findById(id);

    if (!currentUser) {
      return res.status(404).json({ error: "User not found" });
    }

    const updates = {};

    if (firstname !== undefined) updates.firstname = firstname;
    if (lastname !== undefined) updates.lastname = lastname;

    if (username !== undefined) {
      const usernameTaken = await User.findOneWithDeleted({
        username,
        _id: { $ne: id },
      });

      if (usernameTaken) {
        return res.status(400).json({ error: "Username already taken" });
      }

      updates.username = username;
    }

    if (mobileCountryCode !== undefined || mobileNumber !== undefined) {
      if (mobileCountryCode === undefined || mobileNumber === undefined) {
        return res.status(400).json({
          error: "Both mobile country code and mobile number are required.",
        });
      }

      const normalizedCode = normalizeMobileCountryCode(mobileCountryCode);
      const normalizedNumber = normalizeLocalMobileNumber(mobileNumber);

      if (!normalizedCode) {
        return res
          .status(400)
          .json({ error: "Mobile country code cannot be empty" });
      }
      if (!normalizedNumber) {
        return res.status(400).json({ error: "Mobile number cannot be empty" });
      }
      if (!isValidMobileCountryCode(mobileCountryCode)) {
        return res.status(400).json({
          error: "Please enter a valid country code (e.g. 961 or +961).",
        });
      }
      if (!isValidLocalMobileNumber(mobileNumber)) {
        return res.status(400).json({
          error: "Please enter a valid mobile number (4–12 digits).",
        });
      }

      updates.mobileCountryCode = normalizedCode;
      updates.mobileNumber = normalizedNumber;
    }

    if (instagramUrl !== undefined) {
      const trimmedInstagram = String(instagramUrl).trim();
      if (!trimmedInstagram) {
        return res.status(400).json({ error: "Instagram URL cannot be empty" });
      }
      if (!isValidInstagramUrl(trimmedInstagram)) {
        return res.status(400).json({
          error:
            "Please enter a valid Instagram URL or username (e.g. @handle or https://instagram.com/handle).",
        });
      }
      updates.instagramUrl = normalizeInstagramUrl(trimmedInstagram);
    }

    if (avatarUrl !== undefined) {
      const normalized = normalizeOptionalHttpUrl(avatarUrl);
      if (normalized && !isValidHttpUrl(normalized)) {
        return res
          .status(400)
          .json({ error: "Please enter a valid avatar URL." });
      }
      updates.avatarUrl = normalized;
    }

    if (bio !== undefined) {
      updates.bio = String(bio).trim();
    }

    if (location !== undefined) {
      updates.location = String(location).trim();
    }

    if (facebookUrl !== undefined) {
      const normalized = normalizeOptionalHttpUrl(facebookUrl);
      if (normalized && !isValidHttpUrl(normalized)) {
        return res
          .status(400)
          .json({ error: "Please enter a valid Facebook URL." });
      }
      updates.facebookUrl = normalized;
    }

    if (xUrl !== undefined) {
      const normalized = normalizeOptionalHttpUrl(xUrl);
      if (normalized && !isValidHttpUrl(normalized)) {
        return res.status(400).json({ error: "Please enter a valid X URL." });
      }
      updates.xUrl = normalized;
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: "No profile fields to update" });
    }

    const updatedUser = await User.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true,
    }).select("-password");

    if (!updatedUser) {
      return res.status(404).json({ error: "User not found" });
    }

    res.status(200).json(formatUserAuthResponse(updatedUser));
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
      `Contact form submitted: ${name} (${email}, ${phone}) - ${subject}: ${message}`,
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
