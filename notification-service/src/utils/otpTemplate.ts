/**
 * Generates a premium and clean HTML template for the OTP verification email.
 * @param otp The One-Time Password to display.
 * @param ttlMinutes The number of minutes before the OTP expires.
 */
export const getOtpTemplate = (otp: number, ttlMinutes: number): string => {
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>OTP Verification</title>
  <style>
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background-color: #f4f6f9;
      color: #333333;
      margin: 0;
      padding: 0;
      -webkit-font-smoothing: antialiased;
    }
    .container {
      max-width: 550px;
      margin: 40px auto;
      background-color: #ffffff;
      border-radius: 12px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
      border: 1px solid #eef1f6;
      overflow: hidden;
    }
    .header {
      background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
      padding: 30px 20px;
      text-align: center;
      color: #ffffff;
    }
    .header h1 {
      margin: 0;
      font-size: 24px;
      font-weight: 600;
      letter-spacing: 0.5px;
    }
    .content {
      padding: 40px 30px;
      line-height: 1.6;
    }
    .content p {
      margin: 0 0 20px 0;
      font-size: 16px;
      color: #4a5568;
    }
    .otp-container {
      text-align: center;
      margin: 30px 0;
    }
    .otp-code {
      display: inline-block;
      font-size: 36px;
      font-weight: 700;
      color: #1e3c72;
      background-color: #f0f4f8;
      padding: 10px 24px;
      border-radius: 8px;
      letter-spacing: 6px;
      border: 1px dashed #2a5298;
    }
    .expiry-text {
      font-size: 14px;
      color: #e53e3e;
      text-align: center;
      margin-top: 10px;
      font-weight: 500;
    }
    .footer {
      background-color: #f8fafc;
      padding: 20px;
      text-align: center;
      border-top: 1px solid #eef1f6;
      font-size: 12px;
      color: #a0aec0;
    }
    .footer p {
      margin: 0;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>IRCTC OTP Verification</h1>
    </div>
    <div class="content">
      <p>Hello,</p>
      <p>Thank you for registering. Please use the following One-Time Password (OTP) to complete your verification process. This OTP is valid for a limited time.</p>
      
      <div class="otp-container">
        <div class="otp-code">${otp}</div>
        <div class="expiry-text">This OTP will expire in ${ttlMinutes} minutes.</div>
      </div>
      
      <p>If you did not request this verification, please ignore this email.</p>
    </div>
    <div class="footer">
      <p>This is an automated system email. Please do not reply directly to this message.</p>
      <p style="margin-top: 5px;">&copy; ${new Date().getFullYear()} IRCTC Backend. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`;
};
