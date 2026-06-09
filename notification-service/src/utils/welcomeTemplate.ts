/**
 * Generates a premium and clean HTML template for the welcome email.
 * @param firstName The user's first name.
 */
export const getWelcomeEmailTemplate = (firstName: string): string => {
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to IRCTC</title>
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
      padding: 40px 20px;
      text-align: center;
      color: #ffffff;
    }
    .header h1 {
      margin: 0;
      font-size: 28px;
      font-weight: 700;
      letter-spacing: 0.5px;
    }
    .content {
      padding: 40px 30px;
      line-height: 1.6;
    }
    .content h2 {
      margin-top: 0;
      color: #1e3c72;
      font-size: 20px;
    }
    .content p {
      margin: 0 0 20px 0;
      font-size: 16px;
      color: #4a5568;
    }
    .cta-container {
      text-align: center;
      margin: 30px 0;
    }
    .cta-button {
      display: inline-block;
      font-size: 16px;
      font-weight: 600;
      color: #ffffff;
      background-color: #1e3c72;
      padding: 12px 30px;
      border-radius: 8px;
      text-decoration: none;
      box-shadow: 0 4px 6px rgba(30, 60, 114, 0.15);
      transition: background-color 0.2s ease;
    }
    .cta-button:hover {
      background-color: #2a5298;
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
      <h1>Welcome to IRCTC!</h1>
    </div>
    <div class="content">
      <h2>Hello ${firstName},</h2>
      <p>Your account has been successfully verified, and we are absolutely thrilled to welcome you to our community!</p>
      <p>With IRCTC, you can search train schedules, check ticket availability, book journeys, and manage your trips quickly and securely.</p>
      
      <div class="cta-container">
        <a href="#" class="cta-button" style="color: #ffffff;">Explore Dashboard</a>
      </div>
      
      <p>If you have any questions or need assistance, our support team is always ready to help.</p>
      <p>Best regards,<br>The IRCTC Team</p>
    </div>
    <div class="footer">
      <p>This is an automated system email. Please do not reply directly to this message.</p>
      <p style="margin-top: 5px;">&copy; ${new Date().getFullYear()} IRCTC Backend. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`;
};
