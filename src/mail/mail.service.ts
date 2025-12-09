import { Injectable } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';

@Injectable()
export class MailService {
  constructor(private mailerService: MailerService) {}

  async sendUserCredentials(
    email: string,
    username: string,
    password: string,
    firstName?: string,
  ) {
    try {
      await this.mailerService.sendMail({
        to: email,
        subject: 'Chào mừng đến với Clothes Shop - Thông tin tài khoản',
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body {
                font-family: Arial, sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
              }
              .header {
                background-color: #4CAF50;
                color: white;
                padding: 20px;
                text-align: center;
                border-radius: 5px 5px 0 0;
              }
              .content {
                background-color: #f9f9f9;
                padding: 30px;
                border: 1px solid #ddd;
                border-radius: 0 0 5px 5px;
              }
              .credentials {
                background-color: #fff;
                padding: 20px;
                margin: 20px 0;
                border-left: 4px solid #4CAF50;
                border-radius: 5px;
              }
              .credential-item {
                margin: 10px 0;
                padding: 10px;
                background-color: #f5f5f5;
                border-radius: 3px;
              }
              .label {
                font-weight: bold;
                color: #4CAF50;
              }
              .value {
                font-family: monospace;
                color: #333;
                font-size: 14px;
              }
              .warning {
                background-color: #fff3cd;
                border: 1px solid #ffc107;
                color: #856404;
                padding: 15px;
                border-radius: 5px;
                margin: 20px 0;
              }
              .footer {
                text-align: center;
                margin-top: 20px;
                color: #777;
                font-size: 12px;
              }
              .button {
                display: inline-block;
                padding: 12px 30px;
                background-color: #4CAF50;
                color: white;
                text-decoration: none;
                border-radius: 5px;
                margin: 20px 0;
              }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>🎉 Chào mừng đến với Clothes Shop!</h1>
            </div>
            <div class="content">
              <p>Xin chào ${firstName || username},</p>
              
              <p>Tài khoản của bạn đã được tạo thành công bởi quản trị viên. Dưới đây là thông tin đăng nhập của bạn:</p>
              
              <div class="credentials">
                <div class="credential-item">
                  <span class="label">📧 Email:</span><br>
                  <span class="value">${email}</span>
                </div>
                <div class="credential-item">
                  <span class="label">👤 Tên đăng nhập:</span><br>
                  <span class="value">${username}</span>
                </div>
                <div class="credential-item">
                  <span class="label">🔑 Mật khẩu:</span><br>
                  <span class="value">${password}</span>
                </div>
              </div>

              <div class="warning">
                <strong>⚠️ Lưu ý bảo mật:</strong>
                <ul>
                  <li>Vui lòng đổi mật khẩu ngay sau lần đăng nhập đầu tiên</li>
                  <li>Không chia sẻ thông tin đăng nhập với bất kỳ ai</li>
                  <li>Sử dụng mật khẩu mạnh với ít nhất 8 ký tự, bao gồm chữ hoa, chữ thường, số và ký tự đặc biệt</li>
                </ul>
              </div>

              <div style="text-align: center;">
                <a href="http://localhost:3000/login" class="button">Đăng nhập ngay</a>
              </div>

              <p>Nếu bạn có bất kỳ câu hỏi nào, vui lòng liên hệ với bộ phận hỗ trợ của chúng tôi.</p>
              
              <p>Trân trọng,<br><strong>Đội ngũ Clothes Shop</strong></p>
            </div>
            <div class="footer">
              <p>Email này được gửi tự động, vui lòng không trả lời.</p>
              <p>&copy; 2024 Clothes Shop. All rights reserved.</p>
            </div>
          </body>
          </html>
        `,
      });

      return { success: true, message: 'Email sent successfully' };
    } catch (error) {
      console.error('Error sending email:', error);
      return { success: false, message: 'Failed to send email', error: error.message };
    }
  }

  async sendWelcomeEmail(email: string, name: string) {
    try {
      await this.mailerService.sendMail({
        to: email,
        subject: 'Chào mừng bạn đến với Clothes Shop',
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body {
                font-family: Arial, sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
              }
              .header {
                background-color: #4CAF50;
                color: white;
                padding: 30px;
                text-align: center;
                border-radius: 5px 5px 0 0;
              }
              .content {
                background-color: #f9f9f9;
                padding: 30px;
                border: 1px solid #ddd;
                border-radius: 0 0 5px 5px;
              }
              .footer {
                text-align: center;
                margin-top: 20px;
                color: #777;
                font-size: 12px;
              }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>🎉 Chào mừng đến với Clothes Shop!</h1>
            </div>
            <div class="content">
              <p>Xin chào ${name},</p>
              <p>Cảm ơn bạn đã đăng ký tài khoản tại Clothes Shop. Chúng tôi rất vui khi được phục vụ bạn!</p>
              <p>Hãy khám phá các sản phẩm thời trang tuyệt vời của chúng tôi.</p>
              <p>Trân trọng,<br><strong>Đội ngũ Clothes Shop</strong></p>
            </div>
            <div class="footer">
              <p>&copy; 2024 Clothes Shop. All rights reserved.</p>
            </div>
          </body>
          </html>
        `,
      });

      return { success: true };
    } catch (error) {
      console.error('Error sending welcome email:', error);
      return { success: false, error: error.message };
    }
  }
  
  async sendResetPasswordByAdminEmail(email: string,
    username: string,
    password: string,
    firstName?: string,) {
    try {
      await this.mailerService.sendMail({
        to: email,
        subject: 'Đặt lại mật khẩu Clothes Shop',
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body {
                font-family: Arial, sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
              }
              .header {
                background-color: #4CAF50;
                color: white;
                padding: 30px;
                text-align: center;
                border-radius: 5px 5px 0 0;
              }
              .content {
                background-color: #f9f9f9;
                padding: 30px;
                border: 1px solid #ddd;
                border-radius: 0 0 5px 5px;
              }
              .button {
                display: inline-block;
                padding: 12px 30px;
                background-color: #4CAF50;
                color: white;
                text-decoration: none;
                border-radius: 5px;    
                margin: 20px 0;
              }
              .footer {
                text-align: center;
                margin-top: 20px;
                color: #777;
                font-size: 12px;
              }
            </style>
          </head>
          <>
            <div class="header">
              <h1>🔐 Mật khẩu của bạn đã được đặt lại!</h1>
            </div>
            <div class="content">
              <p>Xin chào ${firstName || username},</p>
              <p>Mật khẩu tài khoản Clothes Shop của bạn đã được quản trị viên đặt lại. Dưới đây là thông tin đăng nhập mới của bạn:</p>
              <ul>
                <li><strong>📧 Email:</strong> ${email}</li>
                <li><strong>👤 Tên đăng nhập:</strong> ${username}</li>
                <li><strong>🔑 Mật khẩu mới:</strong> ${password}</li>
              </ul>
              <p>Vui lòng đăng nhập và thay đổi mật khẩu ngay sau lần đăng nhập đầu tiên để bảo vệ tài khoản của bạn.</p>
              <div style="text-align: center;">
                <a href="http://localhost:3000/login" class="button">Đăng nhập ngay</a>
              </div>
              <p>Trân trọng,<br><strong>Đội ngũ Clothes Shop</strong></p>
            </div>
            <div class="footer">
              <p>&copy; 2024 Clothes Shop. All rights reserved.</p>
            </div>
          </body>
          </html>
        `,
      });

      return { success: true };
    } catch (error) {
      console.error('Error sending password reset email:', error);
      return { success: false, error: error.message };
    }
  }
}