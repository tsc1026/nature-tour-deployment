const express = require('express');
const userController = require('./../controllers/userController');
const authController = require('./../controllers/authController');

//routes
const userRouter = express.Router();

userRouter.post('/signup', authController.signup);
userRouter.post('/login', authController.login);
userRouter.get('/logout', authController.logout);

userRouter.post('/forgotPassword', authController.forgotPassword);
userRouter.patch('/resetPassword/:token', authController.resetPassword);

//之後的 router 都會需要通過 authController.protect: 需登入後才可以通過
userRouter.use(authController.protect);

userRouter.patch('/updatePassword', 
                 //authController.protect, 
                 authController.updatePassword);
userRouter.patch('/updateMe', 
                    userController.uploadUserPhoto,
                    userController.resizeUserPhoto, //resize user's image 要在圖片傳到db之前
                    userController.updateMe, //真正上傳圖片且將檔名更新到db
                );
userRouter.delete('/deleteMe', 
                //authController.protect, 
                userController.deleteMe);
userRouter.get('/me', 
                //authController.protect, 
                userController.getMe, 
                userController.getUser);

//之後的 router 都會需要通過 authController.restrictTo('admin') 需是 admin
userRouter.use(authController.restrictTo('admin'));

//app.route('/api/v1/users')
userRouter.route('/')
    .get(userController.getAllUsers)
    .post(userController.createUser);

//app.route('/api/v1/users/:id')
userRouter.route('/:id')
    .get(userController.getUser)
    .delete(userController.deleteUser)
    .patch(userController.updateUser)

module.exports = userRouter;