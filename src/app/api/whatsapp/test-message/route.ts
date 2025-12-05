import { NextRequest, NextResponse } from 'next/server';
import { whatsappCloudService } from '@/lib/services';

/**
 * Test WhatsApp message sending
 * POST /api/whatsapp/test-message
 */
export async function POST(request: NextRequest) {
  try {
    const { phoneNumber, messageType = 'text' } = await request.json();

    if (!phoneNumber) {
      return NextResponse.json(
        { error: 'Phone number is required' },
        { status: 400 }
      );
    }

    let result;

    if (messageType === 'template') {
      // Send template message
      result = await whatsappCloudService.sendTemplateMessageWithCustomerData(
        phoneNumber,
        'payment_reminder_basic',
        {
          name: 'Test User',
          phone: phoneNumber,
          location: 'Test Location',
          invoiceId: 'TEST-001',
          amount: 1000,
          dueDate: new Date('2024-02-01')
        }
      );
    } else {
      // Send simple text message
      const testMessage = `🧪 SmartBooks WhatsApp Test

Hello! This is a test message from your SmartBooks WhatsApp integration.

✅ Configuration: Working
✅ Authentication: Valid  
✅ Templates: Loaded
✅ Ready for business use!

This message was sent automatically via WhatsApp Cloud API.

Time: ${new Date().toLocaleString()}`;

      result = await whatsappCloudService.sendMessage(phoneNumber, testMessage);
    }

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: 'Test message sent successfully!',
        messageId: result.messageId,
        status: result.status,
        to: result.to,
        responseTime: result.responseTime
      });
    } else {
      return NextResponse.json(
        { 
          error: result.error,
          errorCode: result.errorCode,
          shouldRetry: result.shouldRetry
        },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error('Test message API error:', error);
    return NextResponse.json(
      { error: 'Failed to send test message' },
      { status: 500 }
    );
  }
}

/**
 * Get test message form
 * GET /api/whatsapp/test-message
 */
export async function GET() {
  const htmlForm = `
<!DOCTYPE html>
<html>
<head>
    <title>WhatsApp Test Message</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; }
        .form-group { margin: 20px 0; }
        label { display: block; margin-bottom: 5px; font-weight: bold; }
        input, select, button { padding: 10px; font-size: 16px; width: 100%; box-sizing: border-box; }
        button { background: #25D366; color: white; border: none; cursor: pointer; margin-top: 10px; }
        button:hover { background: #128C7E; }
        .result { margin-top: 20px; padding: 15px; border-radius: 5px; }
        .success { background: #d4edda; color: #155724; border: 1px solid #c3e6cb; }
        .error { background: #f8d7da; color: #721c24; border: 1px solid #f5c6cb; }
        .info { background: #e2f3ff; color: #0c5460; border: 1px solid #b8daff; padding: 10px; margin: 10px 0; }
    </style>
</head>
<body>
    <h1>🧪 WhatsApp Test Message</h1>
    
    <div class="info">
        <strong>📱 Your Test Number:</strong> +15556448581<br>
        <strong>🎯 Status:</strong> Ready to send messages<br>
        <strong>💰 Free Tier:</strong> 1000 messages/month
    </div>

    <form id="testForm">
        <div class="form-group">
            <label for="phoneNumber">Your Phone Number:</label>
            <input type="text" id="phoneNumber" name="phoneNumber" 
                   placeholder="9876543210 or +919876543210" required>
            <small>Enter your WhatsApp number to receive the test message</small>
        </div>

        <div class="form-group">
            <label for="messageType">Message Type:</label>
            <select id="messageType" name="messageType">
                <option value="text">Simple Text Message</option>
                <option value="template">Template Message (Payment Reminder)</option>
            </select>
        </div>

        <button type="submit">📤 Send Test Message</button>
    </form>

    <div id="result"></div>

    <script>
        document.getElementById('testForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const phoneNumber = document.getElementById('phoneNumber').value;
            const messageType = document.getElementById('messageType').value;
            const resultDiv = document.getElementById('result');
            
            resultDiv.innerHTML = '<div class="info">⏳ Sending message...</div>';
            
            try {
                const response = await fetch('/api/whatsapp/test-message', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ phoneNumber, messageType })
                });
                
                const data = await response.json();
                
                if (data.success) {
                    resultDiv.innerHTML = \`
                        <div class="success">
                            <h3>✅ Message Sent Successfully!</h3>
                            <p><strong>Message ID:</strong> \${data.messageId}</p>
                            <p><strong>Status:</strong> \${data.status}</p>
                            <p><strong>To:</strong> \${data.to}</p>
                            <p><strong>Response Time:</strong> \${data.responseTime}ms</p>
                            <p>📱 Check your WhatsApp for the message!</p>
                        </div>
                    \`;
                } else {
                    resultDiv.innerHTML = \`
                        <div class="error">
                            <h3>❌ Message Failed</h3>
                            <p><strong>Error:</strong> \${data.error}</p>
                            \${data.errorCode ? \`<p><strong>Code:</strong> \${data.errorCode}</p>\` : ''}
                        </div>
                    \`;
                }
            } catch (error) {
                resultDiv.innerHTML = \`
                    <div class="error">
                        <h3>❌ Request Failed</h3>
                        <p><strong>Error:</strong> \${error.message}</p>
                    </div>
                \`;
            }
        });
    </script>
</body>
</html>`;

  return new Response(htmlForm, {
    headers: { 'Content-Type': 'text/html' }
  });
}