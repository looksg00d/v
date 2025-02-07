export interface TelegramConfig {
    apiId: string;
    apiHash: string;
    channelUsername: string;
}

export interface TelegramMessage {
    text: string;
    date: Date;
    id: number;
} 