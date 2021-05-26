const express = require('express');
const viewsController = require('../controllers/viewsController');
const authController = require('../controllers/authController');
const bookingController = require('../controllers/bookingController');
const router = express.Router();

//isLoggedIn middleware判斷user是否已登入(cookies 內是否有 jwt token)
router.get('/', 
           bookingController.createBookingCheckout, 
           authController.isLoggedIn, 
           viewsController.getOverview); 
           
router.get('/tour/:slug', 
           authController.isLoggedIn, 
           viewsController.getTour); 

router.get('/login', 
           authController.isLoggedIn, 
           viewsController.getLoginForm);
            
router.get('/me', 
           authController.protect, 
           viewsController.getAccount); 

//查看某 user 的 tours 購買歷史紀錄
router.get('/my-tours', 
           authController.protect, 
           viewsController.getMyTours); 

module.exports = router;