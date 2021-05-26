import axios from 'axios';
import {showAlert} from './alert';

//使用 public key
const stripe = Stripe('pk_test_51IttOIFJ9e0366prbGWDJwUdx36cqLdEvh5yfYigtDBbXSuRiy0JxLqTYgrfAPjgLIVl7Ol6tDm8ZonqUiXBk9ZL00zYFJvcSi');

export const bookTour = async function(tourId){
    try {
        // 1) Get checkout session from 我們自己建立的API (/checkout-session/:tourId)
        const session = await axios(
          `/api/v1/bookings/checkout-session/${tourId}`
        );
        //console.log(session);
    
        // 2) Create checkout form + chanre credit card(stripe會自動產生checkout page)
        //我們只需要提供 sesstion id 給 stripe 即可
        await stripe.redirectToCheckout({
          sessionId: session.data.session.id
        });
      } catch (err) {
        console.log(err);
        showAlert('error', err);
      }
}