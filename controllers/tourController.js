const Tour = require('../models/Tour');
const AppError = require('../utilities/appError');
const catchAsync = require('../utilities/catchAsync');
// const ApiError = require('../utilities/appError');
const multer = require('multer');
const sharp = require('sharp');
const catchAsyncError = require('../utilities/catchAsync');
const factory = require('./handlerFactory');

const multerStorage = multer.memoryStorage();

const multerFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image')) {
    cb(null, true);
  } else {
    cb(
      new AppError('Invalid image type, please upload on/y images', 400),
      false,
    );
  }
};

const upload = multer({
  storage: multerStorage,
  fileFilter: multerFilter,
});

exports.uploadTourImages = upload.fields([
  { name: 'imageCover', maxCount: 1 },
  { name: 'images', maxCount: 3 },
]);

exports.resizeTourImages = async (req, res, next) => {
  req.body.imageCover = `tour-${req.params.id}-${Date.now()}-cover.jpeg`;

  await sharp(req.files.imageCover[0].buffer)
    .resize(2000, 1333)
    .toFormat('jpeg')
    .jpeg({ quality: 90 })
    .toFile(`public/img/tours/${req.body.imageCover}`);

  req.body.images = [];
  await Promise.all(
    req.files.images.map(async (file, ind) => {
      const filename = `public/img/tours/tour-${req.params.id}-${Date.now()}-${ind + 1}.jpeg`;
      await sharp(file.buffer)
        .resize(2000, 1333)
        .toFormat('jpeg')
        .jpeg({ quality: 90 })
        .toFile(filename);

      req.body.images.push(filename);
    }),
  );
  next();
};

exports.alias = (req, res, next) => {
  req.query.sort = 'price';
  req.query.page = '1';
  req.query.limit = '5';
  req.query.field = 'name,difficulty,price,ratingsAverage,summary';
  next();
};

exports.getAllTours = factory.getAll(Tour);
exports.getTour = factory.getOne(Tour, { path: 'reviews' });
exports.createTour = factory.createOne(Tour);
exports.updateTour = factory.updateOne(Tour);
exports.deletTour = factory.deleteOne(Tour);

exports.tourStats = catchAsyncError(async (req, res, next) => {
  const stats = await Tour.aggregate([
    {
      $match: { ratingsAverage: { $gte: 4.5 } },
    },
    {
      $group: {
        _id: { $toUpper: '$difficulty' },
        numTours: { $sum: 1 },
        numRatings: { $sum: '$ratingsQuantity' },
        avgRatings: { $avg: '$ratingsAverage' },
        avgPrice: { $avg: '$price' },
        minPrice: { $min: '$price' },
        maxPrice: { $max: '$price' },
      },
    },
    {
      $sort: { avgPrice: 1 },
    },
  ]);
  res.status(200).json({
    status: 'success',
    data: {
      stats,
    },
  });
});

exports.monthlyPlan = catchAsyncError(async (req, res, next) => {
  const year = req.params.year * 1;

  const plan = await Tour.aggregate([
    {
      $unwind: '$startDates',
    },
    {
      $match: {
        startDates: {
          $gte: new Date(`${year}-01-01`),
          $lte: new Date(`${year}-12-31`),
        },
      },
    },
    {
      $group: {
        _id: { $month: '$startDates' },
        numTourStarts: { $sum: 1 },
        tours: { $push: '$name' },
      },
    },
    {
      $addFields: { month: '$_id' },
    },
    {
      $project: { _id: 0 },
    },
    {
      $sort: { numTourStarts: -1 },
    },
    {
      $limit: 12,
    },
  ]);
  res.status(200).json({
    result: plan.length,
    status: 'success',
    data: {
      plan,
    },
  });
});

//Get tours around
exports.getToursAround = catchAsync(async (req, res, next) => {
  const { distance, latlng, unit } = req.params;

  if (!distance || !latlng) {
    return next(
      new AppError(
        'Please specify your radius and location longitude and latitude',
      ),
    );
  }

  const [lat, lng] = latlng.split(',');
  if (!lat || !lng) {
    return next(
      new AppError(
        'Please specify your latitude and longitude in the format "lat,lng',
      ),
    );
  }

  // console.log(distance, lat, lng, unit);

  const radius = unit === 'mi' ? distance / 3963.2 : distance / 6378.1;

  const tours = await Tour.find({
    startLocation: {
      $geoWithin: { $centerSphere: [[lng, lat], radius] },
    },
  });
  res.status(200).json({
    status: 'success',
    result: tours.length,
    data: {
      data: tours,
    },
  });
});

exports.getToursDistances = catchAsync(async (req, res, next) => {
  const { latlng, unit } = req.params;
  if (!latlng) {
    return next(
      new AppError('Please specify location (longitude and latitude)'),
    );
  }

  const [lat, lng] = latlng.split(',');
  if (!lat || !lng) {
    return next(
      new AppError(
        'Please specify your latitude and longitude in the format "lat,lng',
      ),
    );
  }
  const multiplier = unit === 'mi' ? 0.000621371 : 0.001;

  const distances = await Tour.aggregate([
    {
      $geoNear: {
        near: {
          type: 'Point',
          coordinates: [lng * 1, lat * 1],
        },
        distanceField: 'distance',
        distanceMultiplier: multiplier,
      },
    },
    {
      $project: {
        name: 1,
        distance: 1,
      },
    },
  ]);

  res.status(200).json({
    status: 'success',
    result: distances.length,
    data: {
      data: distances,
    },
  });
});

// exports.GetUserLocation = catchAsync(async (req, res, next) => {
//   const { latlng, unit } = req.params;

//   const radius = unit === 'mi' ? start / 3963.2 : start / 6378.1;

// if (!latlng) {
//   return next(
//     new AppError('Please specify your location longitude and latitude'),
//   );
// }

//   const [lat, lng] = latlng.split(',');
//   if (!lat || !lng) {
//     return next(
//       new AppError(
//         'Please specify your latitude and longitude in the format "lat,lng',
//       ),
//     );
//   }

//   const range = await Tour.aggregate([
//     {
//       $geoWithin: {
//         type:'Point',
//         coordinates:
//       }
//     }
//   ])
// });
