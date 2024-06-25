const dotenv = require('dotenv');
const express = require('express');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const sanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const path = require('path');
const cookie = require('cookie-parser');

const globalErrorHandler = require('./controllers/errorController');
const tourRouter = require('./routes/tourRoutes');
const userRouter = require('./routes/userRoutes');
const reviewRouter = require('./routes/reviewRoutes');
// const viewRouter = require('./routes/viewRoutes');
const AppError = require('./utilities/appError');

dotenv.config({ path: 'config.env' });
console.log('NODE_ENV in main file:', process.env.NODE_ENV);
const app = express();

// app.set('view engine', 'pug');
// app.set('views', path.join(__dirname, 'views'));

//GLOBAL MIDDLEWARES
// Set security HTTP headers
app.use(helmet());
app.use(cookie());
//SERVE STATIC SITE
app.use(express.static('public'));

// Limit requests from same API
const limiter = rateLimit({
  max: req => {
    if (req.user && req.user.role === 'admin') {
      return 150;
    }
    return req.user ? 100 : 100;
  },
  windowMs: 60 * 60 * 1000, // 1 hour
  keyGenerator: req => {
    if (req.user && req.user._id) {
      return req.user._id;
    }
    return req.ip;
  },
  handler: (req, res, next, options) => {
    if (process.env.NODE_ENV === 'production') {
      return res.status(options.statusCode).json({
        status: 'fail',
        message: 'Too many requests, please try again in an hour!',
      });
    }
    return res.status(options.statusCode).json({
      status: 'fail',
      message: 'Too many requests, please try again in an hour!',
      remaining: null,
      tryAgainAfter: `${options.windowMs / (60 * 1000)} minutes`,
    });
  },
  // allowHttp: true,
});

app.use((req, res, next) => {
  console.log(req.cookies, 'cookies');
  next();
});

//BODY PARSING
app.use(express.json({ limit: '10kb' }));

//PREVENT NOSQL QUERY INJECTION
app.use(sanitize());

//PRREVENT XSS ATTACKS
app.use(xss());

//PREVENT PARAMETER POLLUTION
app.use(
  hpp({
    //DEFINING EXCEPTIONS FOR MOORE THAN ONE PARAMETER VARIABLE
    whitelist: [
      'duration',
      'price',
      'maxGroupSize',
      'difficulty',
      'name',
      'ratingsQuantity',
      'ratingsAverage',
    ],
  }),
);

//DEVELOPMENT LOGGING
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}
app.use('/api', limiter);

//RESPONSE TIME
app.use((req, res, next) => {
  req.requestTime = new Date().toISOString();
  next();
});

// app.get('/api/v1/tours', getAllTours);
// app.get('/api/v1/tours/:id', getTour);
// app.post('/api/v1/tours', createTour);
// app.patch('/api/v1/tours/:id', updateTour);
// app.delete('/api/v1/tours/:id', deletTour);

//APP BASE ROUTES
// app.use('/', viewRouter);
app.use('/api/v1/tours', tourRouter);
app.use('/api/v1/users', userRouter);
app.use('/api/v1/reviews', reviewRouter);

//HANDLER FOR ALL UNDEFINED ROUTES
app.all('*', (req, res, next) => {
  next(new AppError(`Cannot find ${req.url} on this server`, 404));
});

//HANDLE GLOBAL ERRORS
app.use(globalErrorHandler);

module.exports = app;
