const AppError = require('../utils/appError');
const Tour = require('./../models/tourModel');
const Booking = require('./../models/bookingModel');

exports.getOverview = async(req, res) => {
   const tours = await Tour.find();
   
   try{
    res.status(200).render('overview', {
        title: 'All Tours',
        tours: tours, //array
    });
   }
   catch(err){
    next(err);
   }
}

exports.getTour = async(req, res, next) => {
    //1. get the data for the requested tour(只要有使用 find query 會自動帶出對應的 guides, 因為在 tourModel 下有加上此 query middleware)
    const tour = await Tour.findOne({ slug: req.params.slug }).populate({
        path: 'reviews', //populate reviews model, tour model 有關聯到 reviews model 所以可以撈出
        fields: 'review rating user' //只要 review model 下這幾個欄位
    });

    if (!tour) {
        return next(
            new AppError('There is no tour with that name.', 404)
        );
    }

    //2. Build the template
    //console.log('tour', tour);

    //3.render template and using the data from 1
    res.status(200)
    .set(
        'Content-Security-Policy',
        "default-src 'self' https://*.mapbox.com ;base-uri 'self';block-all-mixed-content;font-src 'self' https: data:;frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src https://cdnjs.cloudflare.com https://api.mapbox.com 'self' blob: ;script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests;"
      )
    .render('tour', {
        title: `${tour.name} Tour`,
        tour
    });
}

exports.getLoginForm = (req, res) => {
    try{
        res.status(200)
        //解決 axios refused to load
        .set(
            'Content-Security-Policy',
            "connect-src 'self' https://cdnjs.cloudflare.com"
        )
        .render('login', {
            title:'log in your accoount',
        });
    }
    catch(err){
        next(err);
    }
 }

 exports.getAccount = (req, res) => {
    res.status(200).render('account', {
      title: 'Your account'
    });
};

exports.getMyTours = async (req, res) => {
    try{
        //finding tours belongs to current login user
        const bookings = await Booking.find({user: req.user.id});
        //因為 bookings is an array 所以可以用 map進去繞航, 取出bookings array 下的所有 tour(=== tourid)
        const tourIDs = bookings.map(el => el.tour);
        //使用in operator 去 tourIDs(array) 取出對應之 tours data, 有id 之 Tour data 去跟 tourIDs(array) 做比較, 有對應到才取出
        const tours = await Tour.find({ _id: { $in: tourIDs } });

        res.status(200).render('overview', {
            title: 'My Tours',
            tours: tours
        });
    }
    catch(err){
        next(err);
    }
};