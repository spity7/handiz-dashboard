const express = require("express");
const router = express.Router();
const protectRoute = require("../middlewares/protectRoute");
const authorizePermission = require("../middlewares/authorizePermission");
const {
  createRequest,
  getAllRequests,
  getMyRequests,
  reviewRequest,
} = require("../controllers/userActionRequestController");

router.post(
  "/user-action-requests",
  protectRoute,
  authorizePermission("userRequests:submit"),
  createRequest,
);

router.get(
  "/user-action-requests",
  protectRoute,
  authorizePermission("userRequests:review"),
  getAllRequests,
);

router.get(
  "/user-action-requests/mine",
  protectRoute,
  authorizePermission("userRequests:submit"),
  getMyRequests,
);

router.patch(
  "/user-action-requests/:id",
  protectRoute,
  authorizePermission("userRequests:review"),
  reviewRequest,
);

module.exports = router;
