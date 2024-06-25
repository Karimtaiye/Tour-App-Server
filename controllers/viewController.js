// const Tour = require('../models/Tour');
// const catchAsync = require('../utilities/catchAsync');

// exports.getOverview = catchAsync(async (req, res, next) => {
//   //Get the tours fromm db
//   const tours = await Tour.find();

//   //render the template
//   res.status(200).render('overview', {
//     title: 'The Park Camper',
//     tours,
//   });
// });

// exports.getTour = catchAsync(async (req, res) => {
//   const { slug } = req.params;

//   const tour = await Tour.findOne({ slug });
//   res.status(200).render('tour', {
//     title: 'The Park Camper',
//     tour,
//   });
// });
