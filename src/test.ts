import OpenAI from "openai";
import * as dotenv from 'dotenv';

dotenv.config();

async function testOpenAI() {
    try {
        const client = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
        });

        console.log("Пробуем подключиться к OpenAI...");
        
        const completion = await client.chat.completions.create({
            messages: [{ role: "user", content: "Say 'Hello, World!'" }],
            model: "gpt-3.5-turbo",
        });

        console.log("Ответ от API:", completion.choices[0].message.content);
        console.log("API работает корректно!");
        
    } catch (error: any) {
        console.error("Ошибка при подключении к API:");
        console.error("Статус:", error?.status);
        console.error("Сообщение:", error?.message);
        console.error("Полная ошибка:", error);
    }
}

testOpenAI(); 