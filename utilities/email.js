const nodemailer = require('nodemailer');
const pug = require('pug');
const htmlToText = require('html-to-text');

module.exports = class SendMail {
  constructor(user, url) {
    this.firstName = user.name.split(' ')[0];
    this.url = url;
    this.to = user.email;
    this.from = `Tour-Server-App <${process.env.EMAIL_FROM}>`;
  }

  mailTransport() {
    // nodemailer.createTransport()
    if (process.env.NODE_ENV === 'production') {
      return nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 465,
        auth: {
          user: process.env.APP_EMAIL,
          pass: process.env.APP_PASSWORD,
        },
        tls: {
          rejectUnauthorized: false,
        },
      });
    }

    return nodemailer.createTransport({
      // service: 'Gmail',
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      auth: {
        user: process.env.EMAIL_USERNAME,
        pass: process.env.EMAIL_PASSWORD,
      },
    });
  }

  async send(template, subject) {
    //Specify the templates file location
    try {
      const html = await pug.renderFile(
        `${__dirname}/../views/emails/${template}.pug`,
        {
          subject,
          url: this.url,
          firstName: this.firstName,
        },
      );

      //specify mail options
      const mailOptions = {
        from: this.from,
        to: this.to,
        subject,
        html,
        text: htmlToText.convert(`${html}`),
      };

      //send the mail
      const mailDet = await this.mailTransport().sendMail(mailOptions);
      console.log(mailDet);
    } catch (err) {
      console.log(err);
    }
  }

  async verifyMail() {
    await this.send('verifyEmail', 'Email Verification');
  }

  async mailWelcome() {
    await this.send('welcome', 'Welcome to Tour-App-Server');
  }

  async passwordResetMail() {
    await this.send('passwordReset', 'Password Reset Link');
  }
};

// const sendMail = async options => {
//   //Create a transporter
//   const transporter = nodemailer.createTransport({
//     // service: 'Gmail',
//     host: process.env.EMAIL_HOST,
//     port: process.env.EMAIL_PORT,
//     auth: {
//       user: process.env.EMAIL_USERNAME,
//       pass: process.env.EMAIL_PASSWORD,
//     },
//   });

//   const mailOptions = {
//     from: 'Tour-Server App',
//     to: options.email,
//     subject: options.subject,
//     text: options.message,
//   };

//   await transporter.sendMail(mailOptions);

// };
