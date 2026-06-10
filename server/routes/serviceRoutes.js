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
const protectCmsWrite = require("../middlewares/protectCmsWrite");

const storage = multer.memoryStorage();
const upload = multer({ storage });

router.post("/services", protectCmsWrite, upload.single("icon"), createService);
router.get("/services", getAllServices);
router.get("/services/:id", getServiceById);
router.put(
  "/services/:id",
  protectCmsWrite,
  upload.single("icon"),
  updateService,
);
router.delete("/services/:id", protectCmsWrite, deleteService);

module.exports = router;
