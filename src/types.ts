export enum ModelProviderName {
    LLAMALOCAL = 'llama_local',
    OPENAI = 'openai'
}

export interface Character {
    name: string;
    username: string;
    modelProvider: ModelProviderName;
    settings: {
        voice: {
            model: string;
        };
    };
    system: string;
    bio: string[];
    lore?: string[];
    messageExamples?: any[];
    postExamples?: string[];
    topics?: string[];
    style?: {
        all: string[];
        chat: string[];
        post: string[];
    };
    adjectives: string[];
}

export interface Memory {
    id: string;
    type: string;
    createdAt: Date;
    content: string | Record<string, any>;
    embedding: number[];
    userId?: string;
    agentId?: string;
    roomId?: string;
    isUnique?: boolean;
    similarity: number;
}

export interface OpenAIEmbeddingResponse {
    data: Array<{
        embedding: number[];
        index: number;
        object: string;
    }>;
    model: string;
    object: string;
    usage: {
        prompt_tokens: number;
        total_tokens: number;
    };
}

export interface Message {
    id?: string;
    userName: string;
    content: string;
    roomId: string;
    createdAt?: Date;
}

export interface AlphaInsight {
    postId: string | number;
    date: string;
    content: string;
    images?: string[];
    generatedAt?: string;
} 