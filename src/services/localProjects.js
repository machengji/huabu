/**
 * Local Project Management Service
 * Uses localStorage to store project data.
 */
import { saveProject as bmobSaveProject } from './bmob';

const STORAGE_KEY = 'poster_studio_local_projects';

export const getLocalProjects = () => {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
};

export const saveLocalProject = (name, canvasData, thumbnail) => {
    const projects = getLocalProjects();
    const newProject = {
        objectId: Date.now().toString(), // Use timestamp as ID for local
        name,
        canvasData: typeof canvasData === 'string' ? canvasData : JSON.stringify(canvasData),
        thumbnail,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isLocal: true
    };
    projects.unshift(newProject);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
    return newProject;
};

export const deleteLocalProject = (id) => {
    const projects = getLocalProjects();
    const filtered = projects.filter(p => p.objectId !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
};

/**
 * Placeholder for future Cloud Sync
 * This function can be called to sync local projects to Bmob.
 */
export const syncToCloud = async (project) => {
    console.log('Cloud sync started for project:', project.name);
    try {
        // This is where you would call the Bmob service
        // await bmobSaveProject(project.name, project.canvasData, project.thumbnail);
        console.log('Cloud sync successful (simulated)');
    } catch (error) {
        console.error('Cloud sync failed:', error);
        throw error;
    }
};
