const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const userSchema = new mongoose.Schema({
    name:{
        type: String,
        required: [true, 'please tell us your name'],
    },
    email: {
        type: String,
        required: [true, 'Please provide your email'],
        unique: true,
        lowercase: true,
        validate: [validator.isEmail, 'Please provide a valid email']
    },
    photo: {
        type: String, 
        default: 'default.jpg'
    },
    password: {
        type: String,
        required: [true, 'please provide a valid password'],
        minlength: 8,
        select: false, //不顯示給 client
    },
    passwordConfirm: {
        type: String,
        required: [true, 'please provide a valid password'],
        //custom validator
        validate: {
            validator: function(el){
                //el(就是passwordConfirm)
                return el === this.password
            },
            message: 'passwords are not equal!'
        }
    },
    //紀錄user變更密碼日期
    passwordChangedAt: Date,
    role: {
        type:String,
        enum:['user', 'guide', 'lead-guide', 'admin'],
        default: 'user',
    },
    //reset password
    passwordResetToken: String,
    passwordResetExpires: Date,
    //deleting users
    active:{
        type: Boolean,
        default: true,
        select: false,
    }
});

userSchema.pre('save', async function(next){
    //this指向目前 doc, mongo doc 自帶isModified() 給予欄位名稱即可檢查此欄位有沒有修改過
    if(!this.isModified('password'))
        //如果password欄位值沒有改過, 就往下一個middleware 
        return next();

    //如果password欄位值有改過(就要再把密碼加密一次)
    //12會隨機加入12個字串到你的密碼中在 hash, 這裡會回傳 promise 所以要用await接, callback也要改成 async
    this.password = await bcrypt.hash(this.password, 12);

    //我們的目的只是當密碼被修改過就把密碼重新加密一次, 所以passwordConfirm不重要, 在存到資料庫前若想刪除欄位值可以給 undefined
    this.passwordConfirm = undefined;
    next();
});

//middleware: 紀錄舊有密碼被修改的時間(新user不用紀錄)
userSchema.pre('save', async function(next){
    //如果password field 沒有被更改過 or 目前的doc是新的user(新的user一定會動到 password field因為要設置密碼, 但這種情況不算是修改密碼所以要避開此狀況)
    if(!this.isModified('password') || this.isNew)
        return next();

    //紀錄password 被更改的時間(扣去1秒誤差)
    this.passwordChangedAt = Date.now() - 1000;
    next();
});

userSchema.pre(/^find/, function(next){
    //this points to the current doc
    this.find( { active: {$ne: false} } );
    next();
})

//instant funciton
userSchema.methods.correctPassword = async function(candidatePassword, userPassword){
    return await bcrypt.compare(candidatePassword, userPassword); //比對一樣就回傳T
}

//instant funciton: 確認user是否在發token後, 有變更密碼
//JWTTimestamp: token issued time, changedTimestamp: user取得token後去變更密碼之時間
userSchema.methods.changedPasswordAfter = function(JWTTimestamp){
    //在instant method 中 this 指向目前 doc
    //在 model 中我們有定義此欄位, 當user變更密碼會將變更時間記錄在此欄位, 若從未變更過則此欄位不會有值
    if(this.passwordChangedAt){
        //抓取user變更密碼之時間,因為 passwordChangedAt.getTime()給的時間很長, 所以需要做一些處理才能跟JWTTimestamp 做比較
        const changedTimestamp = parseInt(this.passwordChangedAt.getTime()/1000, 10);
        return JWTTimestamp < changedTimestamp; //100(token發行時間) < 200(密碼被變更時間) 回傳T,代表取得token後改過密碼
    }
    
    return false; //預設回傳沒有變更密碼, false: 代表取得token後密碼沒有被變更過
}

userSchema.methods.createPasswordResetToken = function() {
    //使用crypto 套件隨機產生一個未加密之 token, 可以用來 reset password
    const resetToken = crypto.randomBytes(32).toString('hex');
    
    //this 指向目前之 doc, 所以下面兩個會去改變目前doc的 passwordResetToken & passwordResetExpires 的值
    //目的:將上面的產生未加密之token 加密後放到 user model 下的 passwordResetToken 欄位
    this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');
    //目的: 產生passwordResetExpires(加密後的token過期時間) 放到user model 下的 passwordResetExpires 欄位
    this.passwordResetExpires = Date.now() + 10 * 60 * 1000;

    //回傳未加密之token
    return resetToken;
}

const User = mongoose.model('User', userSchema);
module.exports = User;