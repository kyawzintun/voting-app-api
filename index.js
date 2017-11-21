'use strict'

const express = require('express'),
      app = express(),
      cors = require('cors'),
      bodyParser = require('body-parser'),
      mongoose = require('./src/mongoose'),
      passport = require('passport'),
      jwt = require('jsonwebtoken'),
      expressJwt = require('express-jwt'),
      router = express.Router(),
      request = require('request'),
      twitterConfig = require('./src/twitter.config.js'),
      port = process.env.PORT || 5000;

mongoose();
const User = require('mongoose').model('User');
const Polls = require('mongoose').model('Polls');
const passportConfig = require('./src/passport');

passportConfig();

const corsOption = {
  origin: true,
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  credentials: true,
  exposedHeaders: ['x-auth-token']
};
app.use(cors(corsOption));
app.use(bodyParser.urlencoded({
  extended: true
}));
app.use(bodyParser.json());

const createToken = function (auth) {
  return jwt.sign({
    id: auth.id
  }, 'my-secret',
    {
      expiresIn: 60 * 120
    });
};

const generateToken = function (req, res, next) {
  req.token = createToken(req.auth);
  return next();
};

const sendToken = function (req, res) {
  res.setHeader('x-auth-token', req.token);
  return res.status(200).send(JSON.stringify(req.user));
};

router.route('/auth/twitter/reverse')
  .post(function (req, res) {
    request.post({
      url: 'https://api.twitter.com/oauth/request_token',
      oauth: {
        oauth_callback: "http%3A%2F%2Flocalhost%3A5000%2Ftwitter-callback",
        consumer_key: twitterConfig.consumerKey,
        consumer_secret: twitterConfig.consumerSecret
      }
    }, function (err, r, body) {
      if (err) {
        return res.send(500, { message: e.message });
      }
      var jsonStr = '{ "' + body.replace(/&/g, '", "').replace(/=/g, '": "') + '"}';
      res.send(JSON.parse(jsonStr));
    });
  });

router.route('/auth/twitter')
  .post((req, res, next) => {
    request.post({
      url: `https://api.twitter.com/oauth/access_token?oauth_verifier`,
      oauth: {
        consumer_key: twitterConfig.consumerKey,
        consumer_secret: twitterConfig.consumerSecret,
        token: req.query.oauth_token
      },
      form: { oauth_verifier: req.query.oauth_verifier }
    }, function (err, r, body) {
      if (err) {
        return res.send(500, { message: err.message });
      }
      const bodyString = '{ "' + body.replace(/&/g, '", "').replace(/=/g, '": "') + '"}';
      const parsedBody = JSON.parse(bodyString);
      
      req.body['oauth_token'] = parsedBody.oauth_token;
      req.body['oauth_token_secret'] = parsedBody.oauth_token_secret;
      req.body['user_id'] = parsedBody.user_id;

      next();
    });
  }, passport.authenticate('twitter-token', { session: false }), function (req, res, next) {
    if (!req.user) {
      return res.send(401, 'User Not Authenticated');
    }
    // prepare token for API
    req.auth = {
      id: req.user.id
    };
    return next();
  }, generateToken, sendToken);

//token handling middleware
var authenticate = expressJwt({
  secret: 'my-secret',
  requestProperty: 'auth',
  getToken: function (req) {
    if (req.headers['x-auth-token']) {
      return req.headers['x-auth-token'];
    }
    return null;
  }
});

var getCurrentUser = function (req, res, next) {
  User.findById(req.auth.id, function (err, user) {
    if (err) {
      next(err);
    } else {
      req.user = user;
      next();
    }
  });
};

var getOne = function (req, res) {
  var user = req.user.toObject();
  delete user['twitterProvider'];
  delete user['__v'];
  res.json(user);
};

router.route('/auth/me')
  .get(authenticate, getCurrentUser, getOne);

app.use('/api/v1', router);


app.get('/get-polls', (req, res) => {
    Polls
      .find()
      .sort()
      .limit()
      .select({ title: 1 })
      .then(docs => {
        res.json(docs);
      });
})

app.post('/create-poll', isAuthenticated, function(req, res) {
  let date = new Date();
  let pollObj = {
    "title": req.body.title,
    "options": req.body.options,
    "userId": req.headers.token,
    "ipAddress": null,
    "created": date.toISOString(),
    "updated": date.toISOString()
  }
  console.log('poll obj ', pollObj);
  insertNewPoll(pollObj).then(inserted => {
    if (!inserted) {
      res.status(500).send('Unknown error');
    } else {
      res.status(200).send("successfully created new poll");
    }
  })
  // res.send('POST request to create poll');
})

function parseJwt(token) {
  let base64Url = token.split('.')[1];
  let base64 = base64Url.replace('-', '+').replace('_', '/');
  return JSON.parse(Buffer.from(base64, 'base64').toString());
};

function isAuthenticated(req, res, next) {
  let decode = parseJwt(req.headers.token);
  User.findById(decode.id, function (err, user) {
    if (err) {
      return res.send(401, 'User Not Authenticated');
    } else {
      next();
    }
  });
}

function insertNewPoll(poll) {
  let polls = new Polls(poll);
  return polls.save();
}

app.listen(port);