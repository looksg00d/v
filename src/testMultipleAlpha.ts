import { OpenAI } from 'openai';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { AlphaService } from './services/alphaService';
import { TelegramService } from './services/telegramService';
import * as dotenv from 'dotenv';
import * as fs from 'fs/promises';
import * as path from 'path';

dotenv.config();

async function testMultipleAlphaGeneration() {
    try {
        // Инициализация OpenAI с прокси
        const proxyUrl = `http://wqnfutnw:a57omrbixk0q@207.244.217.165:6712`;
        const openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
            httpAgent: new HttpsProxyAgent(proxyUrl)
        });

        // Создаем сервисы
        const alphaService = new AlphaService(openai);
        const telegramService = new TelegramService();

        // Получаем последние 3 поста
        console.log('Fetching posts...');
        const posts = await telegramService.getAllPosts();
        const recentPosts = posts.slice(0, 3); // Берем 3 последних поста

        if (recentPosts.length === 0) {
            console.error('No posts found!');
            return;
        }

        console.log(`\nFound ${recentPosts.length} posts to process`);

        // Обрабатываем каждый пост с задержкой
        for (let i = 0; i < recentPosts.length; i++) {
            const post = recentPosts[i];
            console.log(`\nProcessing post ${i + 1}/${recentPosts.length}:`);
            console.log('ID:', post.meta.id);
            console.log('Date:', post.meta.date);
            console.log('Content:', post.content);

            // Добавляем задержку между запросами
            if (i > 0) {
                console.log('\nWaiting 5 seconds before next request...');
                await new Promise(resolve => setTimeout(resolve, 5000));
            }

            // Генерируем альфа
            console.log('\nGenerating alpha...');
            const alpha = await alphaService.generateAlpha(post);

            console.log('\nGenerated Alpha:');
            console.log(alpha);

            // Сохраняем результат
            await alphaService.saveAlphaInsights([{
                postId: post.meta.id,
                date: post.meta.date,
                content: alpha
            }]);

            console.log('\nAlpha insight saved successfully!');

            // Проверяем сохраненный файл
            const alphaInsightsDir = path.join(process.cwd(), 'data', 'alpha_insights');
            const filePath = path.join(alphaInsightsDir, `${post.meta.id}.json`);
            
            console.log('\nVerifying saved file...');
            const savedContent = await fs.readFile(filePath, 'utf-8');
            const savedInsight = JSON.parse(savedContent);
            
            console.log('Saved insight:');
            console.log('- Post ID:', savedInsight.postId);
            console.log('- Date:', savedInsight.date);
            console.log('- Generated At:', savedInsight.generatedAt);
            console.log('- Content preview:', savedInsight.content.substring(0, 100) + '...');
        }

        console.log('\n=== All posts processed successfully! ===');

    } catch (error) {
        console.error('Test failed:', error);
        if (error instanceof Error) {
            console.error('Error message:', error.message);
            console.error('Stack trace:', error.stack);
        }
    }
}

// Запускаем тест
testMultipleAlphaGeneration(); 