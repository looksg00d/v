export interface Character {
    name: string;
    username: string;
    type: string;
    system: string;
    bio?: string[];
    formatPrompt?: string;
    style?: {
        all?: string[];
        chat?: string[];
        post?: string[];
        analysis?: string[];
    };
    topics?: string[];
}

export interface MessageExample {
    user: string;
    assistant: string;
}

export interface Message {
    id: string;
    roomId: string;
    speaker: string;
    content: string;
    timestamp: Date;
    isQuestion: boolean;
    topic: string;
} 