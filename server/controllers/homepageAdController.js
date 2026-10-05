const HomepageAd = require("../models/homepageAdModel");
const { uploadOptimizedImage, deleteImage } = require("../utils/gcs");
const { getImageValidationError } = require("../utils/imageValidation");
const { hasPermission } = require("../constants/permissions");
const { normalizeHomepageAdStatus } = require("../constants/homepageAdStatus");

function serializeHomepageAd(doc) {
  const ad = doc?.toObject ? doc.toObject() : { ...doc };
  if (!ad.status) {
    ad.status = "available";
  }
  return ad;
}

function parseOptionalDate(value) {
  if (value === undefined || value === null || value === "") return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return undefined;
  return d;
}

function validateHttpsUrl(raw) {
  const url = String(raw || "").trim();
  if (!url) return { ok: false, message: "External URL is required" };
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") {
      return { ok: false, message: "External URL must use https://" };
    }
    return { ok: true, value: url };
  } catch {
    return { ok: false, message: "External URL is invalid" };
  }
}

function buildPublicFilter(now = new Date()) {
  return {
    isPublished: true,
    $and: [
      {
        $or: [{ startsAt: null }, { startsAt: { $lte: now } }],
      },
      {
        $or: [{ endsAt: null }, { endsAt: { $gte: now } }],
      },
    ],
  };
}

function canManageCms(user) {
  return Boolean(user && hasPermission(user.role, "cms:manage"));
}

exports.createHomepageAd = async (req, res) => {
  try {
    const { title, status, metaSecondary, externalUrl, order, isPublished } =
      req.body;
    const thumbnailFile = req.files?.thumbnail?.[0];

    const urlCheck = validateHttpsUrl(externalUrl);
    if (!urlCheck.ok) {
      return res.status(400).json({ message: urlCheck.message });
    }

    if (!title?.trim()) {
      return res.status(400).json({ message: "Title is required" });
    }

    const normalizedStatus = normalizeHomepageAdStatus(status);
    if (!normalizedStatus) {
      return res.status(400).json({ message: "Invalid status" });
    }

    if (!thumbnailFile) {
      return res.status(400).json({ message: "Thumbnail image is required." });
    }

    const thumbnailTypeError = getImageValidationError(thumbnailFile);
    if (thumbnailTypeError) {
      return res.status(400).json({ message: thumbnailTypeError });
    }

    const startsAt = parseOptionalDate(req.body.startsAt);
    const endsAt = parseOptionalDate(req.body.endsAt);
    if (startsAt === undefined || endsAt === undefined) {
      return res.status(400).json({ message: "Invalid schedule date" });
    }
    if (startsAt && endsAt && endsAt < startsAt) {
      return res.status(400).json({
        message: "End date must be on or after start date",
      });
    }

    const thumbnailUrl = await uploadOptimizedImage(
      thumbnailFile.buffer,
      thumbnailFile.originalname,
      "homepage-ads/thumbnails",
      { stamp: Date.now() },
    );

    const homepageAd = await HomepageAd.create({
      title: String(title).trim(),
      status: normalizedStatus,
      metaSecondary: metaSecondary ? String(metaSecondary).trim() : "",
      externalUrl: urlCheck.value,
      thumbnailUrl,
      order: order !== undefined && order !== "" ? Number(order) : 999,
      isPublished: isPublished === true || isPublished === "true",
      startsAt,
      endsAt,
    });

    res.status(201).json({
      message: "Homepage ad created successfully",
      homepageAd: serializeHomepageAd(homepageAd),
    });
  } catch (error) {
    console.error("Homepage ad creation error:", error);
    res.status(500).json({
      message: "Server error creating homepage ad",
      error: error.message,
    });
  }
};

exports.getAllHomepageAds = async (req, res) => {
  try {
    const isAdminList = req.query.admin === "true" && canManageCms(req.user);

    const filter = isAdminList ? {} : buildPublicFilter();
    const homepageAds = await HomepageAd.find(filter).sort({
      order: 1,
      createdAt: -1,
    });

    res.status(200).json({
      homepageAds: homepageAds.map(serializeHomepageAd),
    });
  } catch (error) {
    console.error("Error fetching homepage ads:", error);
    res.status(500).json({ message: "Server error fetching homepage ads" });
  }
};

exports.getHomepageAdById = async (req, res) => {
  try {
    const homepageAd = await HomepageAd.findById(req.params.id);
    if (!homepageAd) {
      return res.status(404).json({ message: "Homepage ad not found" });
    }
    res.status(200).json({ homepageAd: serializeHomepageAd(homepageAd) });
  } catch (error) {
    console.error("Error fetching homepage ad:", error);
    res.status(500).json({ message: "Server error fetching homepage ad" });
  }
};

exports.updateHomepageAd = async (req, res) => {
  try {
    const existing = await HomepageAd.findById(req.params.id);
    if (!existing) {
      return res.status(404).json({ message: "Homepage ad not found" });
    }

    const { title, status, metaSecondary, externalUrl, order, isPublished } =
      req.body;
    const thumbnailFile = req.files?.thumbnail?.[0];

    const updateData = {};

    if (title !== undefined) updateData.title = String(title).trim();
    if (status !== undefined) {
      const normalizedStatus = normalizeHomepageAdStatus(status);
      if (!normalizedStatus) {
        return res.status(400).json({ message: "Invalid status" });
      }
      updateData.status = normalizedStatus;
    }
    if (metaSecondary !== undefined) {
      updateData.metaSecondary = String(metaSecondary).trim();
    }
    if (externalUrl !== undefined) {
      const urlCheck = validateHttpsUrl(externalUrl);
      if (!urlCheck.ok) {
        return res.status(400).json({ message: urlCheck.message });
      }
      updateData.externalUrl = urlCheck.value;
    }
    if (order !== undefined && order !== "") {
      updateData.order = Number(order);
    }
    if (isPublished !== undefined) {
      updateData.isPublished = isPublished === true || isPublished === "true";
    }

    if (req.body.startsAt !== undefined) {
      const startsAt = parseOptionalDate(req.body.startsAt);
      if (startsAt === undefined) {
        return res.status(400).json({ message: "Invalid start date" });
      }
      updateData.startsAt = startsAt;
    }
    if (req.body.endsAt !== undefined) {
      const endsAt = parseOptionalDate(req.body.endsAt);
      if (endsAt === undefined) {
        return res.status(400).json({ message: "Invalid end date" });
      }
      updateData.endsAt = endsAt;
    }

    const nextStarts =
      updateData.startsAt !== undefined
        ? updateData.startsAt
        : existing.startsAt;
    const nextEnds =
      updateData.endsAt !== undefined ? updateData.endsAt : existing.endsAt;
    if (nextStarts && nextEnds && nextEnds < nextStarts) {
      return res.status(400).json({
        message: "End date must be on or after start date",
      });
    }

    if (thumbnailFile) {
      const thumbnailTypeError = getImageValidationError(thumbnailFile);
      if (thumbnailTypeError) {
        return res.status(400).json({ message: thumbnailTypeError });
      }

      if (existing.thumbnailUrl) {
        try {
          await deleteImage(existing.thumbnailUrl);
        } catch (err) {
          console.warn(
            "Failed to delete old homepage ad thumbnail:",
            err.message,
          );
        }
      }

      updateData.thumbnailUrl = await uploadOptimizedImage(
        thumbnailFile.buffer,
        thumbnailFile.originalname,
        "homepage-ads/thumbnails",
        { stamp: Date.now() },
      );
    }

    const homepageAd = await HomepageAd.findByIdAndUpdate(
      req.params.id,
      { $set: updateData },
      { new: true, runValidators: true },
    );

    res.status(200).json({
      message: "Homepage ad updated successfully",
      homepageAd: serializeHomepageAd(homepageAd),
    });
  } catch (error) {
    console.error("Error updating homepage ad:", error);
    res.status(500).json({
      message: "Server error updating homepage ad",
      error: error.message,
    });
  }
};

exports.deleteHomepageAd = async (req, res) => {
  try {
    const homepageAd = await HomepageAd.findById(req.params.id);
    if (!homepageAd) {
      return res.status(404).json({ message: "Homepage ad not found" });
    }

    if (homepageAd.thumbnailUrl) {
      try {
        await deleteImage(homepageAd.thumbnailUrl);
      } catch (err) {
        console.warn("Failed to delete homepage ad thumbnail:", err.message);
      }
    }

    await homepageAd.deleteOne();

    res.status(200).json({ message: "Homepage ad deleted successfully" });
  } catch (error) {
    console.error("Error deleting homepage ad:", error);
    res.status(500).json({ message: "Server error deleting homepage ad" });
  }
};
