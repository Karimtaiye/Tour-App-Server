const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide a name'],
    trim: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    validate: [validator.isEmail, 'Please provide a valid email'],
  },
  verified: {
    type: Boolean,
    default: false,
  },
  photo: {
    type: String,
    default: 'default.jpg',
  },
  role: {
    type: String,
    enum: {
      values: ['user', 'guide', 'lead-guide', 'admin'],
      message: 'Role should either be a user, guide, lead-guide or an admin',
    },
    default: 'user',
  },
  password: {
    type: String,
    required: [true, 'Please provide a password'],
    minLength: [8, 'Password must be 8 characters or more'],
    select: false,
  },
  passwordConfirm: {
    type: String,
    required: [true, 'Please confirm your password'],
    validate: {
      validator: function (val) {
        return val === this.password;
      },
      message: 'Password and Confirm password are not the same',
    },
  },
  verifyEmailToken: String,
  verifyEmailTokenExpiresIn: Date,
  passwordChangedAt: Date,
  passwordResetToken: String,
  passwordTokenExpiresIn: Date,
  active: {
    type: Boolean,
    default: true,
    select: false,
  },
});

userSchema.index({ email: 1 });

userSchema.pre('save', async function (next) {
  //if password is actually modified
  if (!this.isModified('password')) return next();

  this.password = await bcrypt.hash(this.password, 12);

  this.passwordConfirm = undefined;
  next();
});

userSchema.methods.createVerifyEmailToken = function () {
  const verifyToken = crypto.randomBytes(32).toString('hex');

  this.verifyEmailToken = crypto
    .createHash('sha256')
    .update(verifyToken)
    .digest('hex');

  //expires 10 days from the day the account was created
  this.verifyEmailTokenExpiresIn = Date.now() + 24 * 60 * 60 * 1000 * 10;

  return verifyToken;
};

userSchema.methods.comparePasswords = async function (
  underlyingPassword,
  userPassword,
) {
  return await bcrypt.compare(underlyingPassword, userPassword);
};

userSchema.pre('save', function (next) {
  if (!this.isModified('password') || this.isNew) return next();

  this.passwordChangedAt = Date.now() - 1000;
  next();
});

userSchema.methods.checkChangedPasswordDate = function (JWTTimeStamp) {
  if (this.passwordChangedAt) {
    const parsedDate = parseInt(this.passwordChangedAt.getTime() / 1000, 10);
    // console.log(parsedDate, JWTTimeStamp);
    return JWTTimeStamp < parsedDate;
  }
  //password not changed
  return false;
};

userSchema.methods.createPasswordResetToken = function () {
  const resetToken = crypto.randomBytes(32).toString('hex');

  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  this.passwordTokenExpiresIn = Date.now() + 10 * 60 * 1000;

  return resetToken;
};

userSchema.pre(/^find/, function (next) {
  this.find({ active: { $ne: false } });
  next();
});

const User = mongoose.model('User', userSchema);

module.exports = User;
