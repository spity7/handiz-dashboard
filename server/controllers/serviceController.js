const Service = require("../models/serviceModel");
const { uploadImage, deleteImage } = require("../utils/gcs");

exports.createService = async (req, res) => {
  try {
    const { name, description } = req.body;
    const file = req.file;

    if (!name || !description) {
      return res
        .status(400)
        .json({ message: "Name and description are required" });
    }

    if (!file) {
      return res.status(400).json({ message: "Image icon is required" });
    }

    if (!file.mimetype.startsWith("image/")) {
      return res.status(400).json({ message: "Only image files are allowed" });
    }

    const fileName = `services/icons/${Date.now()}_${file.originalname}`;
    const iconUrl = await uploadImage(file.buffer, fileName, file.mimetype);

    const newService = await Service.create({
      name,
      description,
      iconUrl,
    });

    res.status(201).json({
      message: "Service created successfully",
      service: newService,
    });
  } catch (error) {
    console.error("Service creation error:", error);
    res.status(500).json({ message: "Server error creating service" });
  }
};

exports.getAllServices = async (req, res) => {
  try {
    const services = await Service.find();
    res.status(200).json({ services });
  } catch (error) {
    console.error("Error fetching services:", error);
    res.status(500).json({ message: "Server error fetching services" });
  }
};

exports.getServiceById = async (req, res) => {
  try {
    const service = await Service.findById(req.params.id);
    if (!service) return res.status(404).json({ message: "Service not found" });
    res.status(200).json({ service });
  } catch (error) {
    console.error("Error fetching service:", error);
    res.status(500).json({ message: "Server error fetching service" });
  }
};

exports.updateService = async (req, res) => {
  try {
    const { name, description } = req.body;
    const file = req.file;

    // Find existing service first
    const existingService = await Service.findById(req.params.id);
    if (!existingService)
      return res.status(404).json({ message: "Service not found" });

    const updateData = { name, description };

    // If new icon uploaded → upload to Google Cloud and replace
    if (file) {
      if (!file.mimetype.startsWith("image/")) {
        return res
          .status(400)
          .json({ message: "Only image files are allowed" });
      }

      if (existingService.iconUrl) {
        await deleteImage(existingService.iconUrl);
      }

      const fileName = `services/icons/${Date.now()}_${file.originalname}`;
      const iconUrl = await uploadImage(file.buffer, fileName, file.mimetype);
      updateData.iconUrl = iconUrl;
    }

    const updatedService = await Service.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    );

    if (!updatedService)
      return res.status(404).json({ message: "Service not found" });

    res.status(200).json({
      message: "Service updated successfully",
      service: updatedService,
    });
  } catch (error) {
    console.error("Error updating service:", error);
    res.status(500).json({ message: "Server error updating service" });
  }
};

exports.deleteService = async (req, res) => {
  try {
    const service = await Service.findById(req.params.id);
    if (!service) return res.status(404).json({ message: "Service not found" });

    // Delete icon from GCS if exists
    if (service.iconUrl) {
      await deleteImage(service.iconUrl);
    }

    // Delete service from MongoDB
    await service.deleteOne();

    res.status(200).json({ message: "Service deleted successfully" });
  } catch (error) {
    console.error("Error deleting service:", error);
    res.status(500).json({ message: "Server error deleting service" });
  }
};
