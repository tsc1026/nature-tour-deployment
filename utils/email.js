const nodemailer = require('nodemailer');
const pug = require('pug');
const htmlToText = require('html-to-text');

//module.exports 開放給外界呼叫
module.exports = class Email {
  
  constructor(user, url) {
    //user obj 內包含此 user's email & userNmae
    this.to = user.email;
    this.firstName = user.name.split(' ')[0];
    //url 像是我們要傳給user 重設密碼之 url
    this.url = url;
    //顯示給 user 看這封信從哪裡來的, 這裡的 EMAIL_FROM 寫在 config.env 檔
    this.from = `Melo <${process.env.EMAIL_FROM}>`;
  }

  //可以依據不同環境寄送出不同信件
  newTransport(){
    //production mode
    if(process.env.NODE_ENV === 'production'){
       // Sendgrid
       return nodemailer.createTransport({
        service: 'SendGrid',
        auth: {
          user: process.env.SENDGRID_USERNAME,
          pass: process.env.SENDGRID_PASSWORD
        }
      });
    }
    //testing mode
    return nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      auth: {
        user: process.env.EMAIL_USERNAME,
        pass: process.env.EMAIL_PASSWORD
      }
    });
  };

  //send an email
  async send(template, subject) {
    //1.render html based on a pug template
    //依照傳入之 template name 去 render 不同的 template, 例如下面傳過來的welcome 就會去render views/email/welcome.pug
    const html = pug.renderFile(`${__dirname}/../views/email/${template}.pug`, {
      firstName: this.firstName,
      url: this.url,
      subject
    });

    //2.define the email options
    const mailOptions = {
      from: this.from,
      to: this.to,
      subject,
      html,
      text: htmlToText.fromString(html) //將上面的 html變數的內容都轉成 string
    };
    
    //3.create a transport and send the email(呼叫我們自己建立的newTransport())
    await this.newTransport().sendMail(mailOptions);
  }

   
   async sendWelcome(){
    //呼叫 send function 去送信
    //因為是在同一物件下的functions 所以用 this.名稱來使用
    //welcome: 要使用之 pug template name, par2: 給 template 使用之資訊
    await this.send('welcome', 'Welcome to the Natours Family!');
  }

  async sendPasswordReset() {
    //呼叫 send function 去送信
    await this.send(
      'passwordReset',
      'Your password reset token (valid for only 10 minutes)'
    );
  }
}