const express = require("express");
const multer = require("multer");
const {
  signup,
  login,
  updatePassword,
  forgotPassword,
  resetPassword,
  logout,
  isLoggedIn,
  getUserData,
  updateProfile,
} = require("../controllers/authController");

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const router = express.Router();

router.post("/signup", signup);
router.post("/login", login);
router.post("/logout", logout);
router.post("/forgotPassword", forgotPassword);
router.post("/resetPassword/:token", resetPassword);
router.patch("/updatePassword", updatePassword);

router.get("/isLoggedIn", isLoggedIn);
router.get("/getUserData/:id", getUserData);

router.patch("/updateProfile/:id", upload.single("photo"), updateProfile);

module.exports = router;
