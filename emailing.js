const nodemailer = require( 'nodemailer' );
const smtpTransport = require( 'nodemailer-smtp-transport' );

const sendEmail = ( text, to, subjectMsg ) => {
  console.log( text );
  // console.log( to );
  // console.log( subjectMsg );
  const transport = nodemailer.createTransport( smtpTransport( {
    service: 'gmail',
    auth   : {
      user: 'four.progs@gmail.com',
      pass: 'htndeth0614'
    },
    tls    : {
      rejectUnauthorized: false
    }
  } ) );
  const mailOpt = {
    from   : '"4progs" <four.progs@gmail.com>',
    to     : to,
    subject: subjectMsg,
    html   : text
  };
  transport.sendMail( mailOpt, ( error, info ) => {
    if ( error ) {
      console.log( error );
    } else {
      console.log( 'Email sent: ' + info.response );
    }
  } );
};

module.exports.sendEmail = sendEmail;