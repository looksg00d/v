import express, { Request, Response } from 'express';
import cors from 'cors';
import { TelegramService } from '../services/telegramService';
import { CryptoChatRoom } from '../cryptoChatRoom';
import path from 'path';
import { AlphaService } from '../services/alphaService';
import { OpenAI } from 'openai';
import { HttpsProxyAgent } from 'https-proxy-agent';
import fs from 'fs/promises';

export class WebInterface {
    private app: express.Application;
    private telegramService: TelegramService;
    private chatRoom: CryptoChatRoom;
    private openai: OpenAI;

    constructor() {
        this.app = express();
        
        // Middleware
        this.app.use(express.json());
        this.app.use(cors());
        
        this.telegramService = new TelegramService();
        this.chatRoom = new CryptoChatRoom();

        // Формируем URL прокси с аутентификацией
        const proxyUrl = `http://wqnfutnw:a57omrbixk0q@207.244.217.165:6712`;
        
        this.openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
            httpAgent: new HttpsProxyAgent(proxyUrl)
        });
        
        this.setupRoutes();
    }

    private setupRoutes() {
        // API для работы с постами
        this.app.get('/api/posts/fetch', async (req: Request, res: Response) => {
            try {
                const limit = parseInt(req.query.limit as string) || 10;
                const pythonScript = path.join(__dirname, '../../../scripts/telegram_parser.py');
                const { spawn } = require('child_process');
                
                const process = spawn('python', [pythonScript, '--limit', limit.toString()]);
                
                process.on('close', async (code: number) => {
                    if (code === 0) {
                        res.json({ success: true, message: 'Posts fetched successfully' });
                    } else {
                        res.status(500).json({ error: 'Failed to fetch posts' });
                    }
                });
            } catch (error) {
                res.status(500).json({ error: 'Failed to fetch posts' });
            }
        });

        // Получить список всех постов
        this.app.get('/api/posts', async (req: Request, res: Response) => {
            try {
                const posts = await this.telegramService.getAllPosts();
                res.json(posts);
            } catch (error) {
                res.status(500).json({ error: 'Failed to get posts' });
            }
        });

        // Получить конкретный пост
        this.app.get('/api/posts/:timestamp', async (req: Request, res: Response) => {
            try {
                const post = await this.telegramService.getPost(req.params.timestamp);
                if (post) {
                    res.json(post);
                } else {
                    res.status(404).json({ error: 'Post not found' });
                }
            } catch (error) {
                res.status(500).json({ error: 'Failed to get post' });
            }
        });

        // Получить изображение
        this.app.get('/api/images/:filename', async (req: Request, res: Response) => {
            try {
                const imagePath = await this.telegramService.getImagePath(req.params.filename);
                res.sendFile(imagePath);
            } catch (error) {
                res.status(404).json({ error: 'Image not found' });
            }
        });

        // Получить альфа-инсайты
        this.app.get('/api/alpha', async (req: Request, res: Response) => {
            try {
                const limit = parseInt(req.query.limit as string) || 5;
                const alphaService = new AlphaService(this.openai);
                const insights = await alphaService.processLatestPosts(limit);
                res.json(insights);
            } catch (error) {
                res.status(500).json({ error: 'Failed to generate alpha insights' });
            }
        });

        // Сгенерировать альфа для всех постов
        this.app.post('/api/alpha/generate-all', async (req: Request, res: Response) => {
            try {
                console.log('\n=== Starting Alpha Generation for All Posts ===');
                const posts = await this.telegramService.getAllPosts();
                console.log(`Found ${posts.length} posts to analyze`);
                
                const alphaService = new AlphaService(this.openai);
                
                // Добавляем задержку между запросами
                const insights = await Promise.all(
                    posts.map(async (post, index) => {
                        try {
                            // Добавляем задержку между запросами
                            await new Promise(resolve => setTimeout(resolve, index * 1000));
                            
                            console.log(`\nProcessing post ${post.meta.id} (${index + 1}/${posts.length})`);
                            console.log('Post date:', post.meta.date);
                            console.log('Content preview:', post.content.substring(0, 100) + '...');
                            
                            const content = await alphaService.generateAlpha(post);
                            
                            if (!content || content.trim() === '') {
                                throw new Error('Empty content generated');
                            }
                            
                            console.log('Successfully generated alpha');
                            console.log('Content preview:', content.substring(0, 100) + '...');
                            
                            return {
                                postId: post.meta.id,
                                date: post.meta.date,
                                content,
                            };
                        } catch (error) {
                            console.error(`\nFailed to generate alpha for post ${post.meta.id}:`);
                            console.error('Error type:', error instanceof Error ? error.constructor.name : typeof error);
                            console.error('Error message:', error instanceof Error ? error.message : String(error));
                            console.error('Stack trace:', error instanceof Error ? error.stack : 'No stack trace available');
                            return null;
                        }
                    })
                );

                const validInsights = insights.filter((insight): insight is NonNullable<typeof insight> => {
                    if (!insight) return false;
                    if (typeof insight.content !== 'string') return false;
                    return insight.content.trim() !== '';
                });
                
                console.log(`\n=== Generation Summary ===`);
                console.log(`Total posts: ${posts.length}`);
                console.log(`Successfully processed: ${validInsights.length}`);
                console.log(`Failed: ${posts.length - validInsights.length}`);

                if (validInsights.length > 0) {
                    await alphaService.saveAlphaInsights(validInsights);
                    console.log('All insights saved successfully');
                } else {
                    console.warn('No valid insights were generated!');
                }
                
                res.json({ 
                    success: true, 
                    count: validInsights.length,
                    totalPosts: posts.length,
                    failedPosts: posts.length - validInsights.length,
                    insights: validInsights.map(i => ({
                        postId: i.postId,
                        date: i.date,
                        contentPreview: i.content.substring(0, 100) + '...'
                    }))
                });
            } catch (error) {
                console.error('\n=== Fatal Error in /api/alpha/generate-all ===');
                console.error('Error type:', error instanceof Error ? error.constructor.name : typeof error);
                console.error('Error message:', error instanceof Error ? error.message : String(error));
                console.error('Stack trace:', error instanceof Error ? error.stack : 'No stack trace available');
                res.status(500).json({ 
                    error: 'Failed to generate alpha insights',
                    details: error instanceof Error ? error.message : String(error)
                });
            }
        });

        // Получить все альфа-инсайты
        this.app.get('/api/alpha/all', async (req: Request, res: Response) => {
            try {
                const alphaService = new AlphaService(this.openai);
                const insights = await alphaService.getAllAlphaInsights();
                res.json(insights);
            } catch (error) {
                res.status(500).json({ error: 'Failed to get alpha insights' });
            }
        });

        // Генерировать альфа для конкретного поста
        this.app.post('/api/alpha/generate', async (req: Request, res: Response) => {
            try {
                const { postId } = req.body;
                if (!postId) {
                    return res.status(400).json({ error: 'Post ID is required' });
                }

                const posts = await this.telegramService.getAllPosts();
                const post = posts.find(p => p.meta.id === postId);
                
                if (!post) {
                    return res.status(404).json({ error: 'Post not found' });
                }

                const alphaService = new AlphaService(this.openai);
                const alpha = await alphaService.generateAlpha(post);
                
                await alphaService.saveAlphaInsights([{
                    postId: post.meta.id,
                    date: post.meta.date,
                    content: alpha
                }]);

                res.json({
                    success: true,
                    insight: {
                        postId: post.meta.id,
                        date: post.meta.date,
                        content: alpha
                    }
                });

            } catch (error) {
                console.error('Error generating alpha:', error);
                res.status(500).json({ 
                    error: 'Failed to generate alpha',
                    details: error instanceof Error ? error.message : String(error)
                });
            }
        });

        // Получить все альфа-инсайты с пагинацией и сортировкой
        this.app.get('/api/alpha/insights', async (req: Request, res: Response) => {
            try {
                const page = parseInt(req.query.page as string) || 1;
                const limit = parseInt(req.query.limit as string) || 10;
                const sortBy = (req.query.sortBy as string) || 'date';
                const order = (req.query.order as string) || 'desc';

                const alphaService = new AlphaService(this.openai);
                const allInsights = await alphaService.getAllAlphaInsights();

                // Сортировка
                const sortedInsights = allInsights.sort((a, b) => {
                    if (sortBy === 'date') {
                        return order === 'desc' 
                            ? new Date(b.date).getTime() - new Date(a.date).getTime()
                            : new Date(a.date).getTime() - new Date(b.date).getTime();
                    }
                    return 0;
                });

                // Пагинация
                const start = (page - 1) * limit;
                const paginatedInsights = sortedInsights.slice(start, start + limit);

                res.json({
                    success: true,
                    page,
                    limit,
                    total: allInsights.length,
                    totalPages: Math.ceil(allInsights.length / limit),
                    insights: paginatedInsights
                });

            } catch (error) {
                console.error('Error fetching insights:', error);
                res.status(500).json({ 
                    error: 'Failed to fetch insights',
                    details: error instanceof Error ? error.message : String(error)
                });
            }
        });

        // Удалить альфа-инсайт
        this.app.delete('/api/alpha/insights/:postId', async (req: Request, res: Response) => {
            try {
                const postId = req.params.postId;
                const alphaService = new AlphaService(this.openai);
                const filePath = path.join(process.cwd(), 'data', 'alpha_insights', `${postId}.json`);
                
                await fs.unlink(filePath);
                
                res.json({ success: true, message: 'Insight deleted successfully' });
            } catch (error) {
                res.status(500).json({ 
                    error: 'Failed to delete insight',
                    details: error instanceof Error ? error.message : String(error)
                });
            }
        });

        // Отметить инсайт как использованный и удалить
        this.app.post('/api/alpha/insights/:postId/use', async (req: Request, res: Response) => {
            try {
                const postId = req.params.postId;
                const alphaService = new AlphaService(this.openai);
                
                // Получаем инсайт перед удалением
                const filePath = path.join(process.cwd(), 'data', 'alpha_insights', `${postId}.json`);
                const insightData = await fs.readFile(filePath, 'utf-8');
                const insight = JSON.parse(insightData);
                
                // Сохраняем в архив использованных инсайтов
                const usedInsightsDir = path.join(process.cwd(), 'data', 'used_insights');
                await fs.mkdir(usedInsightsDir, { recursive: true });
                
                await fs.writeFile(
                    path.join(usedInsightsDir, `${postId}.json`),
                    JSON.stringify({
                        ...insight,
                        usedAt: new Date().toISOString()
                    }, null, 2),
                    'utf-8'
                );
                
                // Удаляем из активных инсайтов
                await fs.unlink(filePath);
                
                res.json({ 
                    success: true, 
                    message: 'Insight marked as used and archived'
                });
            } catch (error) {
                res.status(500).json({ 
                    error: 'Failed to process insight',
                    details: error instanceof Error ? error.message : String(error)
                });
            }
        });

        // Получить список использованных инсайтов
        this.app.get('/api/alpha/insights/used', async (req: Request, res: Response) => {
            try {
                const usedInsightsDir = path.join(process.cwd(), 'data', 'used_insights');
                await fs.mkdir(usedInsightsDir, { recursive: true });
                
                const files = await fs.readdir(usedInsightsDir);
                const insights = await Promise.all(
                    files.map(async (file) => {
                        const content = await fs.readFile(
                            path.join(usedInsightsDir, file),
                            'utf-8'
                        );
                        return JSON.parse(content);
                    })
                );
                
                res.json(insights.sort((a, b) => 
                    new Date(b.usedAt).getTime() - new Date(a.usedAt).getTime()
                ));
            } catch (error) {
                res.status(500).json({ 
                    error: 'Failed to fetch used insights',
                    details: error instanceof Error ? error.message : String(error)
                });
            }
        });

        // Статический HTML интерфейс
        this.app.get('/', (req: Request, res: Response) => {
            res.sendFile(path.join(__dirname, '../../../../server/public/index.html'));
        });

        // Статические файлы
        this.app.use(express.static('public'));
    }

    public start(port: number = 3000) {
        this.app.listen(port, () => {
            console.log(`Web interface running at http://localhost:${port}`);
        });
    }
} 