class AppError extends Error{
    constructor(message, statusCode){
        //把傳進來的message傳給父類別(Error Class), Error Class會將傳進來的 message 設定給自己的 message property
        super(message);
        this.statusCode = statusCode;
        //如果 statusCode 是 4開頭就設定status為fail, 否則設為 error
        this.status =  `${statusCode}`.startsWith('4') ? 'fail' : 'error';
        //判斷是否為 operational errors
        this.isOperational = true;
        //Error.captureStackTrace 可以抓取第幾行程式碼引發錯誤, 
        //param1: 目前物件, param2:就是父類別 Error abstract object
        Error.captureStackTrace(this, this.constructor);
    }
}

//將此檔案 exports 出去
module.exports = AppError;