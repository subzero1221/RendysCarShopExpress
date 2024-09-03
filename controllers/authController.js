const crypto = require("crypto");
const catchAsync = require("../utils/catchAsync");
const User = require("./../models/userModel");
const session = require("express-session");
const AppError = require("../utils/AppError");
const passport = require("passport");
const { Strategy } = require("passport-local");
const sendEmail = require("./../utils/email");
const { google } = require("googleapis");
const stream = require("stream");
const path = require("path");
require("dotenv").config({ path: "./config.env" });

passport.serializeUser((user, done) => {
  done(null, user._id.toString());
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err);
  }
});

passport.use(
  new Strategy({ usernameField: "email" }, async (email, password, done) => {
    try {
      const user = await User.findOne({ email }).select("+password");

      if (!user || !(await user.correctPassword(password, user.password))) {
        return done(null, false, { message: "Email or password is incorrect" });
      }
      return done(null, user);
    } catch (err) {
      return done(err);
    }
  })
);

exports.signup = catchAsync(async (req, res, next) => {
  const newUser = await User.create({
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    passwordConfirm: req.body.passwordConfirm,
  });

  req.login(newUser, async (err) => {
    if (err) {
      return next(new AppError("Failed to log in after signup", 500));
    }

    // Manually save the session
    req.session.save((err) => {
      if (err) {
        return next(new AppError("Failed to save session after signup", 500));
      }

      res.cookie("userId", String(req.user._id), {
        httpOnly: true,
        secure: true,
        maxAge: 24 * 60 * 60 * 1000, // 1 day
        sameSite: "None",
        path: "/",
        domain: ".railway.app",
      });

      res.status(201).json({
        status: "success",
        user: newUser,
      });
    });
  });
});

exports.login = catchAsync(async (req, res, next) => {
  passport.authenticate("local", (err, user, info) => {
    if (err) return next(err);
    if (!user) return next(new AppError(info.message, 401));

    req.login(user, (err) => {
      if (err) return next(err);

  res.cookie("userId", req.user._id.toString(), {
  httpOnly: true,
  secure: true,
  expires: new Date(Date.now() + 24 * 60 * 60 * 1000), // 1 day from now
  sameSite: "None",
  path: "/",
  domain: ".railway.app",
});

      res.status(200).json({
        status: "success",
        message: "You are logged in",
        user: req.user,
      });
    });
  })(req, res, next);
});

exports.logout = (req, res, next) => {
  req.logout((err) => {
    if (err) {
      return next(err);
    }

    req.session.destroy(() => {
      res.clearCookie("connect.sid");
      res.clearCookie("userId");
      res.status(200).json({
        status: "success",
        message: "You are logged out",
      });
    });
  });
};

exports.updatePassword = catchAsync(async (req, res, next) => {
  if (!req.user) {
    return next(new AppError("Login in to get access to this action", 401));
  }

  const user = await User.findById(req.user._id).select("+password");
  if (!user) {
    return next(new AppError("User not found", 404));
  }

  if (!(await user.correctPassword(req.body.curPassword, user.password))) {
    return next(new AppError("Your current password isn't right", 401));
  }

  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  user.passwordChangedAt = Date.now();
  await user.save();

  // Send the response after successful update
  res.status(200).json({
    status: "success",
    pass: user.password,
  });
});

exports.forgotPassword = catchAsync(async (req, res, next) => {
  const user = await User.findOne({ email: req.body.email });
  if (!user) {
    return next(new AppError("No user found with this email", 404));
  }
  const resetToken = await user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false });
  const resetURL = `https://rendyscarshop-production.up.railway.app/resetPassword/${resetToken}`;

  const message = `Forgot your password? to change your password please go to: ${resetURL} `;
  try {
    sendEmail({
      email: user.email,
      subject: "Reset your password (valid 10 min)",
      message,
    });
    res.status(200).json({
      status: "succes",
      message: "Token sent to email!",
    });
  } catch (error) {
    //in case of error setting RESETTOKEN TO UNDEFINED
    (user.passwordResetToken = undefined),
      (user.passwordResetExpires = undefined),
      await user.save({ validateBeforeSave: false });

    return next(
      new AppError("There was an error sending email. Try again later!", 500)
    );
  }
});

exports.resetPassword = catchAsync(async (req, res, next) => {
  const hashedToken = crypto
    .createHash("sha256")
    .update(req.params.token)
    .digest("hex");

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  });

  // cheks if user exists and token is valid , sets new password
  if (!user) {
    return next(new AppError("Token is invalid or expired", 400));
  }
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();

  res.status(200).json({
    status: "success",
    msg: "You are logged in",
  });
});

exports.isLoggedIn = catchAsync(async (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  } else {
    return next(new AppError("You are not logged in", 401));
  }
});

////////////////////////////////////////////////////USERR THIINGGSS NOT AUTENTHICATIONNN!!!/////////////////////////////////////////////////////////////////////////////////////////////
const filterObj = (obj, ...allowed) => {
  const newObject = {};
  Object.keys(obj).forEach((el) => {
    if (allowed.includes(el)) newObject[el] = obj[el];
  });
  return newObject;
};
////////////////

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

////STORES PHOTO TO GOOGLE DRIVE///////////////////
async function photoManager(file) {
  const authClient = await getAuthClient();
  const drive = google.drive({ version: "v3", auth: authClient });

  // Create a readable stream from the file buffer
  const bufferStream = new stream.PassThrough();
  bufferStream.end(file.buffer);

  const fileMetadata = {
    name: `${file.originalname}`,
    parents: ["1nCkSvuJRY01OR9DWczzl1lpYPMRyOaTD"],
  };

  const media = {
    mimeType: file.mimetype,
    body: bufferStream, // Use the readable stream here
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
//////GET PHOTO FROM GOOGLE DRIVE////////////////
async function getPhotoUrl(fileId) {
  const authClient = await getAuthClient(); // Get the auth client
  const drive = google.drive({ version: "v3", auth: authClient });

  try {
    const response = await drive.files.get({
      fileId: fileId,
      fields: "webViewLink", // Fetch the URL of the file
    });

    return response.data.webViewLink; // Return the URL of the file
  } catch (error) {
    throw error;
  }
}

//////////////////////////////////////////////////////////////////

exports.updateProfile = catchAsync(async (req, res, next) => {
  const photo = req.file;

  if (!req.isAuthenticated())
    return next(
      new AppError(
        "You are not logged in! Log in to get access on this action."
      )
    );

  const filtredBody = filterObj(req.body, "name", "email");
  const updatedUser = await User.findByIdAndUpdate(req.params.id, filtredBody, {
    new: true,
    runValidators: true,
  });

  if (photo) {
    const uploadResponse = await photoManager(photo);
    const fileId = uploadResponse.id;

    const userWithNewPhoto = await User.findByIdAndUpdate(
      req.user._id.toString(),
      { photo: fileId },
      {
        new: true,
        runValidators: true,
      }
    );
  }

  res.status(200).json({
    status: "success",
    updatedUser,
  });
});

exports.getUserData = async (req, res, next) => {
  const userId = req.params.id;

  const user = await User.findById(userId);

  let photoUrl = null;
  if (user.photo && user.photo !== "userdefault.png") {
    try {
      photoUrl = await getPhotoUrl(user.photo);
    } catch (error) {
      console.error("Error fetching photo URL:", error);
    }
  }

  if (!user) return next(new AppError("User Not Found", 404));
  res.status(200).json({
    status: "success",
    user,
    photoUrl,
  });
};
