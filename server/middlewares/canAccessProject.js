const Project = require("../models/projectModel");
const {
  canReadProject,
  canWriteProject,
  canPublishProject,
} = require("../utils/projectAccess");

const loadProject = async (req, res, next) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }
    req.project = project;
    next();
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const requireProjectRead = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  if (!canReadProject(req.user, req.project)) {
    return res
      .status(403)
      .json({ message: "Forbidden: cannot access this project" });
  }
  next();
};

const requireProjectWrite = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  if (!canWriteProject(req.user, req.project)) {
    return res
      .status(403)
      .json({ message: "Forbidden: cannot modify this project" });
  }
  next();
};

const requireProjectPublish = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  if (!canPublishProject(req.user, req.project)) {
    return res
      .status(403)
      .json({ message: "Forbidden: cannot change publish status" });
  }
  next();
};

module.exports = {
  loadProject,
  requireProjectRead,
  requireProjectWrite,
  requireProjectPublish,
};
