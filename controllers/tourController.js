const AppError = require('../utils/appError');
const Tour = require('./../models/tourModel');
const factory = require('./handlerFactory');
const multer = require('multer');
const sharp = require('sharp');

const multerStorage = multer.memoryStorage(); //用 memory 來存圖片

//用來過濾非圖片檔上傳
const multerFilter = (req, file, cb) => {
    //若上傳為圖檔
    if (file.mimetype.startsWith('image')) {
      //參數1:若有錯誤產生(這裡沒有所以給null), 參數2:若是符合圖檔要求就給T
      cb(null, true);
    } else { //若上傳為非圖檔
      //參數1:若有錯誤產生, 參數2:若是不符合圖檔要求就給F
      cb(new AppError('Not an image! Please upload only images.', 400), false);
    }
};
  
//上傳後儲存圖片之處
const upload = multer({
    storage: multerStorage,
    fileFilter: multerFilter
});

exports.uploadTourImage = upload.fields([
    {name: 'imageCover', maxCount: 1}, //tour's cover 一張圖
    {name: 'images', maxCount: 3}, // tour's photo 包含多張圖
]);

exports.resizeTourImages = async (req, res, next) => {
    //console.log(req.files);
    
    //如果imageCover or tour images 都沒有上傳任何圖片
    if(!req.files.imageCover || !req.files.images)
        return next();

    /* # region cover image */
    //新增一個唯一的 cover image file name, 之後在req.body obj 下新增一個 property(imageCover), 將檔名指定給此 property
    //注意此新增之 property name(req.body.imageCover) 必須跟 tour model schema 一樣, 這樣才會被存到db的正確欄位 
    req.body.imageCover = `tour-${req.params.id}-${Date.now()}-cover.jpg`;
    
    //可以使用上面的console.log(req.files)印出來看, req.file.imageCover[0] 裡面就是包含 imageCover 在記憶體中的 buffer(圖片檔), 
    //因為上面的 multer storage 改成用 memory 存, 所以這裡可以用 buffer
    await sharp(req.files.imageCover[0].buffer)
    .resize(2000, 1333)
    .toFormat('jpeg')
    .jpeg({ quality: 90 })
    .toFile(`public/img/tours/${req.body.imageCover}`); //將圖片寫入 disk, req.body.imageCover === 此圖片之檔名
    /* # end of cover image */

    
    //新增一陣列在req.body obj 上, 用來存所有圖片之檔名
    req.body.images = [];

    await Promise.all(
        //因為 req.files.images是一陣列, 所以可使用 map function進去繞行, file(遶行元素可自取), i(index)
        //因為這裡的 async 是被包在 map callback function 中, 所以無法被下面的 next 取用(無法得知這些images何時才resize完成)
        //因 map 會回傳一新的陣列, 裡面包含了這些圖片resize完成的多個promises, 所以外圍可使用await Promise.all()來等待 map 回傳之陣列
        //如此當所有 images resize 完成後, next 便會得知
        req.files.images.map( async(file, i) => {
            //產生唯一檔名
            const filename = `tour-${req.params.id}-${Date.now()}-${i + 1}.jpeg`;
            
            //resize 所有 images, 完成後回傳多個 promises, 因為多張圖
            await sharp(file.buffer)
            .resize(2000, 1333)
            .toFormat('jpeg')
            .jpeg({ quality: 90 })
            .toFile(`public/img/tours/${filename}`);

            //將所有圖片檔名存入新增之陣列
            req.body.images.push(filename);
        })
    );
    
    next();
}

//middlewares
exports.aliasTopTours = (req, res, next) => {
    req.query.limit = '5';
    req.query.sort = '-ratingsAverage,price';
    req.query.fields = 'name,price,ratingsAverage,summary,difficulty';
    next();
}

exports.getTourStats = async (req, res, next) => {
    try{
      const stats = await Tour.aggregate(
        [
            {
                $match: { ratingsAverage: { $gte: 4.5 } }
            },
            {
                $group: {
                  _id: { $toUpper: '$difficulty' },
                  numTours: { $sum: 1 },
                  numRatings: { $sum: '$ratingsQuantity' },
                  avgRating: { $avg: '$ratingsAverage' },
                  avgPrice: { $avg: '$price' },
                  minPrice: { $min: '$price' },
                  maxPrice: { $max: '$price' }
                }
            },
            {
                $sort: { avgPrice: 1} //以 avgPrice 遞增來排序
            }
        ]
      );

      res.status(200).json({
        status: 'success',
        data: {
          stats
        }
      });
    }
    catch(err){
        next(err);
        /*
        res.status(404).json({
            status: 'fail',
            message: err
        });
        */
    }
}

exports.getMonthlyPlan = async(req,res, next) => {
    try{
        const year = req.params.year * 1;
        console.log('year', year);

        const plan = await Tour.aggregate(
            [
                {
                    //unwind: 可以將陣列內容拆開, 將每一個內容變成一個單獨的 document
                    $unwind: '$startDates'
                },
                //只撈出startDates 2021-01-01 到 2021-12-31
                {
                    $match: 
                    {
                        startDates : 
                        {
                            $gte: new Date(`${year}-01-01`),
                            $lte: new Date(`${year}-12-31`),
                        }
                    }
                },
                {
                    $group: 
                    {   
                        //$month 會回傳數字 1~12月, 我們用月份來分群
                        _id: { $month: '$startDates'},
                        //每個月份如果有tour, numTourStarts 就 +1
                        numTourStarts: {$sum: 1},
                        //顯示 tour 名稱, $push 會把 name field 資料加入進去 tours array
                        tours: { $push: '$name'}
                    }
                },
                {
                    $addFields: { month: '$_id'}
                },
                {
                    $project: { _id: 0 }
                },
                {
                    $sort: {numTourStarts: -1} //1: 遞增, -1:遞減
                },
                {
                    $limit: 3
                }
            ]
        );

        res.status(200).json({
            status:'success',
            data: {
                plan
            }
        });
    }
    catch(err){
        next(err);
        /*
        res.status(400).json({
            status: 'fail',
            message: err,
        })
        */
    }
}

// /tours-within/:distance/center/:latlng/unit/:unit
// /tours-within/233/center/40,50/unit/mi
//給定一位子以及距離後, 以此距離產生圓心計算圓內有多少 tours
exports.getToursWith = async (req, res, next) =>{
    try{
         //使用 deconstructor 從 req.params 取值, 下面三個變數對應:後變數名稱 /tours-within/:distance/center/:latlng/unit/:unit
        const {distance, latlng, unit} = req.params;
        const [lat, lng] = latlng.split(',');
        //圓半徑: mongo db 查地理位址專用的轉換(公里或公尺之類的)
        const radius = unit === 'mi' ? distance / 3963.2 : distance / 6378.1;

        if(!lat || !lng){
            next( new AppError('please provide a lat and lng'), 400);
        }

        //{} : filter obj 算出符合條件之 tours
        const tours = await Tour.find({
            //mongo db 規定順序是要放 lng, lat 然後再給圓半徑(radius) 
            startLocation: { $geoWithin: { $centerSphere: [[lng, lat], radius] } }
         });

        res.status(200).json({
            status: 'success',
            result: tours.length,
            data: {
                data: tours,
            }
        });
    }
    catch(err){
        next(err);
    }
}

//給定一地點後, 計算所有tours離此地點之距離
exports.getDistance = async (req, res, next) =>{
    try{
        //使用 deconstructor 從 req.params 取值, 下面變數對應:後變數名稱 /distances/:latlng/unit/:unit
       const {latlng, unit} = req.params;
       const [lat, lng] = latlng.split(',');
       //做miles or km 之轉換
       const multiplier = unit === 'mi' ? 0.000621371 : 0.001;

       if(!lat || !lng){
           next( new AppError('please provide a lat and lng'), 400);
       }

       const distances = await Tour.aggregate([
        {
            //mongo db 規定 $geoNear 一定要放在query的第一位, 所以把 tourModel 的 AGGREGATION MIDDLEWARE 給註解掉
            $geoNear: {
                near: {
                  type: 'Point',
                  coordinates: [lng * 1, lat * 1] // *1 將字串轉數字 
                },
                distanceField: 'distanceFromUrLocation', //定義 field name 為 distance
                distanceMultiplier: multiplier //使用上面的miles or km 之轉換
              }
        },
        {
            //使用projection 製作要回傳給client(postman)之欄位
            $project: {
                distanceFromUrLocation: 1, // 1:代表要顯示此欄位給user看
                name: 1
            }
        }
       ]);

       res.status(200).json({
           status: 'success',
           data: {
                data: distances
           }
       });
   }
   catch(err){
       next(err);
   }
}

//Tour 傳入要作用之 model 給 factory
exports.getAllTours = factory.getAll(Tour);
exports.getTour = factory.getOne(Tour, {path: 'reviews'});
exports.createTour = factory.createOne(Tour);
exports.deleteTour = factory.deleteOne(Tour);
exports.updateTour = factory.updateOne(Tour);