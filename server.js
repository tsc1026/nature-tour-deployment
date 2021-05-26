const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config({path: './config.env'});
const app = require('./app'); //引用 app.js file 才有 app可用

//若有使用未宣告變數之情形這裡會抓到
process.on('uncaughtException', err =>{
    //console.log('err.name', err.name);
    //console.log('err.message', err.message);
    process.exit(1);
});

//messagesDB: db name
mongoose.connect(process.env.DATABASE)
.then(result =>{
    console.log('connecting to the db !');
})
.catch(err =>{
    console.log(err);
});

// 4) start server
const port = process.env.PORT || 3000;
const server = app.listen(port, () => {
    console.log(`App running on port ${port}...`);
});

process.on('unhandledRejection', err => {
    console.log('err.name', err.name);
    console.log('err.message', err.message);
    server.close( () =>{process.exit(1)} );
});