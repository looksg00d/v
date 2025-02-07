import itemsPool from '../dbConfig';
import { Message } from '../types';

export class MessageService {
    async createRoom(roomId: string): Promise<void> {
        const client = await itemsPool.connect();
        try {
            const sql = `
                INSERT INTO rooms (id)
                VALUES ($1)
                ON CONFLICT (id) DO NOTHING
            `;
            await client.query(sql, [roomId]);
        } catch (error) {
            console.error('Ошибка при создании комнаты:', error);
            throw error;
        } finally {
            client.release();
        }
    }

    async saveMessage(message: Message): Promise<void> {
        const client = await itemsPool.connect();
        try {
            console.log('Сохраняем сообщение:', {
                userName: message.userName,
                contentPreview: message.content.substring(0, 50),
                roomId: message.roomId
            });

            const sql = `
                INSERT INTO messages (userName, content, roomId)
                VALUES ($1, $2, $3)
                RETURNING id
            `;
            const values = [message.userName, message.content, message.roomId];
            const result = await client.query(sql, values);
            console.log('Сообщение сохранено с id:', result.rows[0].id);
        } catch (error) {
            console.error('Ошибка при сохранении сообщения:', error);
            throw error;
        } finally {
            client.release();
        }
    }

    async getRecentMessages(limit: number, roomId: string): Promise<Message[]> {
        const client = await itemsPool.connect();
        try {
            console.log('Получаем сообщения для комнаты:', roomId);
            
            const sql = `
                SELECT id, userName, content, createdAt
                FROM messages
                WHERE roomId = $1
                ORDER BY createdAt DESC
                LIMIT $2
            `;
            const values = [roomId, limit];
            const res = await client.query(sql, values);
            console.log(`Найдено ${res.rows.length} сообщений`);
            return res.rows.reverse();
        } catch (error) {
            console.error('Ошибка при получении сообщений:', error);
            return [];
        } finally {
            client.release();
        }
    }
} 