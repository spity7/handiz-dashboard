const Office = require("../models/officeModel");
const { uploadImage, deleteImage } = require("../utils/gcs");

exports.createOffice = async (req, res) => {
  try {
    const {
      title,
      location,
      locationMap,
      email,
      instagram,
      linkedin,
      teamNb,
      category,
      status,
      order,
    } = req.body;
    const thumbnailFile = req.files?.thumbnail?.[0];
    const galleryFiles = req.files?.gallery || [];

    if (
      !title ||
      !location ||
      !locationMap ||
      !email ||
      !instagram ||
      !linkedin ||
      !teamNb ||
      !category ||
      !status
    ) {
      return res.status(400).json({
        message:
          "Title, Location, LocationMap, Email, Instagram, Linkedin, teamNb, status, and category are required",
      });
    }

    if (!thumbnailFile) {
      return res.status(400).json({ message: "Thumbnail image is required." });
    }

    // Upload thumbnail
    const thumbnailFileName = `offices/thumbnails/${Date.now()}_${
      thumbnailFile.originalname
    }`;
    const thumbnailUrl = await uploadImage(
      thumbnailFile.buffer,
      thumbnailFileName,
      thumbnailFile.mimetype,
    );

    // Upload gallery (optional)
    let galleryUrls = [];

    if (galleryFiles.length > 0) {
      try {
        galleryUrls = await Promise.all(
          galleryFiles.map(async (file) => {
            const fileName = `offices/gallery/${Date.now()}_${
              file.originalname
            }`;
            return await uploadImage(file.buffer, fileName, file.mimetype);
          }),
        );
      } catch (err) {
        console.error("Error uploading one of the gallery images:", err);
        return res.status(500).json({
          message: "Failed to upload gallery images",
          error: err.message,
        });
      }
    }

    const parsedLocation = Array.isArray(location) ? location : [location];
    const parsedCategory = Array.isArray(category) ? category : [category];
    const parsedStatus = Array.isArray(status) ? status : [status];

    // Save office to DB
    const newOffice = await Office.create({
      title,
      locationMap,
      email,
      instagram,
      linkedin,
      teamNb,
      order,
      thumbnailUrl,
      gallery: galleryUrls,
      category: parsedCategory,
      status: parsedStatus,
      location: parsedLocation,
    });

    res.status(201).json({
      message: "Office created successfully",
      office: newOffice,
    });
  } catch (error) {
    console.error("Office creation error:", error);
    res.status(500).json({
      message: "Server error creating office",
      error: error.message,
    });
  }
};

exports.getAllOffices = async (req, res) => {
  try {
    const offices = await Office.find().sort({ order: 1, createdAt: -1 });
    res.status(200).json({ offices });
  } catch (error) {
    console.error("Error fetching offices:", error);
    res.status(500).json({ message: "Server error fetching offices" });
  }
};

exports.getOfficeById = async (req, res) => {
  try {
    const office = await Office.findById(req.params.id);
    if (!office) return res.status(404).json({ message: "Office not found" });
    res.status(200).json({ office });
  } catch (error) {
    console.error("Error fetching office:", error);
    res.status(500).json({ message: "Server error fetching office" });
  }
};

exports.updateOffice = async (req, res) => {
  try {
    const {
      title,
      location,
      locationMap,
      email,
      instagram,
      linkedin,
      teamNb,
      category,
      status,
      order,
    } = req.body;
    const thumbnailFile = req.files?.thumbnail?.[0];
    const galleryFiles = req.files?.gallery || [];

    if (!location) {
      return res.status(400).json({
        message: "Location is required",
      });
    }

    if (!category) {
      return res.status(400).json({
        message: "Category is required",
      });
    }

    if (!status) {
      return res.status(400).json({
        message: "Status is required",
      });
    }

    // ✅ Find existing office first
    const existingOffice = await Office.findById(req.params.id);
    if (!existingOffice) {
      return res.status(404).json({ message: "Office not found" });
    }

    const parsedLocation = Array.isArray(location) ? location : [location];
    const parsedCategory = Array.isArray(category) ? category : [category];
    const parsedStatus = Array.isArray(status) ? status : [status];

    const updateData = {
      title,
      location: parsedLocation,
      locationMap,
      email,
      instagram,
      linkedin,
      teamNb,
      order,
      category: parsedCategory,
      status: parsedStatus,
    };

    // ✅ Handle new thumbnail upload
    if (thumbnailFile) {
      // Delete old thumbnail if exists
      if (existingOffice.thumbnailUrl) {
        try {
          await deleteImage(existingOffice.thumbnailUrl);
        } catch (err) {
          console.warn("⚠️ Failed to delete old thumbnail:", err.message);
        }
      }

      // Upload new one
      const newThumbnailName = `offices/thumbnails/${Date.now()}_${
        thumbnailFile.originalname
      }`;
      const newThumbnailUrl = await uploadImage(
        thumbnailFile.buffer,
        newThumbnailName,
        thumbnailFile.mimetype,
      );
      updateData.thumbnailUrl = newThumbnailUrl;
    }

    // ✅ Parallel upload for gallery
    let newGalleryUrls = [];
    if (galleryFiles.length > 0) {
      try {
        newGalleryUrls = await Promise.all(
          galleryFiles.map(async (file) => {
            const fileName = `offices/gallery/${Date.now()}_${
              file.originalname
            }`;
            return await uploadImage(file.buffer, fileName, file.mimetype);
          }),
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
        ...(existingOffice.gallery || []),
        ...newGalleryUrls,
      ];
    }

    // ✅ Update office
    const updatedOffice = await Office.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true },
    );

    res.status(200).json({
      message: "Office updated successfully",
      office: updatedOffice,
    });
  } catch (error) {
    console.error("Error updating office:", error);
    res.status(500).json({
      message: "Server error updating office",
      error: error.message,
    });
  }
};

exports.deleteOffice = async (req, res) => {
  try {
    const office = await Office.findById(req.params.id);
    if (!office) return res.status(404).json({ message: "Office not found" });

    // Delete thumbnail from GCS
    if (office.thumbnailUrl) {
      await deleteImage(office.thumbnailUrl);
    }

    // Delete all gallery images from GCS (if any)
    if (Array.isArray(office.gallery) && office.gallery.length > 0) {
      await Promise.all(
        office.gallery.map(async (imageUrl) => {
          try {
            await deleteImage(imageUrl);
          } catch (err) {
            console.warn("⚠️ Failed to delete gallery image:", err.message);
          }
        }),
      );
    }

    // Delete office from MongoDB
    await office.deleteOne();

    res.status(200).json({ message: "Office deleted successfully" });
  } catch (error) {
    console.error("Error deleting office:", error);
    res.status(500).json({ message: "Server error deleting office" });
  }
};

exports.deleteOfficeImage = async (req, res) => {
  try {
    const { id } = req.params; // office id
    const { imageUrl } = req.body; // the image URL to delete

    if (!imageUrl) {
      return res.status(400).json({ message: "Image URL is required" });
    }

    const office = await Office.findById(id);
    if (!office) {
      return res.status(404).json({ message: "Office not found" });
    }

    // Check if the image exists in the office's gallery
    const imageExists = office.gallery.includes(imageUrl);
    if (!imageExists) {
      return res.status(404).json({ message: "Image not found in gallery" });
    }

    // Delete the image from GCS
    await deleteImage(imageUrl);

    // Remove the image from MongoDB array
    office.gallery = office.gallery.filter((url) => url !== imageUrl);
    await office.save();

    res.status(200).json({
      message: "Gallery image deleted successfully",
      gallery: office.gallery,
    });
  } catch (error) {
    console.error("Error deleting gallery image:", error);
    res.status(500).json({
      message: "Server error deleting gallery image",
      error: error.message,
    });
  }
};
