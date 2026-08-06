const router = require("express").Router();
const controller = require("./admin-audit-log.controller");

router.get("/", controller.list);

module.exports = router;
