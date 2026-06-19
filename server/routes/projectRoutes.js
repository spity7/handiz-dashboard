const express = require("express");
const multer = require("multer");
const router = express.Router();
const {
  createProject,
  getAllProjects,
  getProjectsList,
  getProjectById,
  updateProject,
  deleteProject,
  deleteProjectImage,
  restoreProject,
  permanentlyDeleteProject,
  publishProject,
  unpublishProject,
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

const protectRoute = require("../middlewares/protectRoute");
const authorizePermission = require("../middlewares/authorizePermission");
const optionalAuth = require("../middlewares/optionalAuth");
const {
  loadProject,
  requireProjectWrite,
  requireProjectPublish,
} = require("../middlewares/canAccessProject");

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 20 * 1024 * 1024,
    files: 30,
  },
});

const taxonomyWrite = [
  protectRoute,
  authorizePermission("studentProjects:taxonomy"),
];

// Taxonomy — public read, protected write
router.get("/projects/concepts", listConcepts);
router.post("/projects/concepts", ...taxonomyWrite, createConcept);
router.put("/projects/concepts/:conceptId", ...taxonomyWrite, updateConcept);
router.delete("/projects/concepts/:conceptId", ...taxonomyWrite, deleteConcept);

router.get("/projects/types", listTypes);
router.post("/projects/types", ...taxonomyWrite, createType);
router.put("/projects/types/:typeId", ...taxonomyWrite, updateType);
router.delete("/projects/types/:typeId", ...taxonomyWrite, deleteType);

router.get("/projects/categories", listCategories);
router.post("/projects/categories", ...taxonomyWrite, createCategory);
router.put(
  "/projects/categories/:categoryId",
  ...taxonomyWrite,
  updateCategory,
);
router.delete(
  "/projects/categories/:categoryId",
  ...taxonomyWrite,
  deleteCategory,
);

router.get("/projects/years", listYears);
router.post("/projects/years", ...taxonomyWrite, createYear);
router.put("/projects/years/:yearId", ...taxonomyWrite, updateYear);
router.delete("/projects/years/:yearId", ...taxonomyWrite, deleteYear);

router.get("/projects/locations", listLocations);
router.post("/projects/locations", ...taxonomyWrite, createLocation);
router.put("/projects/locations/:locationId", ...taxonomyWrite, updateLocation);
router.delete(
  "/projects/locations/:locationId",
  ...taxonomyWrite,
  deleteLocation,
);

router.get("/projects/universities", listUniversities);
router.post("/projects/universities", ...taxonomyWrite, createUniversity);
router.put(
  "/projects/universities/:universityId",
  ...taxonomyWrite,
  updateUniversity,
);
router.delete(
  "/projects/universities/:universityId",
  ...taxonomyWrite,
  deleteUniversity,
);

// Public list for handiz.org (Published only)
router.get("/projects/list", getProjectsList);

// Dashboard project routes
router.post(
  "/projects",
  protectRoute,
  authorizePermission("studentProjects:create"),
  upload.fields([
    { name: "thumbnail", maxCount: 1 },
    { name: "gallery", maxCount: 30 },
    { name: "blockImages", maxCount: 50 },
  ]),
  createProject,
);

router.get(
  "/projects",
  protectRoute,
  authorizePermission("studentProjects:read"),
  getAllProjects,
);

router.get("/projects/:id", optionalAuth, getProjectById);

router.put(
  "/projects/:id",
  protectRoute,
  loadProject,
  requireProjectWrite,
  upload.fields([
    { name: "thumbnail", maxCount: 1 },
    { name: "gallery", maxCount: 30 },
    { name: "blockImages", maxCount: 50 },
  ]),
  updateProject,
);

router.patch(
  "/projects/:id/publish",
  protectRoute,
  loadProject,
  requireProjectPublish,
  publishProject,
);

router.patch(
  "/projects/:id/unpublish",
  protectRoute,
  loadProject,
  requireProjectPublish,
  unpublishProject,
);

router.patch("/projects/:id/restore", protectRoute, restoreProject);

router.delete(
  "/projects/:id/permanent",
  protectRoute,
  permanentlyDeleteProject,
);

router.delete(
  "/projects/:id",
  protectRoute,
  loadProject,
  requireProjectWrite,
  deleteProject,
);

router.delete(
  "/projects/:id/gallery",
  protectRoute,
  loadProject,
  requireProjectWrite,
  deleteProjectImage,
);

module.exports = router;
