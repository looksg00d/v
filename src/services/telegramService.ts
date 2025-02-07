import * as fs from 'fs/promises';
import * as path from 'path';
import { AlphaInsight } from '../types';

interface PostMeta {
    id: number;
    date: string;
    images: string[];
    topic: string;
}

interface Post {
    meta: PostMeta;
    content: string;
}

export class TelegramService {
    private dataDir: string;
    private postsDir: string;
    private alphaInsightsDir: string;

    constructor() {
        this.dataDir = path.join(__dirname, '../../data');
        this.postsDir = path.join(this.dataDir, 'posts');
        this.alphaInsightsDir = path.join(this.dataDir, 'alpha_insights');
    }

    async fetchTopics(): Promise<string[]> {
        // Читаем инсайты вместо обычных постов
        const insights = await this.getAllAlphaInsights();
        
        // Берем первые 30-50 слов из каждого инсайта как тему
        return insights.map(insight => {
            const words = insight.content.split(' ').slice(0, 10).join(' ') + '...';
            return words;
        });
    }

    async getAllAlphaInsights(): Promise<AlphaInsight[]> {
        try {
            const files = await fs.readdir(this.alphaInsightsDir);
            const jsonFiles = files.filter(file => file.endsWith('.json'));

            const insights = await Promise.all(
                jsonFiles.map(async file => {
                    const filePath = path.join(this.alphaInsightsDir, file);
                    const content = await fs.readFile(filePath, 'utf-8');
                    return JSON.parse(content) as AlphaInsight;
                })
            );

            // Сортируем по дате, новые первыми
            return insights.sort((a, b) => 
                new Date(b.date).getTime() - new Date(a.date).getTime()
            );

        } catch (error) {
            console.error('Error reading alpha insights:', error);
            return [];
        }
    }

    async getPost(timestamp: string): Promise<Post | null> {
        try {
            const postDir = path.join(this.postsDir, timestamp);
            const [meta, content] = await Promise.all([
                fs.readFile(path.join(postDir, 'meta.json'), 'utf-8'),
                fs.readFile(path.join(postDir, 'content.md'), 'utf-8')
            ]);

            return {
                meta: JSON.parse(meta),
                content
            };
        } catch (error) {
            console.error(`Error reading post ${timestamp}:`, error);
            return null;
        }
    }

    async getAllPosts(): Promise<Post[]> {
        const postsDir = path.join(__dirname, '../../data/posts');
        const postFolders = await fs.readdir(postsDir);
        
        const posts = await Promise.all(
            postFolders.map(async folder => {
                const metaPath = path.join(postsDir, folder, 'meta.json');
                const contentPath = path.join(postsDir, folder, 'content.md');
                
                const meta = JSON.parse(await fs.readFile(metaPath, 'utf-8'));
                const content = await fs.readFile(contentPath, 'utf-8');
                
                return { meta, content };
            })
        );

        return posts;
    }

    async getImagePath(filename: string): Promise<string> {
        const imagePath = path.join(this.postsDir, filename);
        try {
            await fs.access(imagePath);
            return imagePath;
        } catch {
            throw new Error('Image not found');
        }
    }

    async updateTopics(): Promise<void> {
        try {
            console.log('Updating topics and posts...');
            // Логика запуска Python скрипта остается в updateTopics.ts
        } catch (error) {
            console.error('Error updating topics:', error);
        }
    }

    async getAlphaInsight(insightId: number): Promise<AlphaInsight | null> {
        try {
            const filePath = path.join(this.alphaInsightsDir, `${insightId}.json`);
            const content = await fs.readFile(filePath, 'utf-8');
            return JSON.parse(content) as AlphaInsight;
        } catch (error) {
            console.error(`Error reading alpha insight ${insightId}:`, error);
            return null;
        }
    }
} 