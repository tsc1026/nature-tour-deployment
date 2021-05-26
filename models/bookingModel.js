const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  //booking 包含 tour model data
  tour: {
    type: mongoose.Schema.ObjectId,
    ref: 'Tour',
    required: [true, 'Booking must belong to a Tour!']
  },
  //booking 包含 user model data
  user: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: [true, 'Booking must belong to a User!']
  },
  price: {
    type: Number,
    require: [true, 'Booking must have a price.']
  },
  createdAt: {
    type: Date,
    default: Date.now()
  },
  paid: {
    type: Boolean,
    default: true
  }
});

bookingSchema.pre(/^find/, function(next) {
  //當有人想要query bookingSchema 會一併撈出 user model 所有資料, 以及 tour model 的 tour name
  this
  .populate('user')
  .populate({
    path: 'tour',
    select: 'name'
  });
  
  next();
});

const Booking = mongoose.model('Booking', bookingSchema);

module.exports = Booking;
