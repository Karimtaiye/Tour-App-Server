const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const catchAsync = require('../utilities/catchAsync');
const AppError = require('../utilities/appError');
const { promisify } = require('util');
const Email = require('../utilities/email');

const generateToken = id => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

const generateAndSendToken = (user, statusCode, res, message = undefined) => {
  const token = generateToken(user._id);

  const cookieOptions = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000,
    ),
    httpOnly: true,
  };

  if (process.env.NODE_ENV === 'production') {
    cookieOptions.secure = true;
  }

  res.cookie('jwt', token, cookieOptions);
  user.password = undefined;

  res.status(statusCode).json({
    status: 'success',
    message: message,
    token,
    data: {
      user,
    },
  });
};

exports.signUp = catchAsync(async (req, res, next) => {
  const { name, email, password, passwordConfirm } = req.body;
  const user = await User.create({
    name,
    email,
    password,
    passwordConfirm,
  });

  //send welcome email to the new onboarded user
  try {
    const emailToken = user.createVerifyEmailToken();
    const url = `${req.protocol}://${req.get('host')}/verify/${emailToken}`;
    //send Verifiation email
    await new Email(user, url).verifyMail();
    await user.save({ validateBeforeSave: false });
  } catch (err) {
    console.log(err);
    return next(
      new AppError(
        'There was a problem sending the verification email, please try again later!',
        500,
      ),
    );
    user.verifyEmailToken = undefined;
    user.verifyEmailTokenExpiresIn = undefined;
    await user.save({ validateBeforeSave: false });
  }

  res.status(201).json({
    status: 'success',
    message: 'User created',
    data: {
      user,
    },
  });
});

exports.verifyUserEmail = catchAsync(async (req, res, next) => {
  //Get the incoming token from the params
  const token = req.params.token;

  //encrypt it in order to compare with the encrypted one saved in the databased
  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

  //compare both encrypted Token
  const user = await User.findOne({
    verifyEmailToken: hashedToken,
    verifyEmailTokenExpiresIn: { $gt: Date.now() },
  });

  //reminder to implement the account deletetion logic
  if (!user) {
    return next(
      new AppError(
        'Invalid or Expired Verification link, please request for another link if invalid or sign up again if verification link has expired',
      ),
    );
  }

  user.verified = true;
  user.verifyEmailToken = undefined;
  user.verifyEmailTokenExpiresIn = undefined;
  await user.save({ validateBeforeSave: false });

  await new Email(user, '/').mailWelcome();

  generateAndSendToken(user, 200, res, 'Email verification successful');
});

exports.logIn = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  //check if there is email ;
  if (!email || !password)
    return next(new AppError('Please provide email and password', 400));

  //check if email exists
  const user = await User.findOne({ email }).select('+password');

  //if email exists, compare passwords
  const checkPassword = await user?.comparePasswords(password, user.password);

  //if no email or password comparison falils, send error
  if (!user || !checkPassword)
    return next(new AppError('Incorrect email or password', 400));

  if (!user.verified) {
    return next(
      new AppError(
        'This account is not verified and is still within the 10 days limit to be in this state, will be deactivated/deleted after this time span!',
        400,
      ),
    );
  }
  //send the response
  generateAndSendToken(user, 200, res);
});

exports.protect = catchAsync(async (req, res, next) => {
  //if no token is provided, throw error
  if (!req.headers.authorization) {
    return next(
      new AppError('You are not logged in, please log in to get access!', 401),
    );
  }
  // checks if token exists
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies.jwt) {
    token = req.cookies.jwt;
  }

  //if token is not valid or expired throw err
  if (!token)
    return next(
      new AppError('Token expired, please log in again to get access!', 401),
    );

  //if no error, verify the provided token
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);
  // console.log(decoded);
  console.log(decoded.iat < decoded.exp ? 'Not-Expired' : 'Expired');

  //checks if there has been changes after token has been issued (e.g user been deleted)
  const sameUser = await User.findById(decoded.id);
  if (!sameUser)
    return next(
      new AppError(
        'The user with the provided token does no longer exits',
        401,
      ),
    );

  //checks if the user has changed their password after the token has been issued
  const passModifyCheck = sameUser.checkChangedPasswordDate(decoded.iat);

  //if user has changed password, send error
  if (passModifyCheck) {
    return next(
      new AppError(
        'User has recently changed password, please log in again!',
        401,
      ),
    );
  }

  // all requirements are checked save the current user to a user property on the req obj
  req.user = sameUser;

  //if all requirements are checked, grant the user access to the protected route
  next();
});

exports.isLoggedIn = async (req, res, next) => {
  if (req.cookies.jwt) {
    //if no error, verify the provided token
    try {
      const decoded = await promisify(jwt.verify)(
        req.cookies.jwt,
        process.env.JWT_SECRET,
      );

      //checks if there has been changes after token has been issued (e.g user been deleted)
      const sameUser = await User.findById(decoded.id);
      if (!sameUser) return next();

      //checks if the user has changed their password after the token has been issued
      const passModifyCheck = sameUser.checkChangedPasswordDate(decoded.iat);

      //if user has changed password, send error
      if (passModifyCheck) {
        return next();
      }
    } catch (err) {
      return next();
    }
  }
  next();
};

exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    //if the current user role is not in the role parameter array(in this case ['admin, 'lead-guide])
    if (!roles.includes(req.user.role)) {
      return next();
    }
    next();
  };
};

exports.forgetPassword = catchAsync(async (req, res, next) => {
  //checks if there is a email
  if (!req.body.email) {
    return next(
      new AppError('Please provide your email for reset password', 400),
    );
  }

  //check if the email exists on our app;
  const user = await User.findOne({ email: req.body.email });
  if (!user) {
    return next(
      new AppError('User with that email address cannot be found!', 404),
    );
  }

  //generate Random token
  const resetToken = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false });

  const requestURl = `${req.protocol}://${req.get('host')}/api/v1/forget-password/${resetToken}`;
  // const message = `Forgot your password? please submit a PATCH request to the this url ${requestURl}\nPlease ignore this email if you did not make this request \nunverified users will be deleted after 10 days`;
  try {
    await new Email(user, requestURl).passwordResetMail();

    res.status(200).json({
      status: 'success',
      message: 'Token sent to mail',
    });
  } catch (err) {
    user.passwordResetToken = undefined;
    user.passwordTokenExpiresIn = undefined;

    await user.save({ validateBeforeSave: false });

    console.log(err);

    return next(
      new AppError(
        'There was a problem sending the mail, please try again later!',
        500,
      ),
    );
  }
});

exports.resetPassword = catchAsync(async (req, res, next) => {
  //encrype the incoming token
  const hashedToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');

  //compare the hashed token with the resetPasswordToken in the database
  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordTokenExpiresIn: { $gt: Date.now() },
  });
  console.log(user, hashedToken, req.params.token);
  // console.log(Date.now() > user.passwordTokenExpiresIn);

  //if no user is found or if token has expired, send a generric response
  if (!user) {
    return next(new AppError('Token is Invalid or expired', 400));
  }

  //set the password in the database with the new password
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  user.passwordResetToken = undefined;
  user.passwordTokenExpiresIn = undefined;
  //save to update it
  await user.save();

  //generate new token to log in user
  generateAndSendToken(user, 200, res);
});

exports.updatePassword = catchAsync(async (req, res, next) => {
  //Get user from collection
  const user = await User.findById(req.user._id).select('+password');
  // console.log(req.user, user);

  //Check if current password is correct
  const comparePasswords = await user.comparePasswords(
    req.body.passwordCurrent,
    user.password,
  );
  if (!comparePasswords) {
    return next(new AppError('Incorrect current password', 400));
  }

  console.log(comparePasswords);

  //if so, update the password
  user.password = req.body.password;
  user.passwordConfirm = req.body.password;
  await user.save();

  //log in the user, send JWT
  generateAndSendToken(user, 200, res);
});

exports.logOut = catchAsync(async (req, res, next) => {
  if (req.cookies.jwt) {
    res.cookie('jwt', 'Logged Out', {
      expires: new Date(Date.now() + 10 * 1000),
      httpOnly: true,
    });
  }

  res.status(200).json({
    status: 'success',
    message: 'Logged Out successfully!!',
  });
});
