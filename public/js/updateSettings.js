import axios from 'axios';
import {showAlert} from './alert';

// type is either 'password' or 'data' 更新 password 跟更新 user's name & email 是使用不同的 API, 所以使用 type 參數來判斷
export const updateSettings = async(data, type) => {
    try {
        const url =
          type === 'password'
            ? '/api/v1/users/updatePassword'
            : '/api/v1/users/updateMe';
    
        const res = await axios({
          method: 'PATCH',
          url,
          data
        });
    
        if (res.data.status === 'success') {
          showAlert('success', `${type.toUpperCase()} updated successfully!`);
          //user 更改圖片1秒後重載網頁, 這樣才會顯示新的大頭貼
          window.setTimeout(() => {
            location.reload();
          }, 1000);
        }
      } catch (err) {
        showAlert('error', err.response.data.message);
    }
}