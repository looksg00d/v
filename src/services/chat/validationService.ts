import { OpenAI } from "openai";

export class ValidationService {
    constructor(private openai: OpenAI) {}

    async validateResponse(response: string, canUseEmoji: boolean): Promise<string> {
        const validationPrompt = `You are a chat quality validator for crypto messages.

Review this response: "${response}"

STRICT RULES:
1. Must be EXTREMELY short (max 10 words)
2. NO punctuation at all:
   - no commas
   - no dots
   - no ellipsis
   - no exclamation marks
3. Emojis: ${canUseEmoji ? 'max 1 allowed' : 'not allowed'}
4. Must feel super lazy
5. Write like typing takes too much effort

Bad examples (with punctuation):
- "yeah, saw it, crazy stuff"
- "melania token? meh, maybe later"
- "interesting, but not sure..."
- "pump looks good, might ape in"

Good examples (no punctuation):
- "yeah saw it crazy stuff"
- "melania token meh maybe later"
- "interesting but not sure"
- "pump looks good might ape"
- "nah im good"
- "same shit different day"

Fix any response that has ANY punctuation marks.
If it's good, return "VALID"`;

        const validation = await this.openai.chat.completions.create({
            messages: [{ role: "user", content: validationPrompt }],
            model: "gpt-3.5-turbo",
            temperature: 0.3,
            max_tokens: 150
        });

        return validation.choices[0].message.content || '';
    }
} 