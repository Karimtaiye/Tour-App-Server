const express = require('express');

const router = express.Router();
const tourController = require('../controllers/tourController');
const authController = require('../controllers/authController');
const reviewRouter = require('./reviewRoutes');

router.use('/:tourId/reviews', reviewRouter);

// router.param('id', tourController.checkID);
router.route('/tour-stats').get(tourController.tourStats);
router
  .route('/monthly-plan/:year')
  .get(
    authController.protect,
    authController.restrictTo('admin', 'lead-guide', 'guide'),
    tourController.monthlyPlan,
  );

router
  .route('/top-5-cheap')
  .get(tourController.alias, tourController.getAllTours);

router
  .route('/tours-within/distance/:distance/center/:latlng/unit/:unit')
  .get(tourController.getToursAround);

router
  .route('/tours-distances/center/:latlng/unit/:unit')
  .get(tourController.getToursDistances);

router
  .route('/')
  .get(tourController.getAllTours)
  .post(
    authController.protect,
    authController.restrictTo('admin', 'lead-guide'),
    tourController.createTour,
  );

router
  .route('/:id')
  .get(tourController.getTour)
  .patch(
    authController.protect,
    authController.restrictTo('admin', 'lead-guide'),
    tourController.uploadTourImages,
    tourController.resizeTourImages,
    tourController.updateTour,
  )
  .delete(
    authController.protect,
    authController.restrictTo('admin', 'lead-guide'),
    tourController.deletTour,
  );

module.exports = router;
