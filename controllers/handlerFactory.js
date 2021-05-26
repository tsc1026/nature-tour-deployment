const AppError = require('./../utils/appError');

class APIFeatures {
  //query: mongoose query obj, queryString: url path query string
  //只要new APIFeatures 物件, 就會自動執行此constructor function
  constructor(query, queryString){
      this.query = query; // query === Tour.find() 就是Mongoose Model 的 query object
      this.queryString = queryString; //queryString === req.query 就是 url path 上的 query parameters
      //console.log('this.query', this.query);
      //console.log('this.queryString', this.queryString);
  }

  filter(){
       const queryObj = {...this.queryString}; //...取出req.query內所有方法, 再放入{}中變成物件, 再指定給 queryObj, 這樣就不會動到原本的req.query 
       const excludedFields = ['page','sort','limit','fields']; //要去除之條件 
       excludedFields.forEach(el => delete queryObj[el]);//從queryObj中一一刪除這些條件

       //Advanced filtering
       let queryStr = JSON.stringify(queryObj);//把物件轉回JSON
       //get: greater than or equal, greater than, less than or equal, less than  詳情參考: 95. Advanced Filtering
       queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, match => `$${match}`);

       this.query = this.query.find(JSON.parse(queryStr));
       
       return this; //回傳整個物件給 sort() 用
  }

  sort(){
      if(this.queryString.sort){ //如果url(query para)上有 sort關鍵字
          const sortBy = this.queryString.sort.split(',').join(' ');
          this.query = this.query.sort(sortBy);
      }else{
          this.query = this.query.sort('-createdAt');
      }
      return this; //回傳整個物件給下一個 funciton 用
  }

  limitFields(){
      if(this.queryString.fields){
          const fields = this.queryString.fields.split(',').join(' ');
          this.query = this.query.select(fields);
      }else{
          this.query = this.query.select('-__v'); //排除__v 欄位
      }
      return this; //回傳整個物件給下一個 funciton 用
  }

  paginate(){
      //page=1&limit=10, page:目前在第幾頁, limit:一頁幾筆, page1:要顯示11-20的資料
      const page = this.queryString.page * 1 || 1;  //目前是第幾頁, *1 把將字串轉數字, 第二個數字是 default 表顯示第一頁之資料
      const limitPerPage = this.queryString.limit * 1 || 100; //每一頁顯示幾筆資料, *1將字串轉數字, 第二個數字是 default 表每頁顯示100筆資料
      const skipData = (page -1) * limitPerPage; //為了顯示目前頁數之資料, 計算要跳過多少筆資料

      this.query = this.query.skip(skipData).limit(limitPerPage);

      //如果資料數不夠顯示, 之後再處理
      /*
      if(this.queryString.page){ //query parameter 有 page才需要處理: 資料數不夠顯示這件事
          //計算Tour Model(table)有多少筆資料, Tour.countDocuments()會回傳 promise 所以可以用await接收回傳之資料
          const numTours = await Tour.countDocuments(); 
          if(skip >= numTours) //如果說要忽略之資料筆數 >= 資料總筆數, 就代表資料數不夠顯示
              throw new Error('This page does not exist');
      }
      */
      return this; //回傳整個物件給下一個 funciton 用
  }

}

exports.deleteOne = Model =>
  async (req, res, next) => {
    try{
      const doc = await Model.findByIdAndDelete(req.params.id);

      if (!doc) {
        return next(new AppError('No document found with that ID', 404));
      }
  
      res.status(204).json({
        status: 'success',
        data: null
      });
    }
    catch(err){
      next(err);
    }
  };
    
exports.updateOne = Model =>
  async (req, res, next) => {
    try{
      //console.log('myid:', req);
      const doc = await Model.findByIdAndUpdate(
        //para1: 依照id找到要更新之doc, para2:傳入近來要更新到doc上之資料, 
        req.params.id, 
        //para2: 要更新之資料
        req.body, 
        //para3:是否要回傳更新後之 doc(視為new doc)以及每次更新後是否要驗證新doc
        {
            new:true, 
            runValidators: true
        });
  
      if (!doc) {
        //如果沒有找到對應doc, 就return 結束此程式區塊, 並用next往下執行
        return next(new AppError('No document found with that ID', 404));
      }
  
      res.status(200).json({
        status: 'success',
        data: {
          data: doc,
        }
      });
    }
    catch(err){
      next(err);
    }
  };

exports.createOne = Model =>
  async (req, res, next) => {
    try{
      //Mongo Model 自帶 create function
      const doc = await Model.create(req.body);

      if (!doc) {
        return next(new AppError('No document found with that ID', 404));
      }
  
      res.status(201).json({
        status: 'success',
        data: doc
      });
    }
    catch(err){
      next(err);
    }
  };

exports.getOne = (Model, popOptions) =>
  async (req, res, next) => {
    try{
      let query = Model.findById(req.params.id); //先組成 query 未執行
      if (popOptions) query = query.populate(popOptions); //如果有 populate options 就將其加入 query 中
      const doc = await query;//執行
       
      if(!doc){
        //若找不到就用return 結束此程式區塊, next往下執行
        return next(new AppError('No tour found with this ID', 404));
      }

      res.status(200).json({
          status:'success',
          data: {
            data: doc
          }
      })
    }
    catch(err){
      next(err);
    }
  };

exports.getAll = Model => 
async (req, res, next) => {
  try{
    /*專門只給 get all reviews 用的 filter */
      let filter = {};
      //如果 url params 有 tourId, 就將其設定給filter,之後給 find 去找特定的 reviews
      if(req.params.tourId){
        filter = {tour: req.params.tourId};
      }
    /*filter end  */

    const features = new APIFeatures(Model.find(filter), req.query)
    .filter()
    .sort()
    .limitFields()
    .paginate();

    //const doc = await features.query.explain();
    const doc = await features.query;

    res.status(200).json({
        status: 'success',
        results: doc.length,
        data: {
          data: doc
        }
    });
  }
  catch(err){
    next(err);
  }
}
