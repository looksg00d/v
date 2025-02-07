from pyrogram import Client
import asyncio
import os
import json
from datetime import datetime
import argparse
import sys

# Данные для авторизации Telegram
api_id = "21066357"
api_hash = "4e8e06cf630cf8957d3b2c79bde6df50"

# Пути для сохранения данных
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(os.path.dirname(BASE_DIR), 'data')  # путь к crypto-chat/data
POSTS_DIR = os.path.join(DATA_DIR, 'posts')
IMAGES_DIR = os.path.join(POSTS_DIR, 'images')
TOPICS_FILE = os.path.join(DATA_DIR, 'topics.json')

# Создаем необходимые директории
for dir_path in [DATA_DIR, POSTS_DIR, IMAGES_DIR]:
    if not os.path.exists(dir_path):
        os.makedirs(dir_path)

async def extract_topic(text: str) -> str:
    """Извлекает тему из текста поста"""
    first_line = text.split('\n')[0]
    words = first_line.split()
    if len(words) > 5:
        return ' '.join(words[:5]) + '...'
    return first_line

async def save_post(message, timestamp: str, app):
    """Сохраняет отдельный пост"""
    post_dir = os.path.join(POSTS_DIR, timestamp)
    os.makedirs(post_dir, exist_ok=True)

    # Сохраняем метаданные
    meta = {
        'id': message.id,
        'date': message.date.strftime("%Y-%m-%d %H:%M:%S"),
        'images': [],
        'topic': await extract_topic(message.text or message.caption or "")
    }

    # Сохраняем изображения
    if message.photo:
        image_path = f"images/{timestamp}.jpg"
        await app.download_media(message.photo, os.path.join(POSTS_DIR, image_path))
        meta['images'].append(image_path)

    # Записываем метаданные
    with open(os.path.join(post_dir, 'meta.json'), 'w', encoding='utf-8') as f:
        json.dump(meta, f, ensure_ascii=False, indent=2)

    # Получаем и форматируем контент
    content = message.text or message.caption or "Нет текста"
    
    # Заменяем специальные символы HTML на их текстовые эквиваленты
    content = content.replace('&', '&amp;')
    content = content.replace('<', '&lt;')
    content = content.replace('>', '&gt;')
    
    # Сохраняем переносы строк
    content = content.replace('\n', '\n\n')  # Добавляем дополнительный перенос для markdown
    
    # Записываем контент
    with open(os.path.join(post_dir, 'content.md'), 'w', encoding='utf-8') as f:
        f.write(content)

    return meta['topic']

async def download_posts(channel_username: str, limit: int = 10):
    try:
        # Создаем клиент с сохранением сессии
        async with Client(
            "my_account",  # Имя сессии
            api_id=api_id,
            api_hash=api_hash,
            workdir=BASE_DIR  # Сохраняем файл сессии в папке скриптов
        ) as app:
            print(f"Подключились к Telegram")
            topics = []
            
            # Получаем последние сообщения
            async for message in app.get_chat_history(channel_username, limit=limit):
                timestamp = str(message.date.timestamp()).split('.')[0]
                topic = await save_post(message, timestamp, app)
                if topic:
                    topics.append(topic)

            # Сохраняем темы
            with open(TOPICS_FILE, 'w', encoding='utf-8') as f:
                json.dump(topics, f, ensure_ascii=False, indent=2)

            print(f"Сохранено {len(topics)} постов")

    except Exception as e:
        print(f"Произошла ошибка: {e}")
        raise e

async def main():
    # Добавляем парсинг аргументов
    parser = argparse.ArgumentParser()
    parser.add_argument('--limit', type=int, default=10)
    args = parser.parse_args()

    print(f"Начинаем загрузку постов (лимит: {args.limit})...")
    
    channel_username = "@WEB3_AGGREGATOR"
    try:
        await download_posts(channel_username, args.limit)
        print("Загрузка завершена успешно")
        sys.exit(0)
    except Exception as e:
        print(f"Ошибка при загрузке постов: {e}")
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(main())