const MINIMAX_API_URL = '/api/minimax/v1/image_generation';

export const generateImage = async (prompt, apiKey) => {
    if (!apiKey) {
        throw new Error('请先配置 MiniMax API Key');
    }

    const trimmedKey = apiKey.trim();
    const response = await fetch(MINIMAX_API_URL, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${trimmedKey}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            model: 'image-01',
            prompt: prompt,
            aspect_ratio: '1:1', // Default to square for canvas
            response_format: 'base64'
        })
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.base_resp?.status_msg || '生成图片失败');
    }

    const result = await response.json();
    console.log('MiniMax API Response:', result);

    if (result.base_resp && result.base_resp.status_code !== 0) {
        throw new Error(result.base_resp.status_msg || `API Error: ${result.base_resp.status_code}`);
    }

    if (result.data && result.data.image_base64 && result.data.image_base64.length > 0) {
        return `data:image/jpeg;base64,${result.data.image_base64[0]}`;
    }

    throw new Error('未获取到生成的图片数据，请检查控制台日志');
};
