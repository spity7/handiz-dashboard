const express = require("express");
const multer = require("multer");
const router = express.Router();
const {
  createService,
  getAllServices,
  getServiceById,
  updateService,
  deleteService,
} = require("../controllers/serviceController");

const storage = multer.memoryStorage();
const upload = multer({ storage });

router.post("/services", upload.single("icon"), createService);
router.get("/services", getAllServices);
router.get("/services/:id", getServiceById);
router.put("/services/:id", upload.single("icon"), updateService);
router.delete("/services/:id", deleteService);

module.exports = router;
