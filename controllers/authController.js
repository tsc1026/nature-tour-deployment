const User = require('./../models/userModesl');
const jwt = require('jsonwebtoken');
const AppError = require('./../utils/appError');
const { promisify } = require('util'); //從 node.js 的util module 中取 promisify fucntion
const Email = require('./../utils/email');
const crypto = require('crypto');

//產生token
const signToken = id => {
    return  token = jwt.sign(
        {id: id}, //id欄位: 傳進來的 id 值 
        process.env.JWT_SECRET,
        {expiresIn: process.env.JWT_EXPIRES_IN},
    )
}

//通用方法依照user's id 產生 JWT token 
const createSendToken = (user, statusCode, res) =>{
    //依照userId 取 JWT token
    const JWTtoken = signToken(user._id);

    const cookieOptions = {
         //將過期時間轉成毫秒
         expires: new Date(Date.now() + process.env.JWT_COOKIE_EXPIRES_IN*24*60*60*1000),
         //secute: true, 使用 https
         httpOnly: true, //防止 cross site atc
    };

    //只有在 production mode 下才把 secure property 加到 cookie obj 上 
    if(process.env.NODE_ENV === 'production')
        cookieOptions.secure = true;

    res.cookie('jwt', JWTtoken, cookieOptions);

    //remove a password from the output
    user.password = undefined;

    res.status(statusCode).json({
        status: 'success',
        JWTtoken,
        data:{
            user,
        }
    });
}

exports.login = async (req, res, next) => {
    try{
        const email = req.body.email;
        const password = req.body.password;
    
        if(!email || !password){
            //next: 呼叫下一個 middleware, return: 結束這個 login 程序
            return next(new AppError('please provide an email and password', 400));
        }
    
        //2.chekc if user exists and password is correct
        //第一個email: mongo field, 第二個email: client 給的值
        //用email 從資料庫撈 user, 因為我們在 model 把password欄位隱藏(select:false)不給user看, 所以 login 這裡要加回來
        const user = await User.findOne({ email: email }).select('+password');
        
        //如果用email從資料庫撈不到user 或 有撈到user但比對密碼不對
        if (!user || !(await user.correctPassword(password, user.password))) {
            return next(new AppError('Incorrect email or password', 401));
        }

        //3.if everything is ok, send a token to a client
        //重構後的function 
        createSendToken(user, 200, res);
    }
    catch(err){
        next(err);
    }
}

exports.logout = (req, res) => {
    //用新cookie 取代舊cookie, jwt(key): loggedout(value亂給即可)
    res.cookie(
        'jwt', 'null', 
        { expires: new Date(Date.now() -10 * 1000), httpOnly: true}
    ); 
    
    res.status(200).json({ status: 'success' });
};

exports.signup = async (req, res, next) => {
    try{
        const newUser = await User.create({
            name: req.body.name,
            email: req.body.email,
            password: req.body.password,
            passwordConfirm: req.body.passwordConfirm,
            passwordChangedAt: req.body.passwordChangedAt,
            role: req.body.role,
        });

        //下面這行等同於 http://127.0.0.1:3000/me
        const url = `${req.protocol}://${req.get('host')}/me`;

        //傳入 user & rul 給 email.js 的 Email class 去建立一個 Email object 送郵件
        await new Email(newUser, url).sendWelcome();

        //重構後的function 
        createSendToken(newUser, 201, res);
    }
    catch(err){
        next(err);
    } 
};

exports.protect = async (req, res, next) => {
    try{
        //1). getting the token and checking of it is there
        let token = '';
        
        if(req.headers.authorization && req.headers.authorization.startsWith('Bearer')){
            token = req.headers.authorization.split(' ')[1];
        }else if(req.cookies.jwt){ //user登入後會存jwt token在 cookie上, 所以若有 cookie 就從上面抓 token 
            token = req.cookies.jwt;
        }
    
        if(token.length === 0){
            return next(new AppError('You are not logged in! Please log in to get access.', 401));
        }

        //2). verifycation token
        //jwt.verify 可以比較step.1)的 token 跟 process.env.JWT_SECRET 是否相同, promisify 可以將比較結果弄成 promise 後回傳(所以需要await接)
        const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);
        //console.log(decoded); //{ id: '607b8191bd329a0c98512aa2', iat: 1618706834, exp: 1626482834 }
        
        //3).check if user still exists(檢查user是否還存在資料庫內,有可能從db中刪除此帳號了)
        const freshUser = await User.findById(decoded.id); //用 token的userId 進去資料庫找user
        if(!freshUser){
            return next (new AppError('The user not existed', 401));
        }

        //4).check if the user changed password after the token was issued
        //decoded就是從user傳入之 token, iat(issued at time)是token obj的property紀錄此token被發行之時間
        if(freshUser.changedPasswordAfter(decoded.iat)){ //如果changedPasswordAfter() 回傳T, 代表user取token後改過密碼, 就發出錯誤請他重新登入一次
            return next(new AppError('The user just changed the password. Please log in again', 401))
        } 
        
        //(目的:取得通過上面一系列檢查後的最正確user data)將依照token obj 的 user id進去資料庫撈到之 user, 重新給 req.user
        req.user = freshUser; 
        res.locals.user = freshUser; //res.locals + 自定名稱, pug 可以用此取值
        next();
    }
    catch(err){
        next(err);
    }
};

//此 middleware 不報錯, 主要目的就是拿來判斷user是否登入, 然後render page改變前端樣貌而已
exports.isLoggedIn = async (req, res, next) => {
    //1). verifycation token
    //jwt.verify 可以比較browser 的 cookies.jwt 跟 process.env.JWT_SECRET 是否相同, promisify 可以將比較結果弄成 promise 後回傳(所以需要await接)
    if(req.cookies.jwt) {
        try{
            const decoded = await promisify(jwt.verify)(req.cookies.jwt, process.env.JWT_SECRET);
    
            //2).check if the user still exists (檢查user是否還存在資料庫內,有可能從db中刪除此帳號了)
            const currentUser = await User.findById(decoded.id);//用 token的userId 進去資料庫找user
            if(!currentUser){
                return next(); //此 middleware 不報錯, 沒有登入就是往下一個middleware執行而已
            }
    
            //3).check if the user changed password after the token was issued
            //decoded就是從user傳入之 token, iat(issued at time)是token obj的property紀錄此token被發行之時間
            if(currentUser.changedPasswordAfter(decoded.iat)){ //如果changedPasswordAfter() 回傳T, 代表user取token後改過密碼
                return next() //此 middleware 不報錯, 沒有登入就是往下一個middleware執行而已
            }
    
            //4).如果通過以上檢測還沒被送到下一個 middleware 就代表此 user 是登入狀態
            res.locals.user = currentUser; //res.locals + 自定名稱, pug 可以用此取值
            return next();
        }
        catch(err){
            return next();
        }
    }
    else{ //如果沒有 cookie 就直接往下一個 middleware 走
        next();
    }
}

exports.restrictTo = (...roles) =>{
    try{
        return (req, res, next) => {
            // roles ['admin', 'lead-guide']. role='user'
            if (!roles.includes(req.user.role)) {
              return next(
                new AppError('You do not have permission to perform this action', 403)
              );
            }
            
            //合法 roles
            next();
        };
    }
    catch(err){
        next(err);
    }
   
}

exports.forgotPassword = async (req, res, next) => {
    try{
        //1). get a user based on its posted email
        const user = await User.findOne({email: req.body.email});
        //如果db內找不到此 user
        if(!user){
            return next(new AppError('There is no user with the email', 404));
        }

        //2). generating a random reset token
        const resetToken = user.createPasswordResetToken();
        //呼叫createPasswordResetToken 只會修改目前doc的 passwordResetToken & passwordResetExpires 的值, 但不會存回資料庫
        //所以這裡呼叫完createPasswordResetToken後, 要將加密之token存回資料庫, validateBeforeSave: false 關閉所有user model 驗證
        await user.save({validateBeforeSave: false}); 

        //3). send token to the user email
        //resetURL 對應 http://127.0.0.1:3000/api/v1/users/resetPassword/未加密之token
        const resetURL = `${req.protocal}://${req.get('host')}/api/v1/users/resetPassword/${resetToken}`;
        
        await new Email(user, resetURL).sendPasswordReset();
          
        //送完mail後回應給 client side
        res.status(200).json({
            status: 'success',
            message: 'Token sent to email!'
        });
    }
    catch(err){
        //如果出錯就重設passwordResetToken & passwordResetExpires 並存回 db
        user.passwordResetToken = undefined;
        user.passwordResetExpires = undefined;
        await user.save({ validateBeforeSave: false });

        //return: 結束此區塊之程式碼, next產生AppError obj 並給下一個 middleware 處理
        return next(
            new AppError('There was an error sending the email. Try again later!'),
            500
        );
    }
}

exports.resetPassword = async(req, res, next) => {
    try{
        //1). get user by token
        //在route 有定義/resetPassword/:token 所以這裡可以抓到 token
        //client side傳入之 token 是沒有加密過的, 所以這裡要用原演算法加密後才可以去跟資料庫內的token(加密過)做比對, 找出 user
        const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');
        
        //確認token尚未過期,且依照token查找user
        const user = await User.findOne(
            {
                passwordResetToken: hashedToken, //傳入加密過之token到db找 user
                passwordResetExpires: {$gt: Date.now()} //限制只查 user's token expiredate需大於現在時間(若小於現在時間代表過期了)
            }
        );
        
        //2).set a new password
        //如果step1. 沒有找到user
        if(!user){
            return next(new AppError('Token is invalid or expired', 400));
        }

        //如果step1.有找到user, 將 client 設定的新密碼設定給 user obj, 並將token & expired time 值給刪除, 然後存回db
        user.password = req.body.password;
        user.passwordConfirm = req.body.passwordConfirm;
        user.passwordResetToken = undefined;
        user.passwordResetToken = undefined;
        //await user.save({ validateBeforeSave: false }); 注意這裡我們還是需要validate, 因為我們有給重設的密碼等需要validator 驗證長度等
        await user.save();

        //3).更新變更密碼時間之欄位, 程式碼在userModel 的 middleware(紀錄舊有密碼被修改的時間)
        
        //4).Log the user in and send JWT Token(不是重設密碼之token)
        //重構後的function 
        createSendToken(user, 200, res);
    }
    catch(err){
        next(err);
    }
}

exports.updatePassword = async(req, res, next) => {
    try{
        //1). getting a user from the collection
        //我們在 route 有用 protect middleware擋在此API之前, 所以會到這裡都是已經登入的user了
        //因此我們可以利用 protect middleware 傳過來的 request obj 裡面有req.user.id property 就可以用此撈資料
        const user = await User.findById(req.user.id).select('+password'); //撈資料順便撈此user's password

        //2). check is posted current password is correct
        //passwordCurrent 為 clientSide 傳過來的原有密碼, user.password 為step1.撈出之目前在資料庫內的密碼, 藉由之前寫好的user.correctPassword()做比對。
        if(!await user.correctPassword(req.body.passwordCurrent, user.password)){
            return next(new AppError('Your current password is wrong', 401));
        }

        //3).update password
        user.password = req.body.password;
        user.passwordConfirm = req.body.passwordConfirm;
        //不可以用user.findByIdAndUpdate() 因為在userModel的passwordConfirm field有用到this, this只在create&save()下可以用
        await user.save();

        //4). log user in and send JWT
        createSendToken(user, 200, res);
    }
    catch(err){
        next(err);
    }
   
}


