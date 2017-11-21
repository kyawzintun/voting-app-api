'use strict'

const mongoose = require('mongoose');
// match: /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/

module.exports = function () {
  const db = mongoose.connect('mongodb://kyawzintun:test@ds113936.mlab.com:13936/new-polls');
  const NewPollSchema = mongoose.Schema({
    title: { type: String, required: true },
    options: { type: Array, required: true },
    userId: { type: String, required: true }
  });
  NewPollSchema.set('autoIndex', false);
  mongoose.model('NewPoll', NewPollSchema);
  return db;
};