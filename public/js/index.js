import '@babel/polyfill';
import {displayMap} from './mapbox';
import {login, logout} from './login';
import { updateSettings } from './updateSettings';
import { bookTour } from './stripe';

//check dom elements
const mapBox = document.getElementById('map');
if(mapBox){
    //const locations = JSON.parse(document.getElementById('map').dataset.locations);
    const locations = JSON.parse(mapBox.dataset.locations); // mapBox === document.getElementById('map')
    displayMap(locations);
}

//check loginForm & values
const loginForm =  document.querySelector('.form');
//抓login pug 下 class === form 的 element 
if(loginForm){
    document.querySelector('.form').addEventListener('submit', e => {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        login(email, password);
    });
}

//for logout function
//依照class抓dom ele
const logOutBtn = document.querySelector('.nav__el--logout'); 
if (logOutBtn)
     //當logout btn 被按下就呼叫 login.js 下的 logout function
    logOutBtn.addEventListener('click', logout);

//for updating a user's data(user's name & email)
const userDataForm = document.querySelector('.form-user-data'); //抓form
if (userDataForm) //如果有抓到 form
  userDataForm.addEventListener('submit', e => {
        e.preventDefault();
        //建立 form obj, 因為 pug 那邊是一張表單裡面包含下面三欄位
        const form = new FormData(); 
        //將值附加在表單上, 參數1:自取名稱, 餐數2.抓pug ele值
        form.append('name', document.getElementById('name').value);
        form.append('email', document.getElementById('email').value);
        //formUpload html ele取出後是一陣列, 我們取第一個(照片檔案本身)
        form.append('photo', document.getElementById('photo').files[0]);
        //表單傳給 updateSettings function 此 function 會去觸發我們的 updateMe api
        updateSettings(form, 'data');
    });

//for updating a user's data(user's password)
const userPasswordForm = document.querySelector('.form-user-password'); //抓form
if (userPasswordForm) //如果有抓到 form
    userPasswordForm.addEventListener('submit', async e => {
        e.preventDefault();
        //還在更新的時候將 btn 文字內容改成 Updating...
        document.querySelector('.btn--save-password').textContent = 'Updating...';

        //抓取password elements 值
        const passwordCurrent = document.getElementById('password-current').value;
        const password = document.getElementById('password').value;
        const passwordConfirm = document.getElementById('password-confirm').value;
        
        //呼叫updateSettings function 此 function 會去觸發我們的 updateMyPassword api
        //passwordCurrent, password, passwordConfirm 這三個參數名稱要跟 API 對應
        await updateSettings(
            { passwordCurrent, password, passwordConfirm },
            'password'
        );
        
        //更新完後將 btn 文字內容改成 Save password, 並清空password 等欄位之值
        document.querySelector('.btn--save-password').textContent = 'Save password';
        document.getElementById('password-current').value = '';
        document.getElementById('password').value = '';
        document.getElementById('password-confirm').value = '';
    });

//stripe
const bookBtn = document.getElementById('book-tour');
if(bookBtn){
    bookBtn.addEventListener('click', e =>{
        ////e.target: e(event) 此行意思就是取的目前event附加上的element, 所以e.target === tour.pug 的 bookBtn
        e.target.textContent = 'Processing...';

        //e.target: e(event) 此行意思就是取的目前event附加上的element, 所以就是當 bookBtn 被按下後觸發
        //取 stripe.js 內的 tourid 值
        //data-tour-id(在tour.pug 設定之tour id值), 因為js會自動將-省略並轉大寫所以變成 => tourId, js取dataset值固定是dataset, 所以最後變成dataset.tourId
        const tourId = e.target.dataset.tourId;

        //抓到 tourid 後去呼叫 stripe.js 並傳入 tour id 值
        bookTour(tourId);
    });
}
