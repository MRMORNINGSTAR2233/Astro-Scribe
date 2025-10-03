// Simple test script to debug chat API
const fetch = require('node-fetch');

async function testChat() {
  try {
    console.log('Testing chat API...');
    
    const response = await fetch('http://localhost:3000/api/chat/query', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: "test",
        sessionId: "test-123"
      })
    });
    
    const result = await response.json();
    console.log('Response:', result);
    
  } catch (error) {
    console.error('Error:', error);
  }
}

testChat();