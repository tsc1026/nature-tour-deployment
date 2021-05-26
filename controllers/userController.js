const User = require('./../models/userModesl');
const jwt = require('jsonwebtoken');
const AppError = require('./../utils/appError');
const factory = require('./handlerFactory');
const multer = require('multer');
const sharp = require('sharp');

//目的:比對clientSide送過來要更新之欄位, 是否在我們規定內, 防止clientSide更新不能更新之欄位
//obj:clientSide送過來要更新之欄位, ...allowedFields:我們規定clientSide只能更新的欄位
const filterObj = (obj, ...allowedFields) =>{
    const newObj = {};
    
    // Object.keys(obj): 會回傳一個陣列裡面包含所有obj內的key name
    //遶行Object.keys(obj):回傳之陣列跟allowedFields array做比較
    Object.keys(obj).forEach(el => {
        //如果key name相等
        if(allowedFields.includes(el)){
            //就把Object.keys(obj):回傳之陣列的key name 加入到 newObj
            newObj[el] = obj[el];
        }
    });
    
    //回傳newObj 物件
    return newObj;
}

/* disk 存圖片
const multerStorage = multer.diskStorage({
   //這裡的 cb 是一callback function, 作用像是 express 的 next 
   destination: (req, file, cb) => {
    //參數1: 若有錯誤產生(這裡沒有所以給null), 參數2:上傳後儲存圖片之處
     cb(null, 'public/img/users');
   },
   //產生獨一無二的 filename: user-userid-timestamp.jpeg
   filename: (req, file, cb) => {
     //file extention: jpeg
     const ext = file.mimetype.split('/')[1];
     //使用req obj & file obj 拼湊成上面的 filename 之後傳給 callback function
     cb(null, `user-${req.user.id}-${Date.now()}.${ext}`);
   }
});
*/
const multerStorage = multer.memoryStorage(); //改用 memory 來存圖片

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
  
exports.uploadUserPhoto = upload.single('photo'); //single:代表只傳一張圖, photo: 代表 photo field

exports.getAllUsers = async (req, res, next) => {
    try{
        const users = await User.find();

        res.status(200).json({
            status: 'success',
            result: users.length,
            data:{
                users
            }
        });
    }
    catch(err){
        next(err);
    }
}

exports.createUser = (req, res) => {
    res.status(500).json({
        status: 'error',
        message: 'This route is not yet defined!'
    });
}

/*xxxMe 皆為 admin 使用 */
exports.deleteMe = async(req, res, next) => {
    try{
       //不真正刪除user 只是將active field 改F
       await User.findByIdAndUpdate(req.user.id, {active: false});

       res.status(204).json({
            status: 'success',
            data: null,
       });
    }
    catch(err){
        next(err);
    }
}

//resize user's image 
exports.resizeUserPhoto = async (req, res, next) => {
    //如果user沒有上傳圖檔, 就直接到下一個 middleware
    if (!req.file) 
        return next();

    //設定圖片唯一檔案名稱
    req.file.filename = `user-${req.user.id}-${Date.now()}.jpeg`;
    
    //因為上面的 multer storage 改成用 memory 存, 所以這裡可以用 buffer
    await sharp(req.file.buffer)
      .resize(500, 500) //圖片大小
      .toFormat('jpeg') //檔案類型
      .jpeg({ quality: 90 }) //image quality
      .toFile(`public/img/users/${req.file.filename}`); //將圖片寫入 disk
  
    next();
};

//user 更新個人資料(但不能更新密碼, 需登入)
exports.updateMe = async(req, res, next) => {
    try{
        //console.log(req.file);
        //console.log(req.body);

        //1). create an error if the user updates its password
        if(req.body.password || req.body.passwordConfirm) {
            return next(new AppError('Please use /updatePassword to update your password', 400));
        }

        //2).Filtered out unwanted fields that are not allowed to be update
        //已經先經過authController.protect 所以有 req.user.id 可以用
        //因為這裡不會用到password, 所以不需要user model 那裡不需要用到 this, 所以可以用 findByIdAndUpdate
        //req.user.id: 要更新之userId, filteredBody:只更新部分欄位, {new:true, runValidators:true}: 更新後回傳新物件,以及是否要跑model validator
        //filteredBody: 規定user只能更新這些欄位, 以防有人想要用這個更新自己的 role
        const filteredBody = filterObj(req.body, 'name', 'email');
        //如果有傳入file(user 大頭貼)
        if(req.file)
            //在filteredBody 加入 photo(允許user更新此欄位), 並將傳入之filename(photo name)值設定給此欄位, 之後更新到db
            filteredBody.photo = req.file.filename;

        //3).update the user
        const updateUser = await User.findByIdAndUpdate(req.user.id, filteredBody, {new:true, runValidators:true});

        res.status(200).json({
            status: 'success',
            data: {
                user: updateUser,
            }
        });
    }
    catch(err){
        next(err);
    }
}
exports.getMe = (req, res, next) => {
    req.params.id = req.user.id; //從 middleware 取 user id
    next();
};


exports.getUser = factory.getOne(User);
//不需要登入之版本. only for admin 注意不可以使用此API更新password, 因為save middleware 不會被 findByIdAndUpdate 觸發
exports.updateUser = factory.updateOne(User);
//deleteUser 開放給 route 呼叫之名稱, 實際上會去執行 factory.deleteOne()
exports.deleteUser = factory.deleteOne(User);
