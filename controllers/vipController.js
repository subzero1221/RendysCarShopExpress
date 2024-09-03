const mongoose = require("mongoose");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const AppError = require("../utils/AppError");
const catchAsync = require("../utils/catchAsync");
const Car = require("./../models/carModel");
const User = require("./../models/userModel");

exports.getCheckoutSession = catchAsync(async (req, res, next) => {
  const car = await Car.findById(req.params.carId);
  if (!car) return next(new AppError("Car not found!", 404));

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    success_url: `http://localhost:3000/am-selling/${req.user._id}`,
    cancel_url: `http://localhost:3000/am-selling/${req.user._id}`,
    customer_email: req.user.email,
    client_reference_id: req.params.carId,
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: `Buy Vip and put your car on websites main page!`,
            images: [
              `https://img.freepik.com/free-vector/classic-orange-car-vector-illustration_1308-164362.jpg?w=826&t=st=1724781908~exp=1724782508~hmac=df837c49da764d3b46dd3192764391b2a542aeee66cc3bb0c9be21d3d950fefe`,
            ],
          },
          unit_amount: 500,
        },
        quantity: 1,
        adjustable_quantity: {
          enabled: false,
        },
      },
    ],
    mode: "payment",
  });

  res.status(200).json({
    status: "success",
    session,
  });
});


const createVipCheckout = async (session) => {
  const car = session.client_reference_id;
  const update = { vip: true };
  await Car.findOneAndUpdate({ _id: car }, update);
};

exports.webhookCheckout = (req, res, next) => {
  const signature = req.headers["stripe-signature"];

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    return res.status(400).send(`Webhook error: ${err.message}`);
  }

  if (event.type === "checkout.session.completed")
    createVipCheckout(event.data.object);

  res.status(200).json({ received: true });
};
