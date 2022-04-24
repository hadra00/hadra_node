var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var jwt = require('jsonwebtoken');
const { Pool, Client } = require('pg');
const pool = new Pool({
  user: 'ugefbsot',
  host: 'tyke.db.elephantsql.com',
  database: 'ugefbsot',
  password: 'lTU90RX--HLL7zRxWjvtfkcjPQt8IMXY',
  port: 5432,
  max: 10,
  idleTimeoutMillis: 30000,
});


var indexRouter = require('./routes/index');
var trgovacRouter = require('./routes/trgovac');
var usersRouter = require('./routes/users');
const {decode} = require("jsonwebtoken");

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/users', usersRouter);
app.use(function (req, res, next) {
    if(req.url === '/login' || req.url === '/registracijaKupca' || req.url === '/registracijaTrgovca')
        return next();
  const token = req.cookies.jwt;
  console.log("middleware: ", token);
  jwt.verify(token, 'net ninja secret', (err, decodedToken) => {
    if (err) {
      console.log(err.mesage);
      res.redirect('/login');
    } else {
        console.log("samo da ispisem decoded token: ", decodedToken);
      res.locals.idkorisnika = decodedToken.id;
      res.locals.usernamekorisnika = decodedToken.korisnicko;
      console.log('DECOOODED TOKEEEEN token: ', decodedToken);
      console.log('DECOOODED DRUGII PUUT TOKEEEEN token: ', res.locals.idkorisnika);
      console.log('DECOOODED DRUGII PUUT TOKEEEEN token: ', res.locals.usernamekorisnika);
      next();
    }
  })
});
app.use('/', indexRouter);

app.use(function (req, res, next) {
  console.log('ZA TRGOVCE');
  pool.query(`select * from trgovci where id = ${res.locals.idkorisnika}`,
      (err, result) => {
        if (err) {
          console.info(err);
          res.locals.idkorisnika = null;
          return next();
        }
        console.info(result.rows);
        console.log('Evo trgovca sa id: ', result.rows[0]);
        if(result.rows.length === 0) {
          res.redirect('/login');
        }
        else {
          next();
        }
      })
});
app.use('/trgovac', trgovacRouter);
//app.use('/', indexRouter);
//app.use('/users', usersRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
