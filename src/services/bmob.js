/**
 * Bmob REST API Client - File Service Edition
 * Designed for future cloud sync with Bmob File Service.
 * Requires a bound domain in Bmob settings to work.
 */

let config = {
    appId: '',
    restKey: '',
    safeToken: ''
};

export const initBmob = (appId, restKey, safeToken) => {
    config.appId = appId;
    config.restKey = restKey;
    config.safeToken = safeToken;
};

const getHeaders = () => {
    const headers = {
        'X-Bmob-Application-Id': config.appId,
        'X-Bmob-REST-API-Key': config.restKey,
        'Content-Type': 'application/json'
    };
    if (config.safeToken) {
        headers['X-Bmob-Safe-Token'] = config.safeToken;
    }
    return headers;
};

const BASE_URL_V1 = '/api/bmob/1';
const BASE_URL_V2 = '/api/bmob/2';

// Upload file to Bmob (supports Base64 or String content)
export const uploadFile = async (filename, data, contentType = 'image/jpeg') => {
    let body;
    let type = contentType;

    if (typeof data === 'string' && data.startsWith('data:')) {
        const byteString = atob(data.split(',')[1]);
        type = data.split(',')[0].split(':')[1].split(';')[0];
        const ab = new ArrayBuffer(byteString.length);
        const ia = new Uint8Array(ab);
        for (let i = 0; i < byteString.length; i++) {
            ia[i] = byteString.charCodeAt(i);
        }
        body = new Blob([ab], { type });
    } else {
        body = new Blob([data], { type: contentType });
    }

    const response = await fetch(`${BASE_URL_V2}/files/${filename}`, {
        method: 'POST',
        headers: {
            'X-Bmob-Application-Id': config.appId,
            'X-Bmob-REST-API-Key': config.restKey,
            'Content-Type': type
        },
        body: body
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`文件上传失败 (${response.status}): ${errorText}`);
    }

    return await response.json();
};

// Save project to Bmob (Using File Service for both thumbnail and data)
export const saveProject = async (name, canvasData, thumbnailBase64) => {
    // 1. Upload thumbnail
    const thumbRes = await uploadFile(`thumb_${Date.now()}.jpg`, thumbnailBase64);

    // 2. Upload canvas JSON as file
    const jsonRes = await uploadFile(`data_${Date.now()}.json`, JSON.stringify(canvasData), 'application/json');

    // 3. Save project record with URLs
    const response = await fetch(`${BASE_URL_V1}/classes/Projects`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
            name,
            canvasDataUrl: jsonRes.url,
            thumbnail: thumbRes.url
        })
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`保存失败 (${response.status}): ${errorText}`);
    }

    return await response.json();
};

// Get all projects
export const getProjects = async () => {
    const response = await fetch(`${BASE_URL_V1}/classes/Projects?order=-createdAt`, {
        method: 'GET',
        headers: getHeaders()
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`获取列表失败 (${response.status}): ${errorText}`);
    }

    const result = await response.json();
    return result.results || [];
};

// Load project from cloud
export const loadFullProject = async (project) => {
    if (project.canvasDataUrl) {
        const response = await fetch(project.canvasDataUrl);
        if (!response.ok) throw new Error('从云端下载数据失败');
        return await response.json();
    }
    // Fallback for old schema
    if (project.canvasData) {
        return typeof project.canvasData === 'string' ? JSON.parse(project.canvasData) : project.canvasData;
    }
    throw new Error('未找到有效的画布数据链接');
};

// Delete project
export const deleteProject = async (objectId) => {
    const response = await fetch(`${BASE_URL_V1}/classes/Projects/${objectId}`, {
        method: 'DELETE',
        headers: getHeaders()
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`删除失败 (${response.status}): ${errorText}`);
    }

    return await response.json();
};
