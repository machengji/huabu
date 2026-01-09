const https = require('https');

const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJBTE1kOWtibUxlTUpUNFBRS1RuM1BEOEdBS2VOTnRHYiIsImV4cCI6MTc2Nzc4MzU3NCwiaWF0IjoxNzY3Nzc5OTc0fQ.9SaxKdEYEtNyFCu08G2qiVZSHUNdTQN8W83J34r_D4c';

const options = {
    hostname: 'api-beijing.klingai.com',
    port: 443,
    path: '/v1/images/generations',
    method: 'GET',
    headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    }
};

const req = https.request(options, (res) => {
    console.log(`Status: ${res.statusCode}`);
    let body = '';
    res.on('data', (chunk) => body += chunk);
    res.on('end', () => {
        console.log('Body:', body);
    });
});

req.on('error', (e) => {
    console.error('Error:', e);
});

req.end();
