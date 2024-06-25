const catchAsyncError = require('../utilities/catchAsync');
const AppError = require('../utilities/appError');
const ApiFeatures = require('../utilities/apiFeatures');

exports.deleteOne = Model =>
  catchAsyncError(async (req, res, next) => {
    const doc = await Model.findByIdAndDelete(req.params.id);

    if (!doc) {
      return next(new AppError("Can't find document with that ID", 404));
    }
    res.status(204).json({
      status: 'success',
      data: null,
    });
  });

exports.updateOne = Model =>
  catchAsyncError(async (req, res, next) => {
    const doc = await Model.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!doc) {
      return next(new AppError("Can't find document with that ID", 404));
    }

    res.status(200).json({
      status: 'success',
      data: {
        data: doc,
      },
    });
  });

exports.createOne = Model =>
  catchAsyncError(async (req, res, next) => {
    const doc = await Model.create(req.body);
    res.status(201).json({
      status: 'success',
      data: {
        data: doc,
      },
    });
  });

exports.getOne = (Model, popOption) =>
  catchAsyncError(async (req, res, next) => {
    let query = Model.findById(req.params.id);
    //IF A POPULATE OPTION IS PASSED, POPULATE THE QUERY WITH THE POPULATE OBJECT
    if (popOption) query = query.populate(popOption);
    const doc = await query;

    if (!doc) {
      return next(new AppError("Can't find document with that ID", 404));
    }

    res.status(200).json({
      status: 'success',
      requestedAt: req.requestTime,
      data: {
        data: doc,
      },
    });
  });

exports.getAll = Model =>
  catchAsyncError(async (req, res, next) => {
    //IMPLEMENTING NESTED ROUTING HANDLER FOR GETTING A REVIEW
    let filter = {};
    if (req.params.tourId) filter = { tour: req.params.tourId };

    const features = new ApiFeatures(Model.find(filter), req.query)
      .filter()
      .sort()
      .limitFields()
      .paginate();

    const docs = await features.query;
    // const docs = await features.query.explain();

    res.status(200).json({
      status: 'success',
      requestedAt: req.requestTime,
      result: docs.length,
      data: {
        data: docs,
      },
    });
  });
