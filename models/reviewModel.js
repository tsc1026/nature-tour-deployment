const mongoose = require('mongoose');
const slugify = require('slugify');
const validator = require('validator');
const User = require('./userModesl');
const Tour = require('./tourModel');

const reviewSchema = new mongoose.Schema(
    {
        review:{
            type:String,
            required: [true, 'A review cannot be empty.'],
        },
        rating:{
            type:Number,
            max:5,
            min:1,
        },
        createdAt:{
            type:Date,
            default:Date.now(),
        },
        //parent referencing
        //review會知道他屬於哪個 tour, 但tour不知道其下有多少 reviews
        tour:{
            type:mongoose.Schema.ObjectId,
            ref:'Tour',
            required: [true, 'A review must belong to a tour.'],
        },
        user:{
            type:mongoose.Schema.ObjectId,
            ref:'User',
            required: [true, 'A review must belong to a user.'],
        },
    },
    {
        //當schema 輸出是JSON or Object 時候, virutals properties 會被包含在其中
        toJSON: {virtuals: true},
        toObject: {virtuals: true},
    }
);

//每個 user 只能對一個 tour 給定一次 review
reviewSchema.index({tour: 1, user: 1}, {unique: true});

reviewSchema.pre(/^find/, function(next){
    /*
    this.populate({
        path: 'tour',
        select: 'name',
    }).populate({
        path: 'user',
        select: 'name role'
    });*/

    this.populate({
        path: 'user',
        select: 'name role photo'
    })
    next();
});

//傳入目前review 所屬之 tour id
reviewSchema.statics.calcAverageRatings = async function(tourId){
    //會回傳promise
    //this refers to the current model, 因為是指向 model 所以可以用 agggregate funciton
    const stats = await this.aggregate([
        {
            //tour(reviewSchema的tour欄位, 裡面存tourId)
            $match: {tour: tourId}
        },
        {
            $group :{
                _id: '$tour', //以tour 為劃分不同 group 之基準
                nRating: {$sum: 1}, //each tour match => nRating 就 +1(舉例:一個tour 有5個reviews, 就+5)
                avgRating: {$avg: '$rating'}
            }
        }
    ]);

    //console.log(stats);

    //判斷tour是否還有review
    if(stats.length > 0){ //如果還有 reviews
        //會回傳一個 promise, 但我們不需要接此promise只需要將資料存到db即可, 所以不宣告變數存回傳之 promise 
        await Tour.findByIdAndUpdate(tourId,
        {
            ratingsQuantity: stats[0].nRating,
            ratingsAverage: stats[0].avgRating,
        }
    )
    }else{ //tour 沒有 review或review被刪光(stats array 為空陣列)
        //因為tour 目前沒有 review 所以給予預設值 
        await Tour.findByIdAndUpdate(tourId,
        {
            ratingsQuantity: 0,
            ratingsAverage: 0,
        }
    )
    }
}

//不能移到建立Review model之後, 因為這樣會先建立完 Review model, 這個 middleware 就不會被包含在此Review model中
//使用 post 原因是因為, 要先把新review加進去db, 這樣才能算加完新review後的 avgRating。 最後注意post 沒有提供 next()
reviewSchema.post('save', function(){
    //this 指向目前的 current review doc
    //this.constructor 就是 review Model, 有了它才可以用 calcAverageRatings()
    //this.tour 就是目前的 review doc 下的 tour id。 因為 this 指向目前的 review doc, 每個review doc 都存有其對應之 tour id, 我們在 review Model內有宣告過 tour 欄位
    //console.log('post this', this);
    this.constructor.calcAverageRatings(this.tour);
});


//findByIdAndUpdate, findByIdAndDelete
reviewSchema.pre(/^findOneAnd/, async function(next){
    //this 指向 current query(不是current doc)
    //console.log('update this', this);
    //為了要拿到current review doc, 所以用 this.findOne() 找出 current review doc。(findOne finds the first document that matches the query and returns it.)
    //拿到後將其當成一個 property 加到 this所指之物件上(current query)
    this.currentReview = await this.findOne();
    console.log('currentReview', this.currentReview);
    next();
});

//找到current doc(review)之後, 才可以且
reviewSchema.post(/^findOneAnd/, async function(next){
   //this.currentReview.constructor: 就是 reviewSchema
   //this.currentReview: 就是從上面傳過來 this.findOne(); 從資料庫找到之current doc
   //this.currentReview.tour: 就是目前此review所屬之tour id
   //console.log('this.currentReview',  this.currentReview);
   //console.log('this.currentReview.constructor',  this.currentReview.constructor);
   await this.currentReview.constructor.calcAverageRatings(this.currentReview.tour);
});


//doc: current riview doc
reviewSchema.post(/^findOneAnd/, async function(doc, next) {
    //console.log(doc);
    //doc.constructor === reviewSchema, 所以可以呼叫 calcAverageRatings function
    //doc.tour 就是抓取目前 current review doc 對應之 tour id => doc.tour === tour.id
    await doc.constructor.calcAverageRatings(doc.tour);
    next();
  });


//建立Review model 
const Review = mongoose.model('Review', reviewSchema);

//開放給外界用
module.exports = Review;

