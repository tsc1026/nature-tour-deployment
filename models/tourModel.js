const mongoose = require('mongoose');
const slugify = require('slugify');
const validator = require('validator');
const User = require('./userModesl');

//schema
const tourSchema = new mongoose.Schema(
    {
        name:{
            type: String,
            required: [true, 'A tour must have a name'],
            unique: true,
            trim: true, //若有輸入空格會被去掉
            // validators: 限制 & 錯誤資訊
            maxlength: [40, 'A tour name must have less or equal then 40 characters'],
            minlength: [10, 'A tour name must have more or equal then 10 characters'],
            //validate: [validator.isAlpha, 'A tour name must only contain characters'], 
        },
        slug: String,
        duration:{
            type: Number,
            required: [true, 'A tour must have a duration']
        },
        maxGroupSize: {
            type: Number,
            required: [true, 'A tour must have a group size']
        },
        difficulty: {
            type: String,
            required: [true, 'A tour must have a difficulty'],
            //usgin enum of validators, enum only for strings
            enum: {
                values: ['easy', 'medium', 'difficult'],
                message: 'Difficulty is either: easy, medium, difficult'
            }
        },
        ratingsAverage: {
            type: Number,
            default: 4.5,
            //validators for numbers
            min: [1, 'Rating must be above 1.0'],
            max: [5, 'Rating must be below 5.0'],
            //每次有值set到此field 都會執行
            //普通 round 只會變成 4.666 => 5
            //所以用 4.666 * 10 = 46.66 => round => 47 => 除10 => 4.7
            set: val => Math.round(val * 10) / 10, 
        },
        ratingsQuantity: {
            type: Number,
            default: 0
        },
        price: {
            type: Number,
            required: [true, 'A tour must have a price']
        },
        priceDiscount: {
            type: Number,
            //custom validator
            validate: //validate property
            {
                validator: function(val) {
                    return val < this.price; //unvalidator 就回傳 false
                },
                message: 'Discount price ({VALUE}) should be below regular price'
            }
        },
        summary: {
            type: String,
            trim: true,
        },
        description: {
            type: String,
            trim: true,
            required: [true, 'A tour must have a description']
        },
        imageCover: {
            type: String,
            required: [true, 'A tour must have a cover image']
        },
        images:[String], //宣告一個字串陣列
        createdAt: {
            type: Date,
            default: Date.now(),
            select: false, //代表此欄位不顯示給user
        },
        startDates: [Date],
        //如果是secretTour不顯示給一般user看, 預設為 false
        secretTour: {
            type: Boolean,
            default: false
        },
        //tour 起始點
        startLocation: {
            // GeoJSON(mongo db 定義之 geo location)
            type: {
                type: String,
                default: 'Point',
                enum: ['Point']
            },
            coordinates: [Number], //經緯度
            address: String,
            description: String
        },
        //一個 tour裡面包含的所有景點, 注意這裡是用 [] 包著, 代表是embedded(就是此欄位裡面還包含很多不同docs)
        locations: [
            {
              type: {
                type: String,
                default: 'Point',
                enum: ['Point']
              },
              coordinates: [Number],
              address: String,
              description: String,
              day: Number
            }
        ],
        //guides: Array,
        //改用 referencing
        guides: [ //[] 代表是 enbedded documents
            {
                //只存 user id
                type: mongoose.Schema.ObjectId,//代表此欄位存 mongo db id
                ref: 'User',//參考到 User model
            }
        ]
    },
    {
    //當schema 輸出是JSON or Object 時候, virutals properties 會被包含在其中
    toJSON: {virtuals: true},
    toObject: {virtuals: true},
    }
);

//設置 index 給 price field & ratingsAverage
//1:ASC order
tourSchema.index({price: 1, ratingsAverage: -1, slug: 1}); 
tourSchema.index({slug: 1}); 
//告知 mongo db 我們要用 2d 座標
tourSchema.index({startLocation: '2dsphere'}); 

//virtual properties: 不會被建立在db, 每次撈資料出來(下面的get 就是get data的意思)時才會建立
//virtual properties: 不能在 query 中被使用
tourSchema.virtual('durationWeeks').get(
    //必須給一個regular funciton, 不可以用 arror funciton(沒有this)
    function(){
        //this指向目前存取之 document, 這裡目的是算此tour需要幾個禮拜所以 / 7
        return this.duration / 7; 
    }
)

//virtual populate
tourSchema.virtual('reviews', { //'reviews': 要顯示在tour model 之欄位名稱
    ref: 'Review', //參考到之 model name
    foreignField: 'tour', //參考到 review Model 下的 tour field(存 tour id)
    localField: '_id', //參考到 tour Model 自己的 id
})

//document middleware: 目前的 document save 到 db 前先執行此 middleware
//只有 save() & create() 這兩個才會先trigger 此 middleware
tourSchema.pre('save', function(next){
    //console.log(this); //this 指向目前的 document
    this.slug = slugify(this.name, {lower: true});
    next();
});

/*
tourSchema.pre('save', async function(next){
    //得到一個存有多個 promises 的陣列
    const guidesPromises = this.guides.map(async id => await User.findById(id));
    console.log(guidesPromises);
    //執行此陣列內所有 promises 並把值給guides array
    this.guides = await Promise.all(guidesPromises);
    next();
});
*/

//pre query middleware: 處理執行前的 query, 當執行 find query 會觸發此 middleware
tourSchema.pre(/^find/, function(next){
    //this 指向目前的 query
    this.find({ secretTour: { $ne: true } });
    this.startQueryTime = Date.now();
    next();
});

//pre query middleware: 處理執行前 query, 當執行 find query 會觸發此 middleware
tourSchema.pre(/^find/, function(next){
    //this 指向目前的 query
    this.populate(
        {
            path: 'guides',
            select: '-__v -role'
        }
    );
    next();
});

tourSchema.post(/^find/, function(docs, next){
    //console.log(`Query took ${Date.now() - this.startQueryTime} millionseconds`);
    //console.log(docs); //撈出query 執行後的所有docs
    next();
});

//aggregation middleware
// AGGREGATION MIDDLEWARE
/*
tourSchema.pre('aggregate', function(next) {
    //console.log(this); //指向 aggregation object
    this.pipeline().unshift({ $match: { secretTour: { $ne: true } } });
    console.log('this.pipeline()', this.pipeline());
    next();
});
*/

const Tour = mongoose.model('Tour', tourSchema);

module.exports = Tour; //exports 此 model