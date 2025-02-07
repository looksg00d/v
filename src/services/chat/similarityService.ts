import { OpenAI } from "openai";
import { Message } from "../../types";

export class SimilarityService {
    constructor(private openai: OpenAI) {}

    async checkSimilarity(newResponse: string, recentMessages: Message[]): Promise<number> {
        const similarityPrompt = `Compare these messages and return similarity score (0.0 to 1.0):
        Message 1: "${newResponse}"
        Message 2: "${recentMessages.map(m => m.content).join('" "')}"\n
        Return only the number.`;

        const similarity = await this.openai.chat.completions.create({
            messages: [{ role: "user", content: similarityPrompt }],
            model: "gpt-3.5-turbo",
            temperature: 0.1,
            max_tokens: 10
        });

        return parseFloat(similarity.choices[0].message.content || '0');
    }
} 