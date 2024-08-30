const express = require("express");
const multer = require("multer");
const upload = multer({ storage: multer.memoryStorage() }); // Use memory storage to keep files in memory
const {
  getCars,
  createCar,
  deleteCar,
  updateCarRating,
  getCar,
  updateCardDetails,
  getFiltredCars,
  getMySales,
  getVipCars,
} = require("../controllers/carController");
const { isLoggedIn } = require("../controllers/authController");

const router = express.Router();

router.get("/getCars", getCars);
router.get("/getCar/:carId", getCar);
router.get("/getFiltredCars", getFiltredCars);
router.get("/getMySales/:id", getMySales);
router.get("/vipCars", getVipCars);

router.post("/createCar", upload.array("photos", 4), createCar);
router.delete("/deleteCar", deleteCar);
router.patch("/updateCarRating", updateCarRating);
router.patch("/updateCarDetails/:carId", updateCardDetails);

module.exports = router;
