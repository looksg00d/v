import { CryptoChatRoom } from './cryptoChatRoom';
import * as dotenv from 'dotenv';

// Загружаем переменные окружения
dotenv.config();

// Обработка Ctrl+C для корректного завершения
process.on('SIGINT', () => {
    console.log("\nЧат завершен");
    process.exit(0);
});

// Обработка необработанных ошибок
process.on('unhandledRejection', (error) => {
    console.error("\nНеобработанная ошибка:", error);
    process.exit(1);
});

// Запуск чата
try {
    const chatRoom = new CryptoChatRoom();
    chatRoom.startInteractiveChat().catch((error: Error) => {
        console.error('Ошибка в чате:', error);
        process.exit(1);
    });
} catch (error) {
    console.error("\nОшибка при инициализации чата:", error);
    process.exit(1);
} 