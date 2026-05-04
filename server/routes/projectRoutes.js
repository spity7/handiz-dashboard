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
const {
  listConcepts,
  createConcept,
  updateConcept,
  deleteConcept,
} = require("../controllers/studentProjectConceptController");
const {
  listTypes,
  createType,
  updateType,
  deleteType,
} = require("../controllers/studentProjectTypeController");
const {
  listCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} = require("../controllers/studentProjectCategoryController");
const {
  listYears,
  createYear,
  updateYear,
  deleteYear,
} = require("../controllers/studentProjectYearController");
const {
  listLocations,
  createLocation,
  updateLocation,
  deleteLocation,
} = require("../controllers/studentProjectLocationController");
const {
  listUniversities,
  createUniversity,
  updateUniversity,
  deleteUniversity,
} = require("../controllers/studentProjectUniversityController");

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 20 * 1024 * 1024, // 20MB per file
    files: 30, // allow up to 30 files total
  },
});

// Concept management endpoints
router.get("/projects/concepts", listConcepts);
router.post("/projects/concepts", createConcept);
router.put("/projects/concepts/:conceptId", updateConcept);
router.delete("/projects/concepts/:conceptId", deleteConcept);

// Type management endpoints
router.get("/projects/types", listTypes);
router.post("/projects/types", createType);
router.put("/projects/types/:typeId", updateType);
router.delete("/projects/types/:typeId", deleteType);

// Category management endpoints
router.get("/projects/categories", listCategories);
router.post("/projects/categories", createCategory);
router.put("/projects/categories/:categoryId", updateCategory);
router.delete("/projects/categories/:categoryId", deleteCategory);

// Year management endpoints
router.get("/projects/years", listYears);
router.post("/projects/years", createYear);
router.put("/projects/years/:yearId", updateYear);
router.delete("/projects/years/:yearId", deleteYear);

// Location management endpoints
router.get("/projects/locations", listLocations);
router.post("/projects/locations", createLocation);
router.put("/projects/locations/:locationId", updateLocation);
router.delete("/projects/locations/:locationId", deleteLocation);

// University management endpoints
router.get("/projects/universities", listUniversities);
router.post("/projects/universities", createUniversity);
router.put("/projects/universities/:universityId", updateUniversity);
router.delete("/projects/universities/:universityId", deleteUniversity);

// Project endpoints
router.post(
  "/projects",
  upload.fields([
    { name: "thumbnail", maxCount: 1 },
    { name: "gallery", maxCount: 30 },
    { name: "blockImages", maxCount: 50 },
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
    { name: "blockImages", maxCount: 50 },
  ]),
  updateProject
);
router.delete("/projects/:id", deleteProject);
router.delete("/projects/:id/gallery", deleteProjectImage);

module.exports = router;
