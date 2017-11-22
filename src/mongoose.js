'use strict'

const mongoose = require('mongoose');
// match: /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/

module.exports = function() {
  mongoose.connect('mongodb://kyawzintun:test@ds115166.mlab.com:15166/voting-app')
  const db = mongoose.connection;
  const UserSchema = mongoose.Schema({
    dispalyname: {
      type: String, required: true,
      trim: true, unique: true
    },
    twitterProvider: {
      type: {
        id: String,
        token: String
      },
      select: false
    }
  });
  UserSchema.set('toJSON', { getters: true, virtuals: true });

  const PollsSchema = mongoose.Schema({
    title: { type: String, required: true },
    options: { type: Array, required: true },
    userId: { type: String, required: true },
    ipAddress: Array,
    created: String,
    updated: String
  });
  PollsSchema.set('autoIndex', false);

  UserSchema.statics.upsertTwitterUser = function (token, tokenSecret, profile, cb) {
    var that = this;
    return this.findOne({
      'twitterProvider.id': profile.id
    }, function (err, user) {
      // no user was found, lets create a new one
      if (!user) {
        var newUser = new that({
          dispalyname: profile.displayName,
          twitterProvider: {
            id: profile.id,
            token: token,
            tokenSecret: tokenSecret
          }
        });

        newUser.save(function (error, savedUser) {
          if (error) {
            console.log(error);
          }
          return cb(error, savedUser);
        });
      } else {
        return cb(err, user);
      }
    });
  };

  mongoose.model('User', UserSchema);
  mongoose.model('Polls', PollsSchema);
  return db;
};