const express = require("express");
const {
  createReserve,
  getReserve,
  deleteReserve,
} = require("../controllers/reserveController");

const router = express.Router();

router.post("/createReserve", createReserve);
router.get("/getReserve", getReserve);
router.delete("/deleteReserve", deleteReserve);

module.exports = router;
