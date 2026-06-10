const express = require("express");
const multer = require("multer");
const router = express.Router();
const {
  createCompetition,
  getAllCompetitions,
  getCompetitionById,
  updateCompetition,
  deleteCompetition,
  deleteCompetitionImage,
} = require("../controllers/competitionController");
const protectCmsWrite = require("../middlewares/protectCmsWrite");

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 20 * 1024 * 1024, // 20MB per file
    files: 30, // allow up to 30 files total
  },
});

router.post(
  "/competitions",
  protectCmsWrite,
  upload.fields([
    { name: "thumbnail", maxCount: 1 },
    { name: "gallery", maxCount: 30 },
  ]),
  createCompetition,
);
router.get("/competitions", getAllCompetitions);
router.get("/competitions/:id", getCompetitionById);
router.put(
  "/competitions/:id",
  protectCmsWrite,
  upload.fields([
    { name: "thumbnail", maxCount: 1 },
    { name: "gallery", maxCount: 30 },
  ]),
  updateCompetition,
);
router.delete("/competitions/:id", protectCmsWrite, deleteCompetition);
router.delete(
  "/competitions/:id/gallery",
  protectCmsWrite,
  deleteCompetitionImage,
);

module.exports = router;
