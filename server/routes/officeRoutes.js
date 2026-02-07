const express = require("express");
const multer = require("multer");
const router = express.Router();
const {
  createOffice,
  getAllOffices,
  getOfficeById,
  updateOffice,
  deleteOffice,
  deleteOfficeImage,
} = require("../controllers/officeController");

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 20 * 1024 * 1024, // 20MB per file
    files: 30, // allow up to 30 files total
  },
});

router.post(
  "/offices",
  upload.fields([{ name: "thumbnail", maxCount: 1 }]),
  createOffice,
);
router.get("/offices", getAllOffices);
router.get("/offices/:id", getOfficeById);
router.put(
  "/offices/:id",
  upload.fields([{ name: "thumbnail", maxCount: 1 }]),
  updateOffice,
);
router.delete("/offices/:id", deleteOffice);
router.delete("/offices/:id/gallery", deleteOfficeImage);

module.exports = router;
