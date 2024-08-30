const express = require("express");
const { isLoggedIn } = require("../controllers/authController");
const { getCheckoutSession } = require("../controllers/vipController");

const router = express.Router();

router.get("/checkout-session/:carId", isLoggedIn, getCheckoutSession);

module.exports = router;
