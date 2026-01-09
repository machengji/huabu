const LIBLIB_BASE_URL = '/api/liblib';

// Helper for URL-safe Base64 encoding (no padding)
function base64UrlEncode(arrayBuffer) {
    const bytes = new Uint8Array(arrayBuffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary)
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');
}

// Generate LibLibAI Signature
async function generateSignature(path, timestamp, nonce, secretKey) {
    const originalText = `${path}&${timestamp}&${nonce}`;
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secretKey);
    const dataData = encoder.encode(originalText);

    const cryptoKey = await crypto.subtle.importKey(
        'raw',
        keyData,
        { name: 'HMAC', hash: 'SHA-1' },
        false,
        ['sign']
    );

    const signature = await crypto.subtle.sign(
        'HMAC',
        cryptoKey,
        dataData
    );

    return base64UrlEncode(signature);
}

// Create Generation Task
export const createLibLibTask = async (prompt, accessKey, secretKey) => {
    const path = '/api/generate/webui/text2img/ultra';
    const timestamp = Date.now();
    const nonce = Math.random().toString(36).substring(2, 15);
    const signature = await generateSignature(path, timestamp, nonce, secretKey);

    const url = `${LIBLIB_BASE_URL}${path}?AccessKey=${accessKey}&Timestamp=${timestamp}&SignatureNonce=${nonce}&Signature=${signature}`;

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            templateUuid: '5d7e67009b344550bc1aa6ccbfa1d7f4', // Star-3 Alpha
            generateParams: {
                prompt: prompt,
                aspectRatio: 'square'
            }
        })
    });

    const result = await response.json();
    if (result.code !== 0) {
        throw new Error(result.msg || 'LibLibAI 创建任务失败');
    }

    return result.data.generateUuid;
};

// Check Task Status
export const checkLibLibStatus = async (generateUuid, accessKey, secretKey) => {
    const path = '/api/generate/webui/status';
    const timestamp = Date.now();
    const nonce = Math.random().toString(36).substring(2, 15);
    const signature = await generateSignature(path, timestamp, nonce, secretKey);

    const url = `${LIBLIB_BASE_URL}${path}?AccessKey=${accessKey}&Timestamp=${timestamp}&SignatureNonce=${nonce}&Signature=${signature}`;

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            generateUuid: generateUuid
        })
    });

    const result = await response.json();
    if (result.code !== 0) {
        throw new Error(result.msg || 'LibLibAI 查询状态失败');
    }

    return result.data;
};

// Full Generation Flow with Polling
export const generateImageLibLib = async (prompt, accessKey, secretKey, onStatusUpdate) => {
    const generateUuid = await createLibLibTask(prompt, accessKey, secretKey);

    let attempts = 0;
    const maxAttempts = 60;

    while (attempts < maxAttempts) {
        const data = await checkLibLibStatus(generateUuid, accessKey, secretKey);

        /**
         * generateStatus 枚举值:
         * 1: 等待执行
         * 2: 执行中
         * 3: 已生图 (进入审核)
         * 4: 审核中
         * 5: 成功
         * 6: 失败
         * 7: 超时
         */
        const status = data.generateStatus;

        if (status === 5) { // Success
            if (data.images && data.images.length > 0) {
                return data.images[0].imageUrl;
            }
            throw new Error('LibLibAI 未获取到生成的图片 URL');
        } else if (status === 6) {
            throw new Error(data.generateMsg || 'LibLibAI 任务执行失败');
        } else if (status === 7) {
            throw new Error('LibLibAI 任务超时');
        }

        // Status 1, 2, 3, 4 are in progress
        let statusDesc = '生成中...';
        if (status === 1) statusDesc = '排队中...';
        else if (status === 2) statusDesc = '正在生成...';
        else if (status === 3) statusDesc = '已生成，审核中...';
        else if (status === 4) statusDesc = '内容审核中...';

        if (onStatusUpdate) onStatusUpdate(`LibLibAI ${statusDesc}`);

        await new Promise(resolve => setTimeout(resolve, 3000));
        attempts++;
    }

    throw new Error('LibLibAI 生成超时');
};
