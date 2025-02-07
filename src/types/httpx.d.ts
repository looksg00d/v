declare module 'httpx' {
    interface ClientOptions {
        proxies?: {
            http?: string;
            https?: string;
        };
    }

    class Client {
        constructor(options?: ClientOptions);
        proxies: any;
    }

    export = Client;
} 