const Review = require('./../models/reviewModel');
const factory = require('./handlerFactory');

exports.getAllReviews = async(req, res, next) =>{
    try{
        /*
        let filter = {};

        //如果 url params 有 tourId, 就將其設定給filter,之後給 find 去找特定的 reviews
        if(req.params.tourId){
            filter = {tour: req.params.tourId};
        }*/

        const reviews = await Review.find(filter);

        res.status(200).json({
            status:'success',
            results: reviews.length,
            data:{
                reviews
            },
        });
    }catch(err){
        next(err);
    }
}

exports.setTourUserIds = (req, res, next) =>{
    //如果 request body 沒有 tour data
    if(!req.body.tour){
        //從URL path 抓tour id
        req.body.tour = req.params.tourId 
    }
    //如果 request body 沒有 user data
    if(!req.body.user){
        //(tourRoute有定義要到這必須先過protect middleware), 所以可以從protect middleware(req.user.id)抓user id
        req.body.user = req.user.id 
    }
    next();
}

exports.getReview = factory.getOne(Review);
exports.createReview = factory.createOne(Review);
exports.deleteReview = factory.deleteOne(Review);
exports.updateReview = factory.updateOne(Review);