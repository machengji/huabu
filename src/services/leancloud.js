import AV from 'leancloud-storage';

const APP_ID = 'fNJb5kxiG5JACBivlXAuGqly-gzGzoHsz';
const APP_KEY = '0DF5TPnflU45HnbyFvVNPLxq';
const SERVER_URL = 'https://fnjb5kxi.lc-cn-n1-shared.com';

// 初始化 LeanCloud
if (APP_ID) {
    AV.init({
        appId: APP_ID,
        appKey: APP_KEY,
        serverURL: SERVER_URL
    });
    console.log('%c✅ LeanCloud 已初始化', 'color: #007aff; font-weight: bold;');
}

const Project = AV.Object.extend('CanvasProject');

// --- Auth Service ---
export const getCurrentUser = () => AV.User.current();

export const signUp = async (username, password, email) => {
  const user = new AV.User();
  user.setUsername(username);
  user.setPassword(password);
  if (email) user.setEmail(email);
  return await user.signUp();
};

export const logIn = async (username, password) => {
  return await AV.User.logIn(username, password);
};

export const logOut = async () => {
  return await AV.User.logOut();
};

// --- Storage Service ---

// Upload file helper
export const uploadFile = async (filename, data, contentType) => {
    try {
        let file;
        if (data instanceof Blob || data instanceof File) {
            file = new AV.File(filename, data);
        } else if (typeof data === 'string' && data.startsWith('data:')) {
             // Handle Base64 Data URI
             file = new AV.File(filename, { base64: data.split(',')[1] });
        } else {
             // String content (like JSON)
             const blob = new Blob([data], { type: contentType });
             file = new AV.File(filename, blob);
        }
        const savedFile = await file.save();
        return savedFile.url();
    } catch (error) {
        console.error('文件上传失败:', error);
        throw error;
    }
};

export const createEmptyProject = async () => {
    const user = AV.User.current();
    if (!user) throw new Error('请先登录');

    const project = new Project();
    const name = `未命名项目 ${new Date().toLocaleString()}`;
    
    // Create minimal valid fabric JSON
    const emptyJson = JSON.stringify({ version: "5.3.0", objects: [] });
    const dataUrl = await uploadFile('data_init.json', emptyJson, 'application/json');

    project.set('name', name);
    project.set('canvasDataUrl', dataUrl);
    project.set('owner', user); // Explicitly set owner

    // Set ACL to be private
    const acl = new AV.ACL();
    acl.setPublicReadAccess(false);
    acl.setReadAccess(user, true);
    acl.setWriteAccess(user, true);
    project.setACL(acl);
    
    const saved = await project.save();
    return {
        id: saved.id,
        projectId: saved.id, // Align naming
        name: saved.get('name'),
        thumbnail: null,
        canvasDataUrl: saved.get('canvasDataUrl'),
        updatedAt: saved.updatedAt,
        isLocal: false
    };
};

export const saveProject = async (name, canvasData, thumbnailBase64, projectId = null) => {
    const user = AV.User.current();
    if (!user) throw new Error('请先登录');

    try {
        let project;
        
        // 1. Upload Thumbnail (Optional)
        let thumbUrl = null;
        if (thumbnailBase64) {
             thumbUrl = await uploadFile(`thumb_${Date.now()}.jpg`, thumbnailBase64);
        }
        
        // 2. Upload Canvas Data
        const jsonString = JSON.stringify(canvasData);
        const dataUrl = await uploadFile(`data_${Date.now()}.json`, jsonString, 'application/json');

        if (projectId) {
            project = AV.Object.createWithoutData('CanvasProject', projectId);
        } else {
            project = new Project();
            project.set('owner', user);
            const acl = new AV.ACL();
            acl.setPublicReadAccess(false);
            acl.setReadAccess(user, true);
            acl.setWriteAccess(user, true);
            project.setACL(acl);
        }

        if (name) project.set('name', name);
        if (thumbUrl) project.set('thumbnail', thumbUrl);
        project.set('canvasDataUrl', dataUrl);
        
        const saved = await project.save();
        console.log('云端同步成功');
        return {
            id: saved.id,
            projectId: saved.id,
            name: saved.get('name'),
            thumbnail: saved.get('thumbnail'),
            canvasDataUrl: saved.get('canvasDataUrl'),
            updatedAt: saved.updatedAt,
            isLocal: false
        };
    } catch (error) {
        console.error('云端保存失败:', error);
        throw error;
    }
};

export const getProjects = async () => {
    const user = AV.User.current();
    if (!user) return []; // Return empty if not logged in

    try {
        const query = new AV.Query('CanvasProject');
        // Removed explicit owner check: query.equalTo('owner', user);
        // Rely on ACL: User can only find objects they have read access to.
        
        query.descending('updatedAt');
        query.limit(100);
        const results = await query.find();
        
        return results.map(item => ({
            id: item.id,
            projectId: item.id,
            name: item.get('name'),
            thumbnail: item.get('thumbnail'),
            canvasDataUrl: item.get('canvasDataUrl'),
            updatedAt: item.updatedAt,
            isLocal: false
        }));
    } catch (error) {
        console.error('获取项目列表失败:', error);
        throw error;
    }
};

export const deleteProject = async (id) => {
    try {
        const todo = AV.Object.createWithoutData('CanvasProject', id);
        await todo.destroy();
        return true;
    } catch (error) {
        console.error('删除项目失败:', error);
        throw error;
    }
};

export const loadFullProject = async (project) => {
    try {
        if (project.canvasDataUrl) {
            const response = await fetch(project.canvasDataUrl);
            if (!response.ok) throw new Error('从云端下载数据失败');
            return await response.json();
        }
        return null;
    } catch (error) {
        console.error('加载项目数据失败:', error);
        throw error;
    }
};
