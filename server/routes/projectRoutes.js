const express = require("express");
const multer = require("multer");
const router = express.Router();
const {
  createProject,
  getAllProjects,
  getProjectById,
  updateProject,
  deleteProject,
  deleteProjectImage,
} = require("../controllers/projectController");

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 20 * 1024 * 1024, // 20MB per file
    files: 30, // allow up to 30 files total
  },
});

router.post(
  "/projects",
  upload.fields([
    { name: "thumbnail", maxCount: 1 },
    { name: "gallery", maxCount: 30 },
  ]),
  createProject
);
router.get("/projects", getAllProjects);
router.get("/projects/:id", getProjectById);
router.put(
  "/projects/:id",
  upload.fields([
    { name: "thumbnail", maxCount: 1 },
    { name: "gallery", maxCount: 30 },
  ]),
  updateProject
);
router.delete("/projects/:id", deleteProject);
router.delete("/projects/:id/gallery", deleteProjectImage);

module.exports = router;
