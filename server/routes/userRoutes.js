const express = require("express");
const { googleAuth } = require("../controllers/googleAuthController");
const {
  signupUser,
  loginUser,
  logoutUser,
  getMe,
  getRoles,
  getAllEmployees,
  verifyEmail,
  exportAllEmployeesToCSV,
  exportFilteredEmployeesToCSV,
  updateEmployee,
  deleteEmployee,
  restoreEmployee,
  getUserById,
  updateProfile,
  contactUs,
} = require("../controllers/userController");
const protectRoute = require("../middlewares/protectRoute.js");
const authorizePermission = require("../middlewares/authorizePermission.js");

const router = express.Router();

router.post("/signup", signupUser);
router.get("/verify-email", verifyEmail);
router.post("/login", loginUser);
router.post("/auth/google", googleAuth);
router.post("/logout", logoutUser);
router.post("/contact-us", contactUs);

router.get("/me", protectRoute, getMe);

router.get(
  "/get-all-employees",
  protectRoute,
  authorizePermission("users:read"),
  getAllEmployees,
);

router.get(
  "/export-all-employees-to-csv",
  protectRoute,
  authorizePermission("users:manage"),
  exportAllEmployeesToCSV,
);
router.get(
  "/export-filtered-employees-to-csv",
  protectRoute,
  authorizePermission("users:manage"),
  exportFilteredEmployeesToCSV,
);
router.put(
  "/update-employee/:id",
  protectRoute,
  authorizePermission("users:manage"),
  updateEmployee,
);
router.delete(
  "/delete-employee/:id",
  protectRoute,
  authorizePermission("users:manage"),
  deleteEmployee,
);
router.patch(
  "/restore-employee/:id",
  protectRoute,
  authorizePermission("users:manage"),
  restoreEmployee,
);

router.get("/roles", protectRoute, authorizePermission("users:read"), getRoles);

router.get("/user/:id", protectRoute, getUserById);
router.put("/user/:id", protectRoute, updateProfile);

module.exports = router;
