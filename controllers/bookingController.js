const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Tour = require('../models/tourModel');
const Booking = require('../models/bookingModel');
const factory = require('./handlerFactory');
const AppError = require('./../utils/appError');

exports.getCheckoutSession = async (req, res, next) => {
  try{
    // 1) Get the currently booked tour from db
    const tour = await Tour.findById(req.params.tourId);
    //console.log(tour);

    // 2) Create checkout session
    const session = await stripe.checkout.sessions.create({
      //付費方式
      payment_method_types: ['card'],
      //付費成功後轉換頁面
      success_url: `${req.protocol}://${req.get('host')}/?tour=${req.params.tourId}&user=${req.user.id}&price=${tour.price}`,
      //取消頁面
      cancel_url: `${req.protocol}://${req.get('host')}/tour/${tour.slug}`,
      //可以存到 session 的額外資料, 付費成功後我們可以取用
      customer_email: req.user.email,
      client_reference_id: req.params.tourId,
      line_items: [
        {
          name: `${tour.name} Tour`,
          description: tour.summary,
          images: [`https://www.natours.dev/img/tours/${tour.imageCover}`],
          //tour 價錢(固定要*100)
          amount: tour.price * 100,
          currency: 'usd',
          //產品數量npm 
          quantity: 1
        }
      ]
    });

    // 3) Create session as response
    res.status(200).json({
      status: 'success',
      session
    });
  }
  catch(err){
    next(err);
  }
}

exports.createBookingCheckout = async (req, res, next) => {
  try{
    //這一行就是從上面的stripe successful url 抓這三個值
    //這是 ES6 新的寫法, 等同於 const tour = req.query.tour
    const {tour, user, price} = req.query;

    if(!tour && !user && !price){
      //若沒有抓到值, 就到下一個middleware, 因為成功購買後是回到首頁, 所以若沒有抓到值 return next() 就是到 router.get('/')
      return next();
    }

    //若有從 url 抓到值, 就用 db 的create function 去 Booking model 產生一筆資料 
    await Booking.create({tour, user, price});
    //付費成功的url: ${req.protocol}://${req.get('host')}/?tour=${req.params.tourId}&user=${req.user.id}&price=${tour.price}
    //只抓出?前面的 url => ${req.protocol}://${req.get('host')}/ => 就是首頁的網址 http://127.0.0.1:3000/
    res.redirect(req.originalUrl.split('?')[0]);
  }
  catch(err){
    next(err);
  }
}

exports.createBooking = factory.createOne(Booking);
exports.getBooking = factory.getOne(Booking);
exports.getAllBookings = factory.getAll(Booking);
exports.updateBooking = factory.updateOne(Booking);
exports.deleteBooking = factory.deleteOne(Booking);

  


