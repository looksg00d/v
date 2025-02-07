import { OpenAI } from 'openai';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { AlphaService } from './services/alphaService';
import { TelegramService } from './services/telegramService';
import * as dotenv from 'dotenv';
import * as fs from 'fs/promises';
import * as path from 'path';
import { AlphaInsight } from './types';

dotenv.config();

async function testAlphaGeneration() {
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

        // Получаем список всех постов
        const postsDir = path.join(process.cwd(), 'data', 'posts');
        const postFolders = await fs.readdir(postsDir);

        // Фильтруем служебные папки
        const validPosts = postFolders.filter(folder => {
            // Пропускаем папку images и другие служебные папки
            return !['images', 'temp', '.git'].includes(folder);
        });

        console.log(`\nНайдено постов: ${validPosts.length}`);

        // Обрабатываем каждый пост
        for (const postFolder of validPosts) {
            try {
                const contentPath = path.join(postsDir, postFolder, 'content.md');
                const metaPath = path.join(postsDir, postFolder, 'meta.json');

                const contentExists = await fileExists(contentPath);
                const metaExists = await fileExists(metaPath);

                if (!contentExists || !metaExists) {
                    console.log(`Пропуск ${postFolder} - не найдены необходимые файлы`);
                    continue;
                }

                // Читаем контент и мета-данные
                const postContent = await fs.readFile(contentPath, 'utf-8');
                const postMeta = JSON.parse(await fs.readFile(metaPath, 'utf-8'));

                // Проверяем наличие и валидность контента
                if (!postContent || postContent.trim().length < 10) {
                    console.log(`⚠️ Пропуск ${postFolder} - пустой или слишком короткий контент`);
                    continue;
                }

                // Проверяем, что контент не содержит только служебные символы или ссылки
                const cleanContent = postContent.replace(/(?:ссылка.*?(?:ТЫК|http[s]?:\/\/\S+)|t\.me\/\S+|https?:\/\/\S+)/gi, '').trim();
                if (cleanContent.length < 10) {
                    console.log(`⚠️ Пропуск ${postFolder} - контент содержит только ссылки`);
                    continue;
                }

                const post = {
                    content: postContent,
                    meta: postMeta,
                    images: postMeta.images || []
                };

                console.log(`\n=== Обработка поста ${postFolder} ===`);
                console.log('Контент поста:', postContent.substring(0, 100) + '...');
                
                // Генерируем инсайт
                console.log('Генерируем инсайт...');
                const generatedContent = await alphaService.generateAlpha(post);
                
                // Проверяем результат генерации
                if (!generatedContent || generatedContent.trim() === '') {
                    console.log('⚠️ Пропускаем создание инсайта - нет сгенерированного контента');
                    continue; // Пропускаем создание файла
                }

                // Создаем объект инсайта только если есть контент
                const alphaInsight: AlphaInsight = {
                    postId: post.meta.id,
                    date: post.meta.date,
                    content: generatedContent,
                    images: post.meta.images || [],
                    generatedAt: new Date().toISOString()
                };

                // Сохраняем инсайт
                await alphaService.saveAlphaInsights([alphaInsight]);
                console.log('✅ Инсайт успешно сохранен');

            } catch (error) {
                console.error(`❌ Ошибка при обработке поста ${postFolder}:`, error);
                continue;
            }
            
            await new Promise(resolve => setTimeout(resolve, 2000));
        }

        console.log('\n=== Обработка завершена ===');

    } catch (error) {
        console.error('Тест провален:', error);
        if (error instanceof Error) {
            console.error('Сообщение ошибки:', error.message);
            console.error('Stack trace:', error.stack);
        }
    }
}

// Вспомогательная функция для проверки существования файла
async function fileExists(path: string): Promise<boolean> {
    try {
        await fs.access(path);
        return true;
    } catch {
        return false;
    }
}

// Запускаем тест
testAlphaGeneration().catch(console.error); 