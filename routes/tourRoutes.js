const express = require('express');
const tourController = require('./../controllers/tourController');
const authController = require('./../controllers/authController');
const reviewRouter = require('./../routes/reviewRoutes');

const tourRouter = express.Router(); //建立一個新的tourRouter實際上就是一個 middleware

//在tour下新增一個review : POST /tour/tourid123123/reviews (user id 從 log in user 抓)
//取得tour下所有reviews: GET /tour/tourid123123/reviews
//取得tour下單一review: GET /tour/tourid123123/reviews/reviewid123
/*
tourRouter
    .route('/:tourId/reviews') // /api/v1/tours/:tourId/reviews
    .post(
        authController.protect, //要先登入
        authController.restrictTo('user'), //角色必須為 user
        reviewController.createReview, //之後才可以去 create a review
    );
*/
tourRouter.use('/:tourId/reviews', reviewRouter);

tourRouter
    .route('/top-5-cheap')
    //使用midddleware 取得最便宜的前五個tours, 接著再給getAllTours api
    .get(tourController.aliasTopTours ,tourController.getAllTours);

tourRouter.route('/tour-stats')
    .get(tourController.getTourStats);

tourRouter.route('/monthly-plan/:year')
    .get(
        authController.protect, 
        authController.restrictTo('admin', 'lead-guide', 'guide'),
        tourController.getMonthlyPlan);

//取得以目前位子+給定距離之內的 tour
// /tours-within/233/center/40,50/unit/mi 這種定義API URL的方法會比用 url傳值: ex. /tours-distance?distance-233&center=-40,50&unit=mi 來的清楚
// tours-within:200(distance) 兩百公此內, center:40,50(latlng):以目前位子為圓心, unit/:mi(距離之單位)
tourRouter.route('/tours-within/:distance/center/:latlng/unit/:unit')
        .get(tourController.getToursWith);

//給定一地點後, 計算所有tours離此地點之距離
tourRouter.route('/distances/:latlng/unit/:unit')
        .get(tourController.getDistance);

//app.route('/api/v1/tours')
tourRouter.route('/')
    .get(tourController.getAllTours)
    .post(authController.protect, 
          authController.restrictTo('admin', 'lead-guide'),
          tourController.createTour);

//app.route('/api/v1/tours/:id')
tourRouter.route('/:id')
    .get(tourController.getTour)
    .delete(
        authController.protect, 
        authController.restrictTo('admin', 'lead-guide'), 
        tourController.deleteTour)
    .patch(authController.protect, 
           authController.restrictTo('admin', 'lead-guide'),
           tourController.uploadTourImage,
           tourController.resizeTourImages,
           tourController.updateTour);
    
module.exports = tourRouter;