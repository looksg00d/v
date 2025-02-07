import { Character } from "../../types";
import { cryptoDegen, cryptoOG, mevDev, retroDropper, chatGrinder, defiDev, cryptoGirl } from "../../characters";

export class CharacterService {
    private characters: Character[];
    private reactions = ['🚀', '💎', '🤔', '👀', '😅', '🤝', '💪', '🎯', '🔥', '⚡️'];

    constructor() {
        this.characters = [
            cryptoDegen,
            cryptoOG,
            mevDev,
            retroDropper,
            chatGrinder,
            defiDev,
            cryptoGirl
        ];
    }

    getRandomCharacter(): Character {
        return this.characters[Math.floor(Math.random() * this.characters.length)];
    }

    getAvailableCharacters(exclude?: Character): Character[] {
        return exclude ? 
            this.characters.filter(char => char !== exclude) : 
            [...this.characters];
    }

    getRandomReaction(): string {
        return this.reactions[Math.floor(Math.random() * this.reactions.length)];
    }

    shuffleCharacters(): Character[] {
        return this.characters
            .map(value => ({ value, sort: Math.random() }))
            .sort((a, b) => a.sort - b.sort)
            .map(({ value }) => value);
    }
} 