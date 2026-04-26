const express = require("express");
const multer = require("multer");
const router = express.Router();
const {
  createAiTool,
  getAllAiTools,
  getAiToolById,
  updateAiTool,
  deleteAiTool,
  deleteAiToolImage,
} = require("../controllers/aiToolController");
const {
  listCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} = require("../controllers/aiPromptCategoryController");

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 20 * 1024 * 1024, // 20MB per file
    files: 30, // allow up to 30 files total
  },
});

router.get("/aiTools/categories", listCategories);
router.post("/aiTools/categories", createCategory);
router.put("/aiTools/categories/:categoryId", updateCategory);
router.delete("/aiTools/categories/:categoryId", deleteCategory);

router.post(
  "/aiTools",
  upload.fields([{ name: "thumbnail", maxCount: 1 }]),
  createAiTool,
);
router.get("/aiTools", getAllAiTools);
router.get("/aiTools/:id", getAiToolById);
router.put(
  "/aiTools/:id",
  upload.fields([{ name: "thumbnail", maxCount: 1 }]),
  updateAiTool,
);
router.delete("/aiTools/:id", deleteAiTool);
router.delete("/aiTools/:id/gallery", deleteAiToolImage);

module.exports = router;
