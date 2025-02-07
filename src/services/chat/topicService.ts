import { TelegramService } from "../telegramService";
import * as fs from 'fs/promises';

export class TopicService {
    constructor(private telegramService: TelegramService) {}

    async getTopicsFromTelegram(): Promise<string[]> {
        try {
            return await this.telegramService.fetchTopics();
        } catch (error) {
            console.error('Error fetching topics:', error);
            return [];
        }
    }

    async displayTopics(topics: string[]): Promise<void> {
        if (topics.length > 0) {
            console.log("Доступные темы:");
            topics.forEach((topic, index) => {
                console.log(`${index + 1}. ${topic}`);
            });
            console.log("\nВыберите номер темы или введите свою (0 для выхода):");
        } else {
            console.log("Темы недоступны. Введите свою тему или '0' для выхода\n");
        }
    }
} 