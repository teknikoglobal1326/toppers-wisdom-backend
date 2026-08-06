const AuditLog = require("../models/AuditLog.model");
const { createLogger } = require("../config/logger");

const logger = createLogger("middleware:auditLogger");

const auditLogger = (req, res, next) => {
  // We only log completed write operations (POST, PUT, PATCH, DELETE)
  const writeMethods = ["POST", "PUT", "PATCH", "DELETE"];
  if (!writeMethods.includes(req.method)) {
    return next();
  }

  // Intercept the response finish event to ensure the request has finished executing
  res.on("finish", async () => {
    try {
      const actor = req.admin || req.member;
      if (!actor) return; // Skip if no authenticated user is present

      // Determine module name dynamically from request path (segment after 'admin')
      const cleanPath = req.originalUrl.split("?")[0];
      const pathSegments = cleanPath.split("/");
      const adminIndex = pathSegments.indexOf("admin");
      let moduleName = "unknown";
      if (adminIndex !== -1 && pathSegments[adminIndex + 1]) {
        moduleName = pathSegments[adminIndex + 1];
      }

      // Determine role name
      let roleName = "Admin";
      if (req.member) {
        roleName = (req.member.role && req.member.role.name) || "Member";
      }

      // Redact sensitive details from request body to maintain privacy
      const body = { ...req.body };
      const sensitiveKeys = ["password", "token", "accessToken", "refreshToken", "oldPassword", "newPassword"];
      sensitiveKeys.forEach((key) => {
        if (key in body) {
          body[key] = "[REDACTED]";
        }
      });

      // Capture request parameters
      const data = {
        params: req.params || {},
        query: req.query || {},
        body: body
      };

      // Determine action string
      let action = "update";
      if (req.method === "POST") action = "create";
      if (req.method === "DELETE") action = "delete";

      // Log the entry in the background
      await AuditLog.create({
        actor: actor._id,
        actorModel: req.admin ? "Admin" : "Member",
        actorName: actor.name || "Unknown",
        roleName: roleName,
        module: moduleName,
        action: action,
        status: res.statusCode >= 400 ? "failed" : "success",
        ipAddress: req.ip || req.headers["x-forwarded-for"] || req.socket.remoteAddress,
        userAgent: req.headers["user-agent"],
        requestUrl: req.originalUrl,
        requestMethod: req.method,
        data: data,
        errorMessage: res.statusCode >= 400 ? res.statusMessage : undefined
      });
    } catch (err) {
      // Fail silently to prevent audit logging errors from breaking the core app flow
      logger.error({ err }, "Audit logger middleware failed");
    }
  });

  next();
};

module.exports = { auditLogger };

