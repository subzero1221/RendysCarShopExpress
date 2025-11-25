const express = require("express");
const dotenv = require("dotenv");
const mongoose = require("mongoose");
const cookieParser = require("cookie-parser");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const globalErrorHandler = require("./controllers/errorController");
const cors = require("cors");
const passport = require("passport");
const helmet = require("helmet");
const mongoSanitize = require("express-mongo-sanitize");
const xss = require("xss-clean");

// Routes
const userRouter = require("./routes/userRoutes");
const carRouter = require("./routes/carRoutes");
const reserveRouter = require("./routes/reserveRoutes");
const vipRouter = require("./routes/vipRoutes");
const { webhookCheckout } = require("./controllers/vipController");

dotenv.config({ path: "./config.env" });
const port = process.env.PORT || 4000;
const app = express();
const DB = process.env.MONGODB_URL;



app.use(helmet());
app.use(mongoSanitize());
app.use(xss());

mongoose
  .connect(DB, {})
  .then(() => console.log("Database: DB connected successfully"))
  .catch((err) => console.error("Database connection error:", err));

const corsOptions = {
  origin: "https://rendyscarshop-production-2386.up.railway.app",
  credentials: true,
  allowedHeaders: ["Content-Type", "Authorization"],
  methods: ["GET", "POST", "PATCH"],
};

app.post(
  "/webhook-checkout",
  express.raw({ type: "application/json" }),
  webhookCheckout
);

app.use(cors(corsOptions));
app.use(express.json({ limit: "30kb" }));
app.set('trust proxy', 1);
app.use(cookieParser());

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: true,
      httpOnly: true,
      sameSite: "none",
      maxAge: 24 * 60 * 60 * 1000,
      domain: "railway.app"
    },
  })
);

app.use(passport.initialize());
app.use(passport.session());

app.use("/api/v1/users", userRouter);
app.use("/api/v1/cars", carRouter);
app.use("/api/v1/reserves", reserveRouter);
app.use("/api/v1/vips", vipRouter);

app.use(globalErrorHandler);

const server = app.listen(port, () => {
  console.log(`Server: Server is running on PORT: ${port}`);
});
