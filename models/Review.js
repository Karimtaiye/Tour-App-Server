const mongoose = require('mongoose');
const Tour = require('./Tour');

const reviewSchema = new mongoose.Schema(
  {
    review: {
      type: String,
      required: [true, 'A tour must have a review field'],
      trim: true,
    },
    ratings: {
      type: Number,
      min: [1, 'A tour review cannot be less than 1.0'],
      max: [5, 'A tour review cannot be more than 5.0'],
    },
    createdAt: {
      type: Date,
      default: Date.now(),
    },
    tour: {
      type: mongoose.Schema.ObjectId,
      ref: 'Tour',
      required: [true, 'Review must belong to a tour '],
    },
    user: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: [true, 'Review must belong to a user'],
    },
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

reviewSchema.pre(/^find/, function (next) {
  this.populate({
    path: 'user',
    select: 'name photo',
  });
  next();
});

reviewSchema.statics.calculateReviewData = async function (tourId) {
  const stats = await this.aggregate([
    {
      $match: { tour: tourId },
    },
    {
      $group: {
        _id: '$tour',
        nRatings: { $sum: 1 },
        avgRatings: { $avg: '$ratings' },
      },
    },
  ]);

  return await Tour.findByIdAndUpdate(tourId, {
    ratingsQuantity: stats.length > 0 ? stats[0].nRatings : 0,
    ratingsAverage: stats.length > 0 ? stats[0].avgRatings : 4.5,
  });
};

reviewSchema.post('save', async function () {
  try {
    await this.constructor.calculateReviewData(this.tour);
  } catch (err) {
    console.log(err);
  }
});

reviewSchema.pre(/^findOneAnd/, async function (next) {
  await this.model.findOne(this.getQuery());
  next();
});

reviewSchema.post(/^findOneAnd/, async function (doc) {
  await this.model.calculateReviewData(doc.tour);
});

const Review = mongoose.model('Review', reviewSchema);

module.exports = Review;
