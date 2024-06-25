const AppError = require('../utilities/appError');

const handleCastError = (err) => {
  const message = `Invalid ${err.path}: ${err.value}`;
  return new AppError(message, 400);
};

const handleValidationError = (err) => {
  const errs = Object.values(err.errors);
  const message = errs.map((el) => el.message).join(', ');
  return new AppError(message, 400);
};

const handleDuplicateFieldsDB = (err) => {
  const value = err.errmsg.match(/(["'])(\\?.)*?\1/)[0];
  return new AppError(`Duplicate name field: ${value}`, 400);
};

const handleInvalidJWTError = () => {
  return new AppError('Invalid token, please log in again!', 401);
};

const handleExpiredJWTError = () => {
  return new AppError('Your token has expired, please log in again!', 401);
};

const sendErrorDev = (err, res) => {
  //development error for developers
  res.status(err.statusCode).json({
    status: err.status,
    error: err,
    message: err.message,
    stack: err.stack,
  });
};

const sendErrorProd = (err, res) => {
  //Operational: trusted error, send to client
  console.error('💣ERROR', err);
  if (err.isOperational) {
    res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
    });
    //Programming error,: Don't leeak details
  } else {
    //Log error
    //send generic response
    res.status(500).json({
      status: 'error',
      message: 'Something went very wrong,',
    });
  }
};

module.exports = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(err, res);
  } else if (process.env.NODE_ENV === 'production') {
    if (err.name === 'CastError') err = handleCastError(err);
    if (err.name === 'ValidationError') err = handleValidationError(err);
    if (err.code === 11000) err = handleDuplicateFieldsDB(err);
    if (err.name === 'JsonWebTokenError') err = handleInvalidJWTError();
    if (err.name === 'TokenExpiredError') err = handleExpiredJWTError();
    sendErrorProd(err, res);
  }
};
