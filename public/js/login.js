import axios from 'axios';
import {showAlert} from './alert';

export const login = async(email, password) => {
    try{
        const res = await axios({
            method: 'POST',
            url: '/api/v1/users/login',
            data: {
                email: email,
                password: password,
            }
        });

        if(res.data.status === 'success'){
            showAlert('success', 'Logged in successfully!');
            window.setTimeout(() => {
                location.assign('/') //回首頁
            }, 1500);
        }
    }
    catch(err){
        showAlert('error', err.response.data.message);
    }
};

/*
//抓login pug 下 class === form 的 element 
document.querySelector('.form').addEventListener('submit', e => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    login(email, password);
});
*/

export const logout = async () => {
    try {
      const res = await axios({
        method: 'GET',
        url: '/api/v1/users/logout'
      });

      if ((res.data.status = 'success')) 
        location.reload(true); //從server reload 網頁, 而非讀取快取
    } catch (err) {
      //console.log(err.response);
      showAlert('error', 'Error logging out! Try again.');
    }
};
