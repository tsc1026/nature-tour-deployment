const express = require('express');
const bookingController = require('./../controllers/bookingController');
const authController = require('./../controllers/authController');

const router = express.Router();

//登入後才可以使用下面的APIs
router.use(authController.protect);

//strip payment 
router.get(
    '/checkout-session/:tourId', 
    authController.protect, 
    //發送 strip session 到 client side
    bookingController.getCheckoutSession
);

//只有以下角色可以使用下面的APIs
router.use(authController.restrictTo('admin', 'lead-guide'));

//這些都沒有實作前端, 只能靠 postman 觸發
router
  .route('/')
  .get(bookingController.getAllBookings)
  .post(bookingController.createBooking);

router
  .route('/:id')
  .get(bookingController.getBooking)
  .patch(bookingController.updateBooking)
  .delete(bookingController.deleteBooking);

module.exports = router;
