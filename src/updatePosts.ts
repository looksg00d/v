import * as fs from 'fs/promises';
import * as path from 'path';
import { AlphaInsight } from './types';

async function updatePostsFromInsights() {
    try {
        // Пути к директориям
        const alphaDir = path.join(process.cwd(), 'data', 'alpha_insights');
        const postsDir = path.join(process.cwd(), 'data', 'posts');

        // Читаем все альфа-инсайты
        const files = await fs.readdir(alphaDir);
        console.log(`\nНайдено ${files.length} инсайтов`);

        for (const file of files) {
            if (!file.endsWith('.json')) continue;

            try {
                // Читаем инсайт
                const insightPath = path.join(alphaDir, file);
                const insightContent = await fs.readFile(insightPath, 'utf-8');
                const insight: AlphaInsight = JSON.parse(insightContent);

                // Находим соответствующую папку поста
                const postFolders = await fs.readdir(postsDir);
                const postFolder = postFolders.find(folder => {
                    const meta = path.join(postsDir, folder, 'meta.json');
                    try {
                        const metaContent = require(meta);
                        return metaContent.id === insight.postId;
                    } catch {
                        return false;
                    }
                });

                if (!postFolder) {
                    console.log(`⚠️ Не найдена папка для поста ${insight.postId}`);
                    continue;
                }

                // Обновляем content.md
                const contentPath = path.join(postsDir, postFolder, 'content.md');
                await fs.writeFile(contentPath, insight.content, 'utf-8');

                console.log(`✅ Обновлен пост ${insight.postId}`);

            } catch (error) {
                console.error(`❌ Ошибка при обработке ${file}:`, error);
            }
        }

        console.log('\n=== Обновление завершено ===');

    } catch (error) {
        console.error('Ошибка:', error);
    }
}

// Запускаем обновление
updatePostsFromInsights().catch(console.error); 