import itemsPool from '../dbConfig';
import { Memory } from '../types';

export class MemoryService {
    async searchMemoriesByEmbedding(
        embedding: number[],
        params: {
            match_threshold?: number;
            count?: number;
            agentId?: string;
            roomId?: string;
            unique?: boolean;
            tableName: string;
        }
    ): Promise<Memory[]> {
        let client;
        try {
            client = await itemsPool.connect();
            
            // Проверка соединения
            await client.query('SELECT 1');
            
            const expectedDimensions = 1536;
            if (embedding.length !== expectedDimensions) {
                throw new Error(`Неверное количество измерений эмбеддинга: ожидается ${expectedDimensions}, получено ${embedding.length}`);
            }

            const cleanVector = embedding.map(n => Number.isFinite(n) ? Number(n.toFixed(6)) : 0);
            const vectorStr = `[${cleanVector.join(',')}]`; // Изменен формат вектора

            let sql = `
                SELECT *,
                1 - (embedding <-> $1::vector) as similarity
                FROM ${params.tableName}
                WHERE type = $2
            `;
            const values: unknown[] = [vectorStr, params.tableName];

            let paramCount = 2;

            if (params.unique) {
                sql += ` AND "unique" = true`;
            }

            if (params.agentId) {
                paramCount++;
                sql += ` AND "agentId" = $${paramCount}`;
                values.push(params.agentId);
            }

            if (params.roomId) {
                paramCount++;
                sql += ` AND "roomId" = $${paramCount}::uuid`;
                values.push(params.roomId);
            }

            if (params.match_threshold !== undefined) {
                paramCount++;
                sql += ` AND 1 - (embedding <-> $1::vector) >= $${paramCount}`;
                values.push(params.match_threshold);
            }

            sql += ` ORDER BY embedding <-> $1::vector`;

            if (params.count) {
                paramCount++;
                sql += ` LIMIT $${paramCount}`;
                values.push(params.count);
            }

            const res = await client.query(sql, values);
            return res.rows.map((row: any) => ({
                ...row,
                content: typeof row.content === 'string' ? JSON.parse(row.content) : row.content,
                similarity: row.similarity,
            }));
        } catch (error) {
            console.error("Ошибка при поиске памяти:", error);
            return []; // Возвращаем пустой массив вместо выброса ошибки
        } finally {
            if (client) {
                client.release(true); // force release
            }
        }
    }
}