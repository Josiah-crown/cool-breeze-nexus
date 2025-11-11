/**
 * ✉️ Email Connection Test Script
 * 
 * This script tests the SMTP credentials to ensure email sending will work.
 * Run this BEFORE implementing the full alert system.
 * 
 * Usage:
 *   npm install nodemailer
 *   node test-email-connection.js
 */

import nodemailer from 'nodemailer';

// SMTP Configuration (from EMAIL_SMTP_CONFIG.env)
const config = {
  host: 'mail.iotnexus.site',
  port: 465,
  secure: true, // Use SSL/TLS
  auth: {
    user: 'alerts@iotnexus.site',
    pass: 'l~7A3C6}+$v6'
  }
};

// Test email details
const testEmail = {
  from: '"Cool Breeze Nexus Alerts" <alerts@iotnexus.site>',
  to: 'JCrowntechnologies@gmail.com', // Your actual email for testing
  subject: '🧪 Test Email - SMTP Configuration',
  html: `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
        .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; }
        .success { background: #d1fae5; border-left: 4px solid #10b981; padding: 12px; margin: 16px 0; }
        .footer { text-align: center; padding: 16px; color: #6b7280; font-size: 12px; }
        .button { display: inline-block; background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 16px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>✅ SMTP Connection Test Successful!</h1>
        </div>
        <div class="content">
          <div class="success">
            <strong>🎉 Great News!</strong> Your email configuration is working correctly.
          </div>
          
          <h2>Configuration Details:</h2>
          <ul>
            <li><strong>SMTP Host:</strong> mail.iotnexus.site</li>
            <li><strong>SMTP Port:</strong> 465 (SSL/TLS)</li>
            <li><strong>From Address:</strong> alerts@iotnexus.site</li>
            <li><strong>Test Time:</strong> ${new Date().toLocaleString()}</li>
          </ul>
          
          <h2>What's Next?</h2>
          <p>Now that the email system is verified, we can proceed with implementing:</p>
          <ol>
            <li>✅ Alert checking logic (monitors machine parameters)</li>
            <li>✅ Automated email notifications</li>
            <li>✅ Alert history dashboard</li>
            <li>✅ Unsubscribe functionality</li>
          </ol>
          
          <a href="http://localhost:8080" class="button">View Dashboard</a>
        </div>
        <div class="footer">
          <p>This is an automated test message from Cool Breeze Nexus</p>
          <p>Domain: iotnexus.site | Email: alerts@iotnexus.site</p>
        </div>
      </div>
    </body>
    </html>
  `,
  text: `
    ✅ SMTP CONNECTION TEST SUCCESSFUL!
    
    Your email configuration is working correctly.
    
    Configuration Details:
    - SMTP Host: mail.iotnexus.site
    - SMTP Port: 465 (SSL/TLS)
    - From Address: alerts@iotnexus.site
    - Test Time: ${new Date().toLocaleString()}
    
    What's Next?
    Now that the email system is verified, we can proceed with implementing:
    1. Alert checking logic
    2. Automated email notifications
    3. Alert history dashboard
    4. Unsubscribe functionality
    
    This is an automated test message from Cool Breeze Nexus.
  `
};

async function testEmailConnection() {
  console.log('🔧 Testing SMTP Connection...\n');
  console.log('Configuration:');
  console.log(`  Host: ${config.host}`);
  console.log(`  Port: ${config.port}`);
  console.log(`  User: ${config.auth.user}`);
  console.log(`  Secure: ${config.secure ? 'Yes (SSL/TLS)' : 'No'}`);
  console.log('\n');

  try {
    // Create transporter
    console.log('📡 Creating SMTP transporter...');
    const transporter = nodemailer.createTransport(config);

    // Verify connection
    console.log('🔍 Verifying SMTP credentials...');
    await transporter.verify();
    console.log('✅ SMTP credentials verified!\n');

    // Send test email
    console.log('📧 Sending test email...');
    console.log(`  To: ${testEmail.to}`);
    console.log(`  Subject: ${testEmail.subject}`);
    
    const info = await transporter.sendMail(testEmail);
    
    console.log('\n✅ EMAIL SENT SUCCESSFULLY!\n');
    console.log('Details:');
    console.log(`  Message ID: ${info.messageId}`);
    console.log(`  Response: ${info.response}`);
    console.log('\n');
    console.log('🎉 SMTP configuration is working perfectly!');
    console.log('📬 Check your inbox at:', testEmail.to);
    console.log('\n');
    console.log('Next Steps:');
    console.log('  1. ✅ Email system verified');
    console.log('  2. ⏳ Provide alert threshold values (see ALERT_CONDITIONS_FINAL.md)');
    console.log('  3. ⏳ Implement alert checking logic');
    console.log('  4. ⏳ Deploy to production');
    
    return true;
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error('\nTroubleshooting:');
    console.error('  1. Check if SMTP credentials are correct');
    console.error('  2. Verify port 465 is not blocked by firewall');
    console.error('  3. Ensure email account is not suspended in cPanel');
    console.error('  4. Try port 587 (TLS) instead of 465 (SSL)');
    console.error('\nFull Error Details:');
    console.error(error);
    
    return false;
  }
}

// Run the test
testEmailConnection()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(err => {
    console.error('Unexpected error:', err);
    process.exit(1);
  });

