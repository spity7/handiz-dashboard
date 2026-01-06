const AiTool = require("../models/aiToolModel");
const { uploadImage, deleteImage } = require("../utils/gcs");

exports.createAiTool = async (req, res) => {
  try {
    const { title, link, category, order } = req.body;
    const thumbnailFile = req.files?.thumbnail?.[0];
    const galleryFiles = req.files?.gallery || [];

    if (!title || !link || !category) {
      return res.status(400).json({
        message: "Title, Link, and category are required",
      });
    }

    if (!thumbnailFile) {
      return res.status(400).json({ message: "Thumbnail image is required." });
    }

    // Upload thumbnail
    const thumbnailFileName = `aiTools/thumbnails/${Date.now()}_${
      thumbnailFile.originalname
    }`;
    const thumbnailUrl = await uploadImage(
      thumbnailFile.buffer,
      thumbnailFileName,
      thumbnailFile.mimetype
    );

    // Upload gallery (optional)
    let galleryUrls = [];

    if (galleryFiles.length > 0) {
      try {
        galleryUrls = await Promise.all(
          galleryFiles.map(async (file) => {
            const fileName = `aiTools/gallery/${Date.now()}_${
              file.originalname
            }`;
            return await uploadImage(file.buffer, fileName, file.mimetype);
          })
        );
      } catch (err) {
        console.error("Error uploading one of the gallery images:", err);
        return res.status(500).json({
          message: "Failed to upload gallery images",
          error: err.message,
        });
      }
    }

    // Save aiTool to DB
    const newAiTool = await AiTool.create({
      title,
      link,
      order,
      thumbnailUrl,
      gallery: galleryUrls,
      category,
    });

    res.status(201).json({
      message: "AiTool created successfully",
      aiTool: newAiTool,
    });
  } catch (error) {
    console.error("AiTool creation error:", error);
    res.status(500).json({
      message: "Server error creating AiTool",
      error: error.message,
    });
  }
};

exports.getAllAiTools = async (req, res) => {
  try {
    const aiTools = await AiTool.find().sort({
      order: 1,
      createdAt: -1,
    });
    res.status(200).json({ aiTools });
  } catch (error) {
    console.error("Error fetching aiTools:", error);
    res.status(500).json({ message: "Server error fetching aiTools" });
  }
};

exports.getAiToolById = async (req, res) => {
  try {
    const aiTool = await AiTool.findById(req.params.id);
    if (!aiTool) return res.status(404).json({ message: "AiTool not found" });
    res.status(200).json({ aiTool });
  } catch (error) {
    console.error("Error fetching aiTool:", error);
    res.status(500).json({ message: "Server error fetching aiTool" });
  }
};

exports.updateAiTool = async (req, res) => {
  try {
    const { title, link, category, order } = req.body;
    const thumbnailFile = req.files?.thumbnail?.[0];
    const galleryFiles = req.files?.gallery || [];

    // ✅ Find existing aiTool first
    const existingAiTool = await AiTool.findById(req.params.id);
    if (!existingAiTool) {
      return res.status(404).json({ message: "AiTool not found" });
    }

    const updateData = {
      title,
      link,
      order,
      category,
    };

    // ✅ Handle new thumbnail upload
    if (thumbnailFile) {
      // Delete old thumbnail if exists
      if (existingAiTool.thumbnailUrl) {
        try {
          await deleteImage(existingAiTool.thumbnailUrl);
        } catch (err) {
          console.warn("⚠️ Failed to delete old thumbnail:", err.message);
        }
      }

      // Upload new one
      const newThumbnailName = `aiTools/thumbnails/${Date.now()}_${
        thumbnailFile.originalname
      }`;
      const newThumbnailUrl = await uploadImage(
        thumbnailFile.buffer,
        newThumbnailName,
        thumbnailFile.mimetype
      );
      updateData.thumbnailUrl = newThumbnailUrl;
    }

    // ✅ Parallel upload for gallery
    let newGalleryUrls = [];
    if (galleryFiles.length > 0) {
      try {
        newGalleryUrls = await Promise.all(
          galleryFiles.map(async (file) => {
            const fileName = `aiTools/gallery/${Date.now()}_${
              file.originalname
            }`;
            return await uploadImage(file.buffer, fileName, file.mimetype);
          })
        );
      } catch (err) {
        console.error("Error uploading gallery images:", err);
        return res.status(500).json({
          message: "Failed to upload one or more gallery images",
          error: err.message,
        });
      }
    }

    if (newGalleryUrls.length > 0) {
      // Option 1: append new gallery images
      updateData.gallery = [
        ...(existingAiTool.gallery || []),
        ...newGalleryUrls,
      ];
    }

    // ✅ Update aiTool
    const updatedAiTool = await AiTool.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    );

    res.status(200).json({
      message: "AiTool updated successfully",
      aiTool: updatedAiTool,
    });
  } catch (error) {
    console.error("Error updating aiTool:", error);
    res.status(500).json({
      message: "Server error updating aiTool",
      error: error.message,
    });
  }
};

exports.deleteAiTool = async (req, res) => {
  try {
    const aiTool = await AiTool.findById(req.params.id);
    if (!aiTool) return res.status(404).json({ message: "AiTool not found" });

    // Delete thumbnail from GCS
    if (aiTool.thumbnailUrl) {
      await deleteImage(aiTool.thumbnailUrl);
    }

    // Delete all gallery images from GCS (if any)
    if (Array.isArray(aiTool.gallery) && aiTool.gallery.length > 0) {
      await Promise.all(
        aiTool.gallery.map(async (imageUrl) => {
          try {
            await deleteImage(imageUrl);
          } catch (err) {
            console.warn("⚠️ Failed to delete gallery image:", err.message);
          }
        })
      );
    }

    // Delete aiTool from MongoDB
    await aiTool.deleteOne();

    res.status(200).json({ message: "AiTool deleted successfully" });
  } catch (error) {
    console.error("Error deleting aiTool:", error);
    res.status(500).json({ message: "Server error deleting aiTool" });
  }
};

exports.deleteAiToolImage = async (req, res) => {
  try {
    const { id } = req.params; // aiTool id
    const { imageUrl } = req.body; // the image URL to delete

    if (!imageUrl) {
      return res.status(400).json({ message: "Image URL is required" });
    }

    const aiTool = await AiTool.findById(id);
    if (!aiTool) {
      return res.status(404).json({ message: "AiTool not found" });
    }

    // Check if the image exists in the aiTool's gallery
    const imageExists = aiTool.gallery.includes(imageUrl);
    if (!imageExists) {
      return res.status(404).json({ message: "Image not found in gallery" });
    }

    // Delete the image from GCS
    await deleteImage(imageUrl);

    // Remove the image from MongoDB array
    aiTool.gallery = aiTool.gallery.filter((url) => url !== imageUrl);
    await aiTool.save();

    res.status(200).json({
      message: "Gallery image deleted successfully",
      gallery: aiTool.gallery,
    });
  } catch (error) {
    console.error("Error deleting gallery image:", error);
    res.status(500).json({
      message: "Server error deleting gallery image",
      error: error.message,
    });
  }
};
