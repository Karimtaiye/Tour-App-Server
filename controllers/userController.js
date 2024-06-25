const User = require('../models/User');
const catchAsync = require('../utilities/catchAsync');
const AppError = require('../utilities/appError');
const factory = require('./handlerFactory');
const multer = require('multer');
const sharp = require('sharp');

// const multerDiskStorage = multer.diskStorage({
//   destination: (req, file, cb) => {
//     cb(null, 'public/img/users');
//   },

//   filename: (req, file, cb) => {
//     const ext = file.mimetype.split('/')[1];
//     cb(null, `user-${req.user._id}-${Date.now()}.${ext}`);
//   },
// });

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

const filteredBody = (obj, ...fields) => {
  // console.log(obj, Object.keys(obj));
  const newObj = {};
  Object.keys(obj).forEach(el => {
    if (fields.includes(el)) newObj[el] = obj[el];
  });
  return newObj;
};

exports.getMe = (req, res, next) => {
  //set the params id to the currently logged in user
  req.params.id = req.user.id;
  next();
};

exports.uploadUserPhoto = upload.single('photo');
exports.resizeUserPhoto = catchAsync(async (req, res, next) => {
  req.file.filename = `user-${req.user._id}-${Date.now()}.jpeg`;

  await sharp(req.file.buffer)
    .resize(500, 500)
    .toFormat('jpeg')
    .jpeg({ quality: 90 })
    .toFile(`public/img/users/${req.file.filename}`);

  next();
});

exports.updateMe = catchAsync(async (req, res, next) => {
  //checks if there incoming body contains the password and confirm password properties
  if (req.body.password || req.body.passwordConfirm) {
    next(
      new AppError(
        'This route is not for updating password. Use /forget-password ',
      ),
    );
  }

  //updates only name and the email filed
  const fileredObj = filteredBody(req.body, 'name', 'email');
  if (req.file) fileredObj.photo = req.file.filename;

  const newUser = await User.findByIdAndUpdate(req.user._id, fileredObj, {
    new: true,
    runValidators: true,
  });

  res.status(200).json({
    status: 'success',
    data: {
      user: newUser,
    },
  });
});

//reminder to set the status code of all deletedUser to 204
exports.deleteMe = catchAsync(async (req, res, next) => {
  // const deletedUser = await User.findByIdAndDelete(req.user._id);
  await User.findByIdAndUpdate(req.user._id, { active: false });
  res.status(204).json({
    status: 'success',
    // message: 'User deleted successfully',
    data: null,
  });
});

exports.createUser = (req, res) => {
  res.status(500).json({
    status: 'error',
    message: 'This route is not defined! Please use /signup instead',
  });
};

exports.getAllUsers = factory.getAll(User);
exports.getUser = factory.getOne(User);
exports.updateUser = factory.updateOne(User);
exports.deletUser = factory.deleteOne(User);
