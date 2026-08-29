const AboutUs = require("../models/aboutUsModel");
const { uploadOptimizedImage, deleteImage } = require("../utils/gcs");

const parseContentBlocks = (contentBlocks) => {
  if (!contentBlocks) return [];
  try {
    return JSON.parse(contentBlocks);
  } catch (err) {
    console.error("Error parsing contentBlocks:", err);
    return [];
  }
};

const mapBlockImages = async (blocks, blockImageFiles, folder) => {
  if (!blocks.length || !blockImageFiles.length) return blocks;

  const uploadStamp = Date.now();
  const uploadedBlockImages = await Promise.all(
    blockImageFiles.map((file, index) =>
      uploadOptimizedImage(file.buffer, file.originalname, `${folder}/blocks`, {
        stamp: uploadStamp,
        index,
      }),
    ),
  );

  return blocks.map((block) => {
    if (block.type === "image" && block.fileIndex !== undefined) {
      const { fileIndex, ...rest } = block;
      return { ...rest, content: uploadedBlockImages[fileIndex] || "" };
    }
    return block;
  });
};

const getBlockImageUrls = (blocks = []) =>
  blocks
    .filter((block) => block.type === "image" && block.content)
    .map((block) => block.content);

const deleteRemovedBlockImages = async (oldBlocks, newBlocks) => {
  const oldImages = getBlockImageUrls(oldBlocks);
  const newImages = getBlockImageUrls(newBlocks);
  const imagesToDelete = oldImages.filter((url) => !newImages.includes(url));

  if (!imagesToDelete.length) return;

  await Promise.all(
    imagesToDelete.map(async (url) => {
      try {
        await deleteImage(url);
      } catch (err) {
        console.warn("Failed to delete removed block image:", err.message);
      }
    }),
  );
};

exports.createAboutUs = async (req, res) => {
  try {
    const existingAboutUs = await AboutUs.findOne();
    if (existingAboutUs) {
      return res.status(400).json({
        message: "An About Us page already exists. You can only edit it.",
      });
    }

    const { contentBlocks } = req.body;
    const blockImageFiles = req.files?.blockImages || [];

    let parsedContentBlocks = parseContentBlocks(contentBlocks);
    parsedContentBlocks = await mapBlockImages(
      parsedContentBlocks,
      blockImageFiles,
      "about-us",
    );

    const aboutUs = await AboutUs.create({
      contentBlocks: parsedContentBlocks,
    });

    res.status(201).json({
      message: "About Us page created successfully",
      aboutUs,
    });
  } catch (error) {
    console.error("About Us creation error:", error);
    res.status(500).json({
      message: "Server error creating About Us page",
      error: error.message,
    });
  }
};

exports.getAboutUs = async (req, res) => {
  try {
    const aboutUs = await AboutUs.findOne();
    res.status(200).json({ aboutUs });
  } catch (error) {
    console.error("Error fetching About Us page:", error);
    res.status(500).json({
      message: "Server error fetching About Us page",
      error: error.message,
    });
  }
};

exports.getAboutUsById = async (req, res) => {
  try {
    const aboutUs = await AboutUs.findById(req.params.id);
    if (!aboutUs) {
      return res.status(404).json({ message: "About Us page not found" });
    }
    res.status(200).json({ aboutUs });
  } catch (error) {
    console.error("Error fetching About Us page:", error);
    res.status(500).json({
      message: "Server error fetching About Us page",
      error: error.message,
    });
  }
};

exports.updateAboutUs = async (req, res) => {
  try {
    const { id } = req.params;
    const { contentBlocks } = req.body;
    const blockImageFiles = req.files?.blockImages || [];

    const existingAboutUs = await AboutUs.findById(id);
    if (!existingAboutUs) {
      return res.status(404).json({ message: "About Us page not found" });
    }

    let parsedContentBlocks = parseContentBlocks(contentBlocks);

    if (parsedContentBlocks.length > 0 && blockImageFiles.length > 0) {
      parsedContentBlocks = await mapBlockImages(
        parsedContentBlocks,
        blockImageFiles,
        "about-us",
      );
    }

    await deleteRemovedBlockImages(
      existingAboutUs.contentBlocks,
      parsedContentBlocks,
    );

    const updatedAboutUs = await AboutUs.findByIdAndUpdate(
      id,
      { contentBlocks: parsedContentBlocks },
      { new: true },
    );

    res.status(200).json({
      message: "About Us page updated successfully",
      aboutUs: updatedAboutUs,
    });
  } catch (error) {
    console.error("About Us update error:", error);
    res.status(500).json({
      message: "Server error updating About Us page",
      error: error.message,
    });
  }
};

exports.deleteAboutUs = async (req, res) => {
  try {
    const aboutUs = await AboutUs.findById(req.params.id);
    if (!aboutUs) {
      return res.status(404).json({ message: "About Us page not found" });
    }

    const blockImages = getBlockImageUrls(aboutUs.contentBlocks);
    if (blockImages.length > 0) {
      await Promise.all(
        blockImages.map(async (url) => {
          try {
            await deleteImage(url);
          } catch (err) {
            console.warn("Failed to delete block image:", err.message);
          }
        }),
      );
    }

    await AboutUs.findByIdAndDelete(req.params.id);

    res.status(200).json({ message: "About Us page deleted successfully" });
  } catch (error) {
    console.error("About Us delete error:", error);
    res.status(500).json({
      message: "Server error deleting About Us page",
      error: error.message,
    });
  }
};
