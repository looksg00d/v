import * as fs from 'fs/promises';
import * as path from 'path';
import { AlphaInsight } from './types';

async function updateInsightImages() {
    try {
        const alphaDir = path.join(process.cwd(), 'data', 'alpha_insights');
        const postsDir = path.join(process.cwd(), 'data', 'posts');

        const files = await fs.readdir(alphaDir);
        console.log(`\nНайдено ${files.length} инсайтов`);

        for (const file of files) {
            if (!file.endsWith('.json')) continue;

            try {
                // Читаем инсайт
                const insightPath = path.join(alphaDir, file);
                const insight: AlphaInsight = JSON.parse(
                    await fs.readFile(insightPath, 'utf-8')
                );

                // Ищем meta.json
                const postFolders = await fs.readdir(postsDir);
                const postFolder = postFolders.find(folder => {
                    const metaPath = path.join(postsDir, folder, 'meta.json');
                    try {
                        const metaContent = require(metaPath);
                        return metaContent.id === insight.postId;
                    } catch {
                        return false;
                    }
                });

                if (postFolder) {
                    // Обновляем images из meta.json
                    const metaPath = path.join(postsDir, postFolder, 'meta.json');
                    const metaContent = require(metaPath);
                    
                    insight.images = metaContent.images || [];

                    // Сохраняем обновленный инсайт
                    await fs.writeFile(
                        insightPath,
                        JSON.stringify(insight, null, 2),
                        'utf-8'
                    );

                    console.log(`✅ Обновлен инсайт ${insight.postId}`);
                } else {
                    console.log(`⚠️ Не найден meta.json для инсайта ${insight.postId}`);
                }

            } catch (error) {
                console.error(`❌ Ошибка при обработке ${file}:`, error);
            }
        }

        console.log('\n=== Обновление завершено ===');

    } catch (error) {
        console.error('Ошибка:', error);
    }
}

updateInsightImages().catch(console.error); 