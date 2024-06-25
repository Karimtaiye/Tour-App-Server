const Review = require('../models/Review');
const catchAsync = require('../utilities/catchAsync');
const factory = require('./handlerFactory');
const Tour = require('../models/Tour');
const AppError = require('../utilities/appError');

exports.addTourUserId = (req, res, next) => {
  //IMPLEMENTING NESTED ROUTING HANDLER FOR CREATING A REVIEW
  if (!req.body.tour) req.body.tour = req.params.tourId;
  if (!req.body.user) req.body.user = req.user._id;
  next();
};

exports.checkForDuplicate = catchAsync(async (req, res, next) => {
  // solution1)Get the current Tour
  const currentTour = await Tour.findById(
    req.body.tour || req.params.tourId,
  ).populate('reviews');

  //Loop through the reviews and check if there is one with the current user id
  const prevRev = currentTour.reviews.filter(
    el => el.user._id.toString() === req.user._id.toString(),
  );
  if (prevRev.length > 0) {
    //if there are reviews with the id, throw this generic erro
    next(new AppError('This user has already reviewed this tour', 401));
  }
  next();
});

exports.getAllReviews = factory.getAll(Review);
exports.getReview = factory.getOne(Review);
exports.createReview = factory.createOne(Review);
exports.deleteReview = factory.deleteOne(Review);
exports.updateReview = factory.updateOne(Review);
