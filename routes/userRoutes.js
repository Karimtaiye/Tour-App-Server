const express = require('express');
const userController = require('../controllers/userController');
const authController = require('../controllers/authController');

const router = express.Router();

router.post('/signup', authController.signUp);
router.get('/verify/:token', authController.verifyUserEmail);
router.post('/login', authController.logIn);
router.post('/forget-password', authController.forgetPassword);
router.patch('/reset-password/:token', authController.resetPassword);

router.get(
  '/me',
  authController.isLoggedIn,
  authController.protect,
  userController.getMe,
  userController.getUser,
);
router.patch(
  '/update-me',
  authController.isLoggedIn,
  authController.protect,
  userController.uploadUserPhoto,
  userController.resizeUserPhoto,
  userController.updateMe,
);
router.delete(
  '/delete-me',
  authController.isLoggedIn,
  authController.protect,
  userController.deleteMe,
);
router.patch(
  '/change-password',
  authController.isLoggedIn,
  authController.protect,
  authController.updatePassword,
);
router.post(
  '/logout',
  authController.isLoggedIn,
  authController.protect,
  authController.logOut,
);

router
  .route('/')
  .get(
    authController.isLoggedIn,
    authController.protect,
    authController.restrictTo('admin'),
    userController.getAllUsers,
  )
  .post(
    authController.isLoggedIn,
    authController.protect,
    authController.restrictTo('admin'),
    userController.createUser,
  );

router
  .route('/:id')

  .get(
    authController.isLoggedIn,
    authController.protect,
    authController.restrictTo('admin'),
    userController.getUser,
  )
  .patch(
    authController.isLoggedIn,
    authController.protect,
    authController.restrictTo('admin'),
    userController.updateUser,
  )
  .delete(
    authController.isLoggedIn,
    authController.protect,
    authController.restrictTo('admin'),
    userController.deletUser,
  );

module.exports = router;

// const express = require('express');
// const userController = require('../controllers/userController');
// const authController = require('../controllers/authController');

// const router = express.Router();

// router.post('/signup', authController.signUp);
// router.post('/signup', authController.signUp);
// router.post('/login', authController.logIn);
// router.post('/forget-password', authController.forgetPassword);
// router.patch('/reset-password/:token', authController.resetPassword);

// //THIS MIDDLEWARE WILL PROTECT THE ROUTES THAT COMES AFTER THIS POINT(**MIDDLEWARE RUNS IN SEQUENCE**)
// router.use(authController.isLoggedIn, authController.protect);

// router.get(
//   '/me',
//   // authController.protect,//NO NEED TO ADD PROTECT TO ALL OF THE ROUTES AFTER THIS
//   userController.getMe,
//   userController.getUser,
// );
// router.patch(
//   '/update-me',
//   userController.uploadUserPhoto,
//   userController.resizeUserPhoto,
//   userController.updateMe,
// );
// router.delete('/delete-me', userController.deleteMe);
// router.patch('/change-password', authController.updatePassword);
// router.post('/logout', authController.logOut);

// //THIS MIDDLEWARE WILL RESTRICT THE ROUTES THAT COMES AFTER THIS POINT TO ADMIN
// router.use(authController.restrictTo('admin'));

// router
//   .route('/')
//   .get(userController.getAllUsers)
//   .post(userController.createUser);

// router
//   .route('/:id')

//   .get(userController.getUser)
//   .patch(userController.updateUser)
//   .delete(userController.deletUser);

// module.exports = router;
