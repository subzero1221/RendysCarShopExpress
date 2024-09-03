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
  origin: "https://rendyscarshop-production.up.railway.app",
  credentials: true,
  methods: ["GET", "POST", "PATCH"],
};

app.use(cors(corsOptions));
app.use(express.json({ limit: "30kb" }));
app.use(cookieParser());

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    saveUninitialized: false,
    resave: false,
    store: MongoStore.create({
      mongoUrl: process.env.MONGODB_URL,
    }),
    cookie: {
      httpOnly: true,
      secure: true,
      maxAge: 24 * 60 * 60 * 1000,
      sameSite: "none",
      path: "/",
      domain: ".railway.app",
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
