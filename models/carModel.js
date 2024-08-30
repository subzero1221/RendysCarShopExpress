const mongoose = require("mongoose");

const carSchema = mongoose.Schema({
  vehicleType: {
    type: String,
    enum: ["vehicle", "motorcycle", "specVehicle"],
    required: [true, "Please provide car Type"],
  },
  manufacturer: {
    type: String,
    required: [true, "Please provide car manufacturer"],
  },
  model: {
    type: String,
    required: [true, "Please provide car Model"],
  },
  location: {
    type: String,
    required: [true, "Please provide your location"],
  },
  price: {
    type: String,
    required: [true, "Please provide car price"],
  },
  vip: {
    type: Boolean,
    default: false,
  },
  shipping: {
    type: Boolean,
    required: [true, "Please tell us is your car worldwide"],
  },
  fuelType: {
    type: String,
    required: [true, "Please provide car fuel type"],
  },
  year: {
    type: Number,
    required: [true, "Please provide car year"],
  },
  color: {
    type: String,
    required: [true, "Please provide car color"],
  },
  run: {
    type: Number,
    required: [true, "Please provide car run"],
  },
  category: {
    type: String,
    required: [true, "Please provide car category"],
  },
  engine: {
    type: String,
    required: [true, "Please provide car engine"],
  },
  steeringWheel: {
    type: String,
    required: [true, "Please provide car steering wheel side"],
  },
  transmission: {
    type: String,
    required: [true, "Please provide car transmission"],
  },
  turbo: {
    type: Boolean,
    required: false,
    default: false,
  },
  description: {
    type: String,
    required: false,
  },
  photos: {
    type: [String],
    default: ["default.png"], // Default photo if none are provided
  },
  condintioner: {
    type: Boolean,
    required: false,
    default: false,
  },
  parkingControl: {
    type: Boolean,
    required: false,
    default: false,
  },
  airBags: {
    type: Boolean,
    required: false,
    default: false,
  },
  userId: {
    type: mongoose.Schema.ObjectId,
    ref: "User",
    required: true,
  },
  for: {
    type: String,
    enum: ["sale", "rental"],
    required: ["true", "You wanna sell car or just rent?"],
  },
  contact: {
    type: String,
    minLength: 9,
    maxLength: 11,
    required: [
      true,
      "Please provide your phone number, so potential buyer could contact you.",
    ],
  },
});

const Car = mongoose.model("Car", carSchema);

module.exports = Car;
