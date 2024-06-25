const mongoose = require('mongoose');

process.on('uncaughtException', err => {
  console.log(err.name, err.message);
  console.log(err.stack);
  console.log('CLOSING SERVER................');
  process.exit(1);
});
const app = require('./app');

const DB = process.env.DATABASE.replace(
  '<password>',
  process.env.DATABASE_PASSWORD,
);
// console.log(process.env);
mongoose.connect(DB).then(() => {
  console.log('Connected to database successfully');
});
// .catch((err) => {
//   console.log(`Database connection error: ${err}`);
// });

const port = process.env.PORT || 3000;
const server = app.listen(port, () => {
  console.log(`App running on port: ${port}`);
});

process.on('unhandledRejection', err => {
  console.log(err.name, err.message);
  console.log(err.stack);
  console.log('CLOSING SERVER................');
  server.close(() => {
    process.exit(1);
  });
});
