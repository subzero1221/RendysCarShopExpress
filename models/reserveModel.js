const mongoose = require("mongoose");

const reserveSchema = mongoose.Schema({
  from: {
    type: Date,
    required: [true, "Please choose reservations start date"],
  },
  to: {
    type: Date,
    required: [true, "Please tell us when you will be back"],
  },
  fullPrice: {
    type: Number,
    required: [true, "Reserve should have price"],
  },
  carId: {
    type: mongoose.Schema.ObjectId,
    ref: "Car",
    required: true,
  },
  userId: {
    type: mongoose.Schema.ObjectId,
    ref: "User",
    required: true,
  },
  startLocation: {
    type: String,
    default: "Tbilissi",
  },
  endLocation: {
    type: String,
    required: [true, "Tell us where you want to return car"],
  },
});

const Reserve = mongoose.model("Reserve", reserveSchema);

module.exports = Reserve;
