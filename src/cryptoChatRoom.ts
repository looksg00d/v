import { OpenAI } from "openai";
import { HttpsProxyAgent } from 'https-proxy-agent';
import * as dotenv from 'dotenv';
import * as readline from 'readline';
import { v4 as uuidv4 } from 'uuid';
import { MessageService } from './services/messageService';
import { CharacterService } from './services/chat/characterService';
import { ResponseGeneratorService } from './services/chat/responseGeneratorService';
import { DiscussionService } from './services/chat/discussionService';
import { ValidationService } from './services/chat/validationService';
import { SimilarityService } from './services/chat/similarityService';
import { TopicService } from './services/chat/topicService';
import { DataFetchService } from './services/dataFetchService';
import { TelegramService } from './services/telegramService';
import { cryptoDegen } from "./characters";

dotenv.config();
// Файл для теста работы чата между иишками
// Перемещаем интерфейс на уровень модуля
interface MessageExample {
    user: string;
    assistant: string;
}

interface CharacterData {
    system: string;
    messageExamples: MessageExample[];
    traits: string[];
}

export class CryptoChatRoom {
    private readonly AUTO_REPLY_CHANCE = 0.8;
    private readonly MAX_AUTO_REPLIES = 2;
    private rl: readline.Interface;
    private services: {
        message: MessageService;
        character: CharacterService;
        response: ResponseGeneratorService;
        discussion: DiscussionService;
        validation: ValidationService;
        similarity: SimilarityService;
        topic: TopicService;
        telegram: TelegramService;
    };

    constructor() {
        // Сначала инициализируем базовые сервисы
        const proxyUrl = `http://wqnfutnw:a57omrbixk0q@207.244.217.165:6712`;
        const openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
            httpAgent: new HttpsProxyAgent(proxyUrl)
        });

        const dataFetchService = new DataFetchService();
        const telegramService = new TelegramService();
        
        // Инициализируем character и response перед discussion
        const characterService = new CharacterService();
        const responseGenerator = new ResponseGeneratorService(openai, dataFetchService);

        // Теперь можем инициализировать все сервисы
        this.services = {
            message: new MessageService(),
            character: characterService,
            response: responseGenerator,
            discussion: new DiscussionService(
                characterService,  // Используем уже созданный сервис
                responseGenerator  // Используем уже созданный сервис
            ),
            validation: new ValidationService(openai),
            similarity: new SimilarityService(openai),
            topic: new TopicService(telegramService),
            telegram: telegramService
        };

        this.rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        this.initializeRoom().catch(console.error);
    }

    private async initializeRoom(): Promise<void> {
        try {
            await this.services.message.createRoom(process.env.NODE_ENV === 'development' 
                ? '11111111-1111-1111-1111-111111111111' 
                : uuidv4());
        } catch (error) {
            console.error("Не удалось создать комнату:", error);
            throw error;
        }
    }

    async startInteractiveChat(): Promise<void> {
        try {
            console.log("\n=== Интерактивный Крипто Чат ===\n");
            
            const topics = await this.services.topic.getTopicsFromTelegram();
            await this.services.topic.displayTopics(topics);
            
            const topic = await this.askForTopic(topics);
            if (!topic) {
                console.log("\nЧат завершен");
                return;
            }

            // Запускаем дискуссию
            await this.services.discussion.simulateDiscussion(topic);

        } catch (error) {
            console.error("Произошла ошибка:", error);
        } finally {
            this.rl.close();
        }
    }

    private async askForTopic(topics: string[]): Promise<string> {
        return new Promise((resolve) => {
            this.rl.question("Выбор: ", (choice) => {
                if (choice === '0') {
                    resolve('');
                    return;
                }

                const numChoice = parseInt(choice);
                if (!isNaN(numChoice) && numChoice > 0 && numChoice <= topics.length) {
                    resolve(topics[numChoice - 1]);
                } else {
                    resolve(choice);
                }
            });
        });
    }

    async simulateInsightResponse(insightId: number): Promise<void> {
        try {
            // Получаем инсайт
            const insight = await this.services.telegram.getAlphaInsight(insightId);
            if (!insight) {
                console.error('Инсайт не найден');
                return;
            }

            // Используем chainAmbassador для ответа на инсайт
            await this.services.discussion.simulateInsightDiscussion(
                insight,
                cryptoDegen // или любой другой персонаж
            );

        } catch (error) {
            console.error('Ошибка при симуляции ответа на инсайт:', error);
        }
    }
} 