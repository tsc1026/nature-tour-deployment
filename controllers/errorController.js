const AppError = require('./../utils/appError');

const sendErrorDev = (err, req, res) => {
    //如果是 url 是從 api 開始, ex. /api/v1/tours/
    if(req.originalUrl.startsWith('/api')){
        res.status(err.statusCode).json({
            status: err.status,
            error: err,
            message: err.message,
            stack: err.stack //顯示第幾行引發錯誤
        });
    } else { //如果url沒有從api 開始, 就去 render error page
        res.status(err.statusCode).render('error', {
            title: 'Something wnet wrong',
            msg: err.message, //傳錯誤訊息給 error page
        })
    }
}

const sendErrorProd = (err, req, res) => {
  // A) API
  if (req.originalUrl.startsWith('/api')) {
    // A) Operational, trusted error: send message to client
    if (err.isOperational) {
      return res.status(err.statusCode).json({
        status: err.status,
        message: err.message
      });
    }
    // B) Programming or other unknown error: don't leak error details
    // 1) Log error
    console.error('ERROR 💥', err);
    // 2) Send generic message
    return res.status(500).json({
      status: 'error',
      message: 'Something went very wrong!'
    });
  }

  // B) RENDERED WEBSITE
  // A) Operational, trusted error: send message to client
  if (err.isOperational) {
    console.log(err);
    return res.status(err.statusCode).render('error', {
      title: 'Something went wrong!',
      msg: err.message
    });
  }
  // B) Programming or other unknown error: don't leak error details
  // 1) Log error
  console.error('ERROR 💥', err);
  // 2) Send generic message
  return res.status(err.statusCode).render('error', {
    title: 'Something went wrong!',
    msg: 'Please try again later.'
  });
}

module.exports = 
(err, req, res, next) => {
    err.statusCode = err.statusCode || 500; //當別處程式碼有錯誤發生就會觸發這裡handler, 會傳入 err object
    err.status = err.status || 'error';

    if(process.env.NODE_ENV === 'development'){
        sendErrorDev(err, req, res);
    //只有在 Production Mode 才會判斷以下錯誤
    }else if(process.env.NODE_ENV === 'production'){
        
        //以目前error object create 一個新的 error object, 新的error obj還是會包含舊有error obj的值
        let error = Object.create(err); 
        //把 err.message 給 error.message 
        error.message = err.message;
        //getTour 給錯誤的 id 
        if(error.name === 'CastError')
            error = handleCastErrorDB(error);
        if(error.code === 11000)
            error = handleDuplicateFieldDB(error);
        if(error.name === 'ValidationError')
            error = handleValidationErrorDB(error);
        if (error.name === 'JsonWebTokenError') 
            error = handleJWTError();
        if (error.name === 'TokenExpiredError') 
            error = handleJWTExpiredError();
        sendErrorProd(error, req, res);
    }
}

const handleJWTExpiredError = err => {
    const message = `Your token is expired. Please log in again!`;
    return new AppError(message, 401);
}

const handleJWTError = err => {
    const message = `Invalid token. Please log in again!`;
    return new AppError(message, 401);
}

const handleValidationErrorDB = err => {
    const errors = Object.values(err.errors).map(el => el.message);
    const message = `Invalid input data ${errors.join('. ')}`;
    return new AppError(message, 400);
}

const handleDuplicateFieldDB = err => {
    //使用regular expression 抓取 client side 給的錯誤欄位資訊, 會回傳陣列, 我們只取第一個值(欄位名稱)
    const value = err.errmsg.match(/(["'])(\\?.)*?\1/)[0];
    const message = `duplicate filed value: ${value}, please use another value`;
    return new AppError(message, 400);
}


const handleCastErrorDB = err =>{
    const message = `Invalid ${err.path}: ${err.value}`;
    return new AppError(message, 400);
};

