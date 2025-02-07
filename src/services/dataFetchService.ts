const { ApifyClient } = require('apify-client');
import * as dotenv from 'dotenv';
import { OpenAI } from 'openai/index.mjs';
import { HttpsProxyAgent } from 'https-proxy-agent';

interface TweetData {
    text: string;
    username?: string;
    metrics?: {
        likes?: number;
        retweets?: number;
    };
}

interface RawTweet {
    created_at: string;
    text: string;
    username: string;
    url: string;
    isRetweet?: boolean;
    isReply?: boolean;
    public_metrics?: {
        retweet_count?: number;
        like_count?: number;
        reply_count?: number;
    };
}

export class DataFetchService {
    private client: InstanceType<typeof ApifyClient>;
    private openai: OpenAI;
    private readonly MAX_TWEETS_PER_PAGE = 20;
    private readonly MAX_PAGES = 3;
    
    constructor() {
        const proxyUrl = `http://wqnfutnw:a57omrbixk0q@207.244.217.165:6712`;
        
        this.client = new ApifyClient({
            token: process.env.APIFY_TOKEN
        });
        
        this.openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
            httpAgent: new HttpsProxyAgent(proxyUrl)
        });
    }

    async searchTopicInfo(topic: string, context?: string): Promise<TweetData[]> {
        try {
            console.log('\n=== Searching Topic Info ===');
            console.log('Step 1: Starting search for topic:', topic);
            
            // Упрощаем поисковый запрос
            const searchPrompt = `Convert this chat message into 2-3 simple keywords for Twitter search.
                                Example: "do u guys know about new solana update" -> "solana update"
                                Message: "${topic}"`;
            
            console.log('Step 2: Sending request to GPT...');
            const completion = await this.openai.chat.completions.create({
                messages: [{ role: "user", content: searchPrompt }],
                model: "gpt-3.5-turbo",
                temperature: 0.3,
                max_tokens: 50
            });

            const searchQuery = completion.choices[0].message.content?.trim() || topic;
            console.log('Original Topic:', topic);
            console.log('Search Query:', searchQuery);

            // Упрощаем параметры запроса
            console.log('Step 4: Starting Apify actor...');
            const run = await this.client.actor('apidojo/tweet-scraper').call({
                searchTerms: [searchQuery],
                maxItems: 1,
                sort: "Latest",
                tweetLanguage: "en"
            });

            console.log('Step 5: Apify actor started, Run ID:', run.id);
            console.log('Step 6: Waiting for dataset...');

            const { items } = await this.client.dataset(run.defaultDatasetId).listItems();
            console.log('Step 7: Got items:', items?.length || 0);

            if (!items || items.length === 0) {
                console.log('No tweets found');
                return [];
            }

            // Возвращаем только текст
            return items.map((tweet: any) => ({
                text: tweet.full_text || tweet.text || 'No text available'
            }));

        } catch (error) {
            console.error('Error searching topic info:', error);
            return [];
        }
    }

    private async extractKeywordsWithGPT(topic: string, context?: string): Promise<string[]> {
        try {
            console.log('\n=== GPT Prompt ===');
            const prompt = `Extract 3-5 most relevant keywords for searching Twitter about this topic. Include only the keywords, separated by commas. Focus on the main topic, ignore greetings and casual chat:
                           Topic: ${topic}`;
            
            console.log('Prompt:', prompt);

            const completion = await this.openai.chat.completions.create({
                messages: [{ role: "user", content: prompt }],
                model: "gpt-3.5-turbo",
                temperature: 0.3,
                max_tokens: 50
            });

            console.log('GPT Response:', completion.choices[0].message.content);

            const keywords = completion.choices[0].message.content?.split(',')
                .map(k => k.trim())
                .filter(k => k.length > 0) || [];

            return keywords;
        } catch (error) {
            console.error('\n=== Error in extractKeywordsWithGPT ===');
            console.error('Full error:', error);
            throw error;
        }
    }

    private processTweets(tweets: any[]): TweetData[] {
        return tweets
            .filter(tweet => {
                // Фильтруем ретвиты и рекламу
                if (tweet.isRetweet || tweet.isReply) return false;
                
                // Проверяем метрики вовлеченности
                const metrics = tweet.public_metrics || {};
                return (metrics.retweet_count > 10 || 
                        metrics.like_count > 50 || 
                        metrics.reply_count > 5);
            })
            .map(tweet => ({
                date: new Date(tweet.created_at).toISOString(),
                text: tweet.text,
                username: tweet.username,
                url: tweet.url,
                metrics: {
                    retweets: tweet.public_metrics?.retweet_count || 0,
                    likes: tweet.public_metrics?.like_count || 0,
                    replies: tweet.public_metrics?.reply_count || 0
                }
            }))
            .sort((a, b) => {
                // Сортируем по вовлеченности
                const scoreA = a.metrics.retweets * 2 + a.metrics.likes + a.metrics.replies * 3;
                const scoreB = b.metrics.retweets * 2 + b.metrics.likes + b.metrics.replies * 3;
                return scoreB - scoreA;
            })
            .slice(0, 5); // Берем только топ-5 самых релевантных твитов
    }

    async searchInfo(topic: string, context?: string): Promise<{
        tweets: string[];
        news: string[];
        summary: string;
    }> {
        try {
            const tweets = await this.searchTopicInfo(topic, context);
            
            // Форматируем твиты для удобного отображения, учитывая опциональные поля
            const formattedTweets = tweets.map(tweet => 
                `${tweet.username ? '@' + tweet.username : 'anon'}: ${tweet.text}` +
                `${tweet.metrics ? ` [${tweet.metrics.likes || 0}👍 ${tweet.metrics.retweets || 0}🔄]` : ''}`
            );

            const summary = formattedTweets.length > 0 
                ? `Recent discussions from Twitter:\n${formattedTweets.join('\n')}`
                : 'No recent discussions found.';

            return {
                tweets: formattedTweets,
                news: [], // Пока не используем новости
                summary
            };
        } catch (error) {
            console.error('Error fetching data:', error);
            return { tweets: [], news: [], summary: '' };
        }
    }
} 