const dotenv = require('dotenv');

dotenv.config({ path: '../../config.env' });
console.log(process.env);
const fs = require('fs');
const mongoose = require('mongoose');
const Tour = require('../../models/Tour');
const User = require('../../models/User');
const Review = require('../../models/Review');

const DB = process.env.DATABASE.replace(
  '<password>',
  process.env.DATABASE_PASSWORD,
);
mongoose
  .connect(DB)
  .then(() => {
    console.log('Connected to database successfully');
  })
  .catch(err => {
    console.log(`Database connection error: ${err}`);
  });
const tours = JSON.parse(fs.readFileSync(`${__dirname}/tours.json`, 'utf-8'));
const users = JSON.parse(fs.readFileSync(`${__dirname}/users.json`, 'utf-8'));
const reviews = JSON.parse(
  fs.readFileSync(`${__dirname}/reviews.json`, 'utf-8'),
);

// console.log(tours);

const importData = async () => {
  try {
    await Tour.create(tours);
    await User.create(users, { validateBeforeSave: false });
    await Review.create(reviews);
    console.log('Data successfully saved!');
    process.exit();
  } catch (err) {
    console.log(err);
  }
};
const deleteData = async () => {
  try {
    await Tour.deleteMany();
    await User.deleteMany();
    await Review.deleteMany();
    console.log('Data successfully Deleted!');
    process.exit();
  } catch (err) {
    console.log(err);
  }
};

if (process.argv.at(-1) === '--import') {
  importData();
} else if (process.argv.at(-1) === '--delete') {
  deleteData();
}

console.log(process.argv);
