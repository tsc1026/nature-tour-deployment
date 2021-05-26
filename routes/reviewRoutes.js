const express = require('express');
const reviewController = require('./../controllers/reviewController');
const authController = require('./../controllers/authController');

const router = express.Router({mergeParams: true});

//之後的 router 都會需要通過 authController.protect: 需登入後才可以通過
router.use(authController.protect);

// /api/v1/reviews
router
    .route('/')
    .get(reviewController.getAllReviews)
    .post(
        authController.restrictTo('user'), //以及role為user
        reviewController.setTourUserIds, //新增review 前取得 Tour & User ids
        reviewController.createReview);//才可以新增 a review
        
router
    .route('/:id')
    .get(reviewController.getReview)
    .patch(
        //tour-guide 不能給自己的 tour 下 review
        authController.restrictTo('user', 'admin'),
        reviewController.updateReview
    )
    .delete(
        authController.restrictTo('user', 'admin'),
        reviewController.deleteReview);

module.exports = router;