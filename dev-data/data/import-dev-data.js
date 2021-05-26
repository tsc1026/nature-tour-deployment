const mongoose = require('mongoose');
const fs = require('fs');
const dotenv = require('dotenv');
const Tour = require('./../../models/tourModel');
const User = require('./../../models/userModesl');
const Review = require('./../../models/reviewModel');

dotenv.config({path: './config.env'});

//messagesDB: db name
mongoose.connect(process.env.DATABASE)
.then(result =>{
    console.log('connecting to the db !');
})
.catch(err =>{
    console.log(err);
});

//read json file
const tours = JSON.parse(fs.readFileSync(`${__dirname}/tours.json`, 'utf-8'));//讀檔案後是json所以靠JSON.parse轉 object
const users = JSON.parse(fs.readFileSync(`${__dirname}/users.json`, 'utf-8'));//讀檔案後是json所以靠JSON.parse轉 object
const reviews = JSON.parse(fs.readFileSync(`${__dirname}/reviews.json`, 'utf-8'));//讀檔案後是json所以靠JSON.parse轉 object

//檔案資料存入db
const importData = async() => {
    try{
        await Tour.create(tours);
        await User.create(users, {validateBeforeSave: false});
        await Review.create(reviews);

        console.log('data loaded');
        process.exit(); //強制離開 application
    }catch(err){
        console.log(err);
    }
}

//清空資料庫中資料
const deleteData = async() => {
    try{
        await Tour.deleteMany();
        await User.deleteMany();
        await Review.deleteMany();

        console.log('data deleted');
        process.exit(); //強制離開 application
    }catch(err){
        console.log(err);
    }
}

//node dev-data/data/import-dev-data.js --delete
if(process.argv[2] === '--import'){
    importData();
}else if(process.argv[2] === '--delete'){
    deleteData();
}