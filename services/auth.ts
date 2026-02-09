
import { User, GalleryItem, ProjectState } from "../types";

const USERS_KEY = 'agentic_users_db';
const SESSION_KEY = 'agentic_session';
const GALLERY_KEY = 'agentic_gallery';

interface UserRecord extends User {
    password?: string; // In a real app, this would be hashed
}

export const AuthService = {
    signup: async (email: string, password: string, name: string): Promise<User> => {
        await new Promise(r => setTimeout(r, 800)); // Simulate net lag
        const usersRaw = localStorage.getItem(USERS_KEY);
        const users: UserRecord[] = usersRaw ? JSON.parse(usersRaw) : [];

        if (users.find(u => u.email === email)) {
            throw new Error("User already exists with this email");
        }

        const newUser: UserRecord = {
            id: crypto.randomUUID(),
            email,
            password, // Storing plain text for demo only
            name,
            avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${email}`
        };

        users.push(newUser);
        localStorage.setItem(USERS_KEY, JSON.stringify(users));
        
        // Auto login
        const { password: _, ...safeUser } = newUser;
        localStorage.setItem(SESSION_KEY, JSON.stringify(safeUser));
        return safeUser;
    },

    login: async (email: string, password: string): Promise<User> => {
        await new Promise(r => setTimeout(r, 800));
        const usersRaw = localStorage.getItem(USERS_KEY);
        const users: UserRecord[] = usersRaw ? JSON.parse(usersRaw) : [];
        
        const user = users.find(u => u.email === email && u.password === password);
        
        if (!user) {
            throw new Error("Invalid email or password");
        }
        
        const { password: _, ...safeUser } = user;
        localStorage.setItem(SESSION_KEY, JSON.stringify(safeUser));
        return safeUser;
    },

    logout: () => {
        localStorage.removeItem(SESSION_KEY);
    },

    getCurrentUser: (): User | null => {
        const raw = localStorage.getItem(SESSION_KEY);
        return raw ? JSON.parse(raw) : null;
    },

    saveProject: async (user: User, state: ProjectState): Promise<void> => {
        await new Promise(r => setTimeout(r, 600));
        const galleryRaw = localStorage.getItem(GALLERY_KEY);
        const gallery: GalleryItem[] = galleryRaw ? JSON.parse(galleryRaw) : [];
        
        // Don't save if empty scenes
        if (!state.scenes || state.scenes.length === 0) return;

        const newItem: GalleryItem = {
            id: state.id || crypto.randomUUID(),
            userId: user.id,
            topic: state.topic,
            thumbnail: state.scenes[0]?.imageUrl1 || state.scenes[0]?.previewUrl || 'https://via.placeholder.com/300x200?text=No+Preview',
            timestamp: Date.now(),
            durationLabel: state.duration,
            sceneCount: state.scenes.length,
            state: { ...state, id: state.id }
        };

        // Update if exists (by ID), else add
        const existingIdx = gallery.findIndex(g => g.id === newItem.id);
        if (existingIdx > -1) {
            gallery[existingIdx] = newItem;
        } else {
            gallery.unshift(newItem);
        }
        
        localStorage.setItem(GALLERY_KEY, JSON.stringify(gallery));
    },

    getUserGallery: async (userId: string): Promise<GalleryItem[]> => {
        await new Promise(r => setTimeout(r, 400));
        const galleryRaw = localStorage.getItem(GALLERY_KEY);
        const gallery: GalleryItem[] = galleryRaw ? JSON.parse(galleryRaw) : [];
        return gallery.filter(g => g.userId === userId).sort((a, b) => b.timestamp - a.timestamp);
    }
};
