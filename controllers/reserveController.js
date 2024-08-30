const mongoose = require("mongoose");
const AppError = require("../utils/AppError");
const catchAsync = require("../utils/catchAsync");
const Car = require("./../models/carModel");
const User = require("./../models/userModel");
const Reserve = require("./../models/reserveModel");

exports.createReserve = catchAsync(async (req, res, next) => {
  if (!req.user) {
    return next(new AppError("Log in to reserve car", 401));
  }
  const newReserve = await Reserve.create({
    from: req.body.from,
    to: req.body.to,
    fullPrice: req.body.fullPrice,
    carId: req.body.carId,
    userId: req.user._id,
    startLocation: req.body.startLocation,
    endLocation: req.body.endLocation,
  });

  res.status(200).json({
    status: "success",
    newReserve,
  });
});

exports.getReserve = catchAsync(async (req, res, next) => {
  if (!req.user) {
    return next(new AppError("Log in to get access on this content", 401));
  }
  const reserve = await Reserve.find({ userId: req.user._id }).populate(
    "carId"
  );
  if (!reserve) {
    return next(new AppError("Reservations not found", 404));
  }
  res.status(200).json({
    status: "succes",
    reserve,
  });
});

exports.deleteReserve = catchAsync(async (req, res, next) => {
  if (!req.user) {
    return next(new AppError("Log in to get access on this content", 401));
  }

  await Reserve.findByIdAndDelete(req.body.id);
  res.status(200).json({
    status: "success",
  });
});
