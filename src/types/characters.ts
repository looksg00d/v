import { Character } from './index';

export interface AlphaCollectorCharacter extends Character {
    type: 'alpha_collector';
    prompt: string;
    formatPrompt: string;
} 