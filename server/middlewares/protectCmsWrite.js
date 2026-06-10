const protectRoute = require("./protectRoute");
const authorizePermission = require("./authorizePermission");

/** Admin-only CMS write protection */
const protectCmsWrite = [protectRoute, authorizePermission("cms:manage")];

module.exports = protectCmsWrite;
