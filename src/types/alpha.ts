import { Character } from './index';

export interface AlphaCharacter extends Character {
    system: string;
    formatPrompt: string;
    style: {
        all: string[];
        analysis: string[];
    };
    topics: string[];
}

export interface Post {
    meta: {
        id: number;
        date: string;
        images: string[];
        topic: string;
    };
    content: string;
} 