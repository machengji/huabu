const KLING_API_URL = '/api/kling/v1/images/generations';

// Helper to generate JWT for Kling AI
async function generateJWT(accessKey, secretKey) {
    const header = { alg: 'HS256', typ: 'JWT' };
    const now = Math.floor(Date.now() / 1000);

    // Match the official Python example exactly
    const payload = {
        iss: accessKey.trim(),
        exp: now + 1800, // 30 minutes
        nbf: now - 5     // 5 seconds ago
    };

    const base64Url = (str) => {
        const bytes = new TextEncoder().encode(str);
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary)
            .replace(/=/g, '')
            .replace(/\+/g, '-')
            .replace(/\//g, '_');
    };

    const encodedHeader = base64Url(JSON.stringify(header));
    const encodedPayload = base64Url(JSON.stringify(payload));
    const data = `${encodedHeader}.${encodedPayload}`;

    const encoder = new TextEncoder();
    const keyData = encoder.encode(secretKey.trim());
    const cryptoKey = await crypto.subtle.importKey(
        'raw',
        keyData,
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
    );

    const signature = await crypto.subtle.sign(
        'HMAC',
        cryptoKey,
        encoder.encode(data)
    );

    const signatureArray = new Uint8Array(signature);
    let signatureBinary = '';
    for (let i = 0; i < signatureArray.byteLength; i++) {
        signatureBinary += String.fromCharCode(signatureArray[i]);
    }

    const encodedSignature = btoa(signatureBinary)
        .replace(/=/g, '')
        .replace(/\+/g, '-')
        .replace(/\//g, '_');

    const token = `${data}.${encodedSignature}`;
    return token;
}

export const createKlingTask = async (prompt, accessKey, secretKey, modelName = 'kling-v1') => {
    if (!accessKey || !secretKey) throw new Error('请先配置 Kling Access Key 和 Secret Key');

    const token = await generateJWT(accessKey, secretKey);

    const response = await fetch(KLING_API_URL, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            model_name: modelName,
            prompt: prompt,
            aspect_ratio: '1:1'
        })
    });

    const result = await response.json();
    console.log('Kling API Response:', result);

    if (result.code !== 0) {
        throw new Error(result.message || '创建任务失败');
    }

    return result.data.task_id;
};

export const checkKlingTask = async (taskId, accessKey, secretKey) => {
    const token = await generateJWT(accessKey, secretKey);

    const response = await fetch(`${KLING_API_URL}/${taskId}`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    });

    const result = await response.json();
    if (result.code !== 0) {
        throw new Error(result.message || '查询任务失败');
    }

    return result.data;
};

export const generateImageKling = async (prompt, accessKey, secretKey, onStatusUpdate) => {
    const taskId = await createKlingTask(prompt, accessKey, secretKey);

    let attempts = 0;
    const maxAttempts = 60;

    while (attempts < maxAttempts) {
        const data = await checkKlingTask(taskId, accessKey, secretKey);

        if (data.task_status === 'succeed') {
            if (data.task_result && data.task_result.images && data.task_result.images.length > 0) {
                return data.task_result.images[0].url;
            }
            throw new Error('未获取到生成的图片 URL');
        } else if (data.task_status === 'failed') {
            throw new Error(data.task_status_msg || '任务执行失败');
        }

        if (onStatusUpdate) onStatusUpdate(`生成中... (${data.task_status})`);

        await new Promise(resolve => setTimeout(resolve, 5000));
        attempts++;
    }

    throw new Error('生成超时，请稍后在任务列表中查看');
};
