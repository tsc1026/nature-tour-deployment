//讓 alert 視窗消失之 function
export const hideAlert = () => {
    const el = document.querySelector('.alert');
    if (el) el.parentElement.removeChild(el);
};
  
// type is 'success' or 'error'
export const showAlert = (type, msg) => {
    hideAlert(); //一律先關閉警告訊息
    //建立 div 並依據傳入參數套用 success / error css class
    const markup = `<div class="alert alert--${type}">${msg}</div>`; 
    //插入此 div 到 dom 上面
    document.querySelector('body').insertAdjacentHTML('afterbegin', markup);
    // 5 秒後讓 alert 視窗消失
    window.setTimeout(hideAlert, 5000);
};