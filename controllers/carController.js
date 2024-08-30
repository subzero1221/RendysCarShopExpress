const mongoose = require("mongoose");
const { google } = require("googleapis");
const AppError = require("../utils/AppError");
const catchAsync = require("../utils/catchAsync");
const Car = require("./../models/carModel");
const User = require("./../models/userModel");
const stream = require("stream");
const path = require("path");
require("dotenv").config({ path: "./config.env" });

const apiKey = {
  type: "service_account",
  project_id: process.env.PROJECT_ID,
  private_key_id: process.env.PRIVATE_KEY_ID,
  private_key: process.env.PRIVATE_KEY.replace(/\\n/g, "\n"),
  client_email: process.env.CLIENT_EMAIL,
  client_id: process.env.CLIENT_ID,
  auth_uri: process.env.AUTH_URI,
  token_uri: process.env.TOKEN_URI,
  auth_provider_x509_cert_url: process.env.AUTH_PROVIDER_X509_CERT_URL,
  client_x509_cert_url: process.env.CLIENT_X509_CERT_URL,
  universe_domain: process.env.UNIVERSE_DOMAIN,
};

async function getAuthClient() {
  const auth = new google.auth.GoogleAuth({
    credentials: apiKey,
    scopes: process.env.SCOPE,
  });
  return await auth.getClient();
}

async function photoManager(file) {
  const authClient = await getAuthClient();
  const drive = google.drive({ version: "v3", auth: authClient });

  const bufferStream = new stream.PassThrough();
  bufferStream.end(file.buffer);

  const fileMetadata = {
    name: file.originalname,
    parents: ["1nCkSvuJRY01OR9DWczzl1lpYPMRyOaTD"],
  };

  const media = {
    mimeType: file.mimetype,
    body: bufferStream,
  };

  try {
    const response = await drive.files.create({
      resource: fileMetadata,
      media: media,
      fields: "id",
    });

    return response.data;
  } catch (error) {
    throw error;
  }
}

async function getPhotoUrl(fileId) {
  const authClient = await getAuthClient();
  const drive = google.drive({ version: "v3", auth: authClient });

  try {
    const response = await drive.files.get({
      fileId: fileId,
      fields: "webViewLink",
    });

    if (!response.data.webViewLink) {
      throw new Error(`No URL found for fileId: ${fileId}`);
    }

    return response.data.webViewLink;
  } catch (error) {
    throw error;
  }
}

exports.getCar = catchAsync(async (req, res, next) => {
  const { carId } = req.params;

  const car = await Car.findById(carId).populate("userId");

  if (!car) {
    return next(new AppError("Car not found", 404));
  }

  const photoUrls = await Promise.all(car.photos.map((id) => getPhotoUrl(id)));

  const transformedCar = { ...car._doc, photos: photoUrls }; // Add photo URLs to car data

  res.status(200).json({
    status: "success",
    car: transformedCar,
  });
});

exports.getCars = catchAsync(async (req, res, next) => {
  const page = req.query.page * 1 || 1;
  const limit = req.query.limit * 1 || 100;
  const skip = (page - 1) * limit;
  const cars = await Car.find().skip(skip).limit(limit);

  if (!cars.length) {
    return next(new AppError("No cars found", 404));
  }

  const transformedCars = await Promise.all(
    cars.map(async (car) => {
      const photoUrls = await Promise.all(
        car.photos.map((id) => getPhotoUrl(id))
      );
      return { ...car._doc, photos: photoUrls }; // Add photo URLs to car data
    })
  );

  res.status(200).json({
    status: "success",
    results: cars.length,
    transformedCars,
  });
});

exports.createCar = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.body.userId);
  if (!user) return next(new AppError("You are not logged in", 401));
  let fileIds;
  //if photos uploading photos
  if (req.files) {
    fileIds = await Promise.all(
      req.files.map(async (file) => {
        const uploadedFile = await photoManager(file);
        return uploadedFile.id;
      })
    );
  } else {
    fileIds = ["default.png"];
  }

  const newCar = await Car.create({
    vehicleType: req.body.vehicleType,
    manufacturer: req.body.manufacturer,
    model: req.body.model,
    location: req.body.location,
    fuelType: req.body.fuelType,
    shipping: req.body.shipping,
    price: req.body.price,
    year: req.body.year,
    color: req.body.color,
    run: req.body.run,
    category: req.body.category,
    engine: req.body.engine,
    steeringWheel: req.body.steeringWheel,
    transmission: req.body.transmission,
    condintioner: req.body.condintioner,
    parkingControl: req.body.parkingControl,
    airBags: req.body.airBags,
    description: req.body.description,
    photos: fileIds,
    userId: user._id,
    for: req.body.for,
    contact: req.body.contact,
    vip: req.body.vip,
  });

  res.status(201).json({
    status: "success",
    car: newCar,
  });
});

exports.deleteCar = catchAsync(async (req, res, next) => {
  if (!req.user) return next(new AppError("You are not logged in", 401));
  const user = await User.findOne({ _id: req.user._id }).select("+role");

  if (!permission)
    return next(new AppError("you have no perrmision on this action", 401));
  const car = await Car.findByIdAndDelete({ _id: req.body.id });
  if (!car) {
    return next(new AppError("No car found with that ID", 404));
  }

  res.status(204).json({
    status: "success",
    data: null,
  });
});

exports.updateCarRating = catchAsync(async (req, res, next) => {
  if (!req.user) return next(new AppError("You are not logged in", 401));

  const { carId, rating } = req.body;

  const car = await Car.findById(carId);
  if (!car) {
    return next(new AppError("Car not found!", 404));
  }

  if (car.ratingQuantity.includes(req.user._id))
    return next(new AppError("You already reacted on this car", 400));

  car.ratingSum += Number(rating);
  car.ratingQuantity.push(req.user._id);
  car.averageRating = car.ratingSum / car.ratingQuantity.length;

  await car.save({ validateBeforeSave: false });

  res.status(200).json({
    status: "success",
    rating: car.averageRating,
  });
});

exports.updateCardDetails = catchAsync(async (req, res, next) => {
  if (!req.user) {
    return next(new AppError("You are not logged in, Log in to get access!"));
  }
  const user = await User.findById(req.user._id).select("+role");
  if (user.role === "user") {
    return next(new AppError("You have no permission on this action", 401));
  }
  const { description, insurance, carLocated } = req.body;
  const { carId } = req.params;
  const car = await Car.findById(carId);
  if (!car) return next(new AppError("Car not found", 404));
  car.description = description;
  car.insurance = insurance;
  car.carLocated = carLocated;
  car.save();
  res.status(200).json({
    status: "success",
    car,
  });
});

const initialFilter = {
  vehicleType: "",
  manufacturer: "",
  model: "",
  location: "",
  fuelType: "",
  yearFrom: "",
  yearTill: "",
  color: "",
  run: "",
  category: "",
  engine: "",
  steeringWheel: "",
  transmission: "",
  turbo: false,
  condintioner: false,
  parkingControl: false,
  navigation: false,
  airBags: false,
};

exports.getFiltredCars = catchAsync(async (req, res, next) => {
  const filters = {};
  const yearFilter = {};
  const runFilter = {};

  Object.keys(initialFilter).forEach((key) => {
    if (
      req.query[key] !== undefined &&
      req.query[key] !== initialFilter[key].toString()
    ) {
      if (key === "yearFrom" || key === "yearTill") {
        if (key === "yearFrom") {
          yearFilter.$gte = req.query[key];
        }
        if (key === "yearTill") {
          yearFilter.$lte = req.query[key];
        }
      } else if (key === "run") {
        runFilter.$gte = req.query[key];
      } else {
        filters[key] = req.query[key];
      }
    }
  });

  if (Object.keys(yearFilter).length > 0) {
    filters.year = yearFilter;
  }

  if (Object.keys(runFilter).length > 0) {
    filters.run = runFilter;
  }

  const filteredCars = await Car.find(filters);
  if (!filteredCars.length) return next(new AppError("Cars not found", 404));

  res.status(200).json({
    status: "success",
    filteredCars,
  });
});

exports.getMySales = catchAsync(async (req, res, next) => {
  const userId = req.params.id;

  if (!userId)
    return next(new AppError("Login in to get access on this aciton!"));

  const cars = await Car.find({ userId });
  if (!cars)
    return next(new AppError("You currently dont trying to sell car!", 404));

  const mySales = await Promise.all(
    cars.map(async (car) => {
      const photoUrls = await Promise.all(
        car.photos.map((id) => getPhotoUrl(id))
      );
      return { ...car._doc, photos: photoUrls }; // Add photo URLs to car data
    })
  );

  res.status(200).json({
    status: "success",
    results: cars.length,
    mySales,
  });
});

exports.getVipCars = catchAsync(async (req, res, next) => {
  const cars = await Car.find({ vip: "true" });
  if (!cars) return next(new AppError("Cars Not found!", 404));

  const vipCars = await Promise.all(
    cars.map(async (car) => {
      const photoUrls = await Promise.all(
        car.photos.map((id) => getPhotoUrl(id))
      );
      return { ...car._doc, photos: photoUrls };
    })
  );

  res.status(200).json({
    status: "success",
    vipCars,
  });
});
