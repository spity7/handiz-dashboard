const express = require("express");
const router = express.Router();
const {
  handleWhishSuccessCallback,
  handleWhishFailureCallback,
} = require("../controllers/paymentController");

router.get("/webhooks/whish/success", handleWhishSuccessCallback);
router.get("/webhooks/whish/failure", handleWhishFailureCallback);

module.exports = router;
