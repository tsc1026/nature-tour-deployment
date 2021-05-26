const express = require('express');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const path = require('path');
const cookieParser = require('cookie-parser');
const csp = require('express-csp');
const compression = require('compression');

const AppError = require('./utils/appError');
const globalErrorHandler = require('./controllers/errorController');
const tourRouter = require('./routes/tourRoutes');
const userRouter = require('./routes/userRoutes');
const reviewRouter = require('./routes/reviewRoutes');
const bookingRouter = require('./routes/bookingRoutes');
const viewRouter = require('./routes/viewRoutes');

const app = express();

//告知node 我們的viewEngine 要用 pug
app.set('view engine', 'pug');
//告知 node 我們寫的 views會在哪裡, 第一個是固定寫 views, 第二個是使用 path module 找我們的 views folder
app.set('views', path.join(__dirname, 'views')); //path.join(__dirname, 'views') 同等於 ./views
//加入這一行, views 才會知道 static files 的資源放在哪裡
app.use(express.static(path.join(__dirname, 'public')));

// 1) Global Middleware
// Set security HTTP headers
app.use(helmet());
csp.extend(app, {
    policy: {
      directives: {
        'default-src': ['self'],
        'style-src': ['self', 'unsafe-inline', 'https:'],
        'font-src': ['self', 'https://fonts.gstatic.com'],
        'script-src': [
          'self',
          'unsafe-inline',
          'data',
          'blob',
          'https://js.stripe.com',
          'https://*.mapbox.com',
          'https://*.cloudflare.com/',
          'https://bundle.js:8828',
          'ws://localhost:56558/',
        ],
        'worker-src': [
          'self',
          'unsafe-inline',
          'data:',
          'blob:',
          'https://*.stripe.com',
          'https://*.mapbox.com',
          'https://*.cloudflare.com/',
          'https://bundle.js:*',
          'ws://localhost:*/',
        ],
        'frame-src': [
          'self',
          'unsafe-inline',
          'data:',
          'blob:',
          'https://*.stripe.com',
          'https://*.mapbox.com',
          'https://*.cloudflare.com/',
          'https://bundle.js:*',
          'ws://localhost:*/',
        ],
        'img-src': [
          'self',
          'unsafe-inline',
          'data:',
          'blob:',
          'https://*.stripe.com',
          'https://*.mapbox.com',
          'https://*.cloudflare.com/',
          'https://bundle.js:*',
          'ws://localhost:*/',
        ],
        'connect-src': [
          'self',
          'unsafe-inline',
          'data:',
          'blob:',
          'wss://<HEROKU-SUBDOMAIN>.herokuapp.com:<PORT>/',
          'https://*.stripe.com',
          'https://*.mapbox.com',
          'https://*.cloudflare.com/',
          'https://bundle.js:*',
          'ws://localhost:*/',
        ],
      },
    },
});

// Development logging
if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'));
}

//限制同一個IP一小時內可以發送之 requests 次數
const limiter = rateLimit({
    max: 100, //最多幾個 requests
    windowMs: 60 * 60 * 1000, //一小時內 
    message: 'Too many requests from this IP, please try again in an hour!'//超過之後的錯誤資訊
  });
app.use('/api', limiter);  

// Body parser, reading data from body into req.body, 限制clientSide最多只可以傳 50kb
app.use(express.json({limit:'50kb'}));

//cookie parser 可以解析 cookie 從每個 http requests
app.use(cookieParser());

// Data sanitization against NoSQL query injection
app.use(mongoSanitize());

// Data sanitization against XSS
app.use(xss());

// Prevent parameter pollution
app.use(
    hpp(
        {
            whitelist: 
            [
                'duration',
                'ratingsQuantity',
                'ratingsAverage',
                'maxGroupSize',
                'difficulty',
                'price'
            ]
        }
    )
  );

//pug routes
//http get, render 會去 render 我們建立的 base view
/*
app.get('/', (req,res) => {
    res.status(200).render('base', {
        tour: 'The Forest Hiker',
        user: 'Jonas',
    });
});

app.get('/overview', (req, res) => {
    res.status(200).render('overview', {
       title: 'All Tours',
    });
}); 

app.get('/tour', (req, res) => {
    res.status(200).render('tour', {
       title: 'The Forest Hiker Tour',
    });
}); 
*/
// end of pug routes

//test middleware
/*
app.use((req, res, next) => {
    console.log(req.cookies);
    next();
});
*/

app.use(compression());

app.use('/', viewRouter);
app.use('/api/v1/tours/', tourRouter);
app.use('/api/v1/users', userRouter);
app.use('/api/v1/reviews', reviewRouter);
app.use('/api/v1/bookings', bookingRouter);

//all: 對所有http requests ex.create delete..., *: 對所有 route
app.all('*', (req,res,next) => {
    next(new AppError(`Cannot find ${req.originalUrl} on this server.`, 404));
});

//.use() : 代表是 middlweare, 給下面4個params後 express 就知道這是 error handler middleware
app.use(globalErrorHandler);

//這樣 server.js 才可以用 app
module.exports = app;