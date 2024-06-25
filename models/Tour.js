const mongoose = require('mongoose');
const slugify = require('slugify');
// const User = require('./User');

const tourSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      require: [true, 'A Tour must have a name'],
      unique: true,
      trim: true,
      maxlength: [40, 'A tour name must be less than or equal to 40'],
      minLength: [10, 'A tour name must be greater than or equal to 10'],
      // validate: [validator.isAlpha(this, { ignore: true })],
    },
    slug: String,
    difficulty: {
      type: String,
      required: [true, 'A Tour must contain difficulty'],
      enum: {
        values: ['easy', 'medium', 'hard'],
        message: 'Difficulty is either easy, difficult or medium',
      },
    },
    price: {
      type: Number,
      required: [true, 'A Tour must have a price'],
    },
    priceDiscount: {
      type: Number,
      validate: {
        validator: function (val) {
          return this.price > val;
        },
        message: `Tour Discount ({VALUE}) cannot be more than price`,
      },
    },

    description: {
      type: String,
      trim: true,
      required: [true, 'A Tour must have a description'],
    },
    duration: {
      type: Number,
      required: [true, 'A Tour must must have duration'],
    },
    maxGroupSize: {
      type: Number,
      required: [true, 'A Tour must have a group size'],
    },
    summary: {
      type: String,
      trim: true,
      required: [true, 'A Tour must have a summary'],
    },
    ratingsQuantity: {
      type: Number,
      default: 0,
    },
    ratingsAverage: {
      type: Number,
      default: 4.5,
      min: [1, 'Rating must be above 1.0'],
      max: [5, 'Rating must be below 5.0'],
    },
    imageCover: {
      type: String,
      required: [true, 'A Tour must have a cover image'],
    },
    images: [String],
    createdAt: {
      type: Date,
      default: Date.now(),
      select: false,
    },
    startDates: [Date],
    secretTour: {
      type: Boolean,
      default: false,
    },
    startLocation: {
      type: {
        type: String,
        default: 'Point',
        enum: ['Point'],
        address: String,
        description: String,
      },
      coordinates: [Number],
    },
    locations: [
      {
        type: {
          type: String,
          default: 'Point',
          enum: ['Point'],
        },
        coordinates: [Number],
        address: String,
        description: String,
        day: Number,
      },
    ],
    guides: [
      {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
      },
    ],
    // reviews: [
    //   {
    //     type: mongoose.Schema.ObjectId,
    //     ref: 'Review',
    //   },
    // ],
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

//VIRTAUL POPULATE
tourSchema.virtual('durationWeeks').get(function () {
  return this.duration / 7;
});

//VIRTAUL POPULATE
tourSchema.virtual('reviews', {
  ref: 'Review',
  foreignField: 'tour',
  localField: '_id',
});

//DOCUMENT MIDDLE:
//.save() and create()
tourSchema.pre('save', function (next) {
  if (this.isModified('name')) {
    this.slug = slugify(this.name, {
      lower: true,
    });
  }
  next();
});

//CREATE INDEXES ON SOME FIELDS TO REDUCE NO OF DOCUMENT SCANNED BY MONGODB;
tourSchema.index({ price: 1, ratingsAverage: -1 });
tourSchema.index({ slug: 1 });
tourSchema.index({ startLocation: '2dsphere' });

// pre-FindoneandUpdate() middleware
//overwrites the slu with a new slug generated from the updated name field
tourSchema.pre('findOneAndUpdate', function (next) {
  const update = this.getUpdate();
  // console.log(update, 'hello');
  if (update?.name) {
    update.slug = slugify(update.name, {
      lower: true,
    });
  }
  next();
});

// tourSchema.pre('save', async function (next) {
//   const guidesPromise = this.guides.map(async (id) => await User.findById(id));
//   this.guides = await Promise.all(guidesPromise);
//   next();
// });

// tourSchema.post('save', function (doc, next) {
//   next();
// });

//QUERY MIDDLEWARE:
tourSchema.pre(/^find/, function (next) {
  // this.find({ secretTour: { $ne: true } });
  this.start = Date.now();
  next();
});

tourSchema.post(/^find/, function (docs, next) {
  console.log(`Query took ${this.start - Date.now()} milliseconds`);
  next();
});

tourSchema.pre(/^find/, function (next) {
  this.populate({
    path: 'guides',
    select: '-__v -passwordChangedAt,',
  });
  next();
});

//AGGREGATE MIDDLEWARE:
tourSchema.pre('aggregate', function (next) {
  // this.pipeline().unshift({ $match: { secretTour: { $ne: true } } });
  console.log(this.pipeline());
  next();
});
const Tour = mongoose.model('Tour', tourSchema);

module.exports = Tour;
