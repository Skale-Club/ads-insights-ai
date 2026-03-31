export interface ChatModel {
    id: string;
    name: string;
    provider: 'google' | 'openai' | 'anthropic';
    description: string;
}

export const chatModels: ChatModel[] = [
    {
        id: 'gemini-2.5-flash',
        name: 'Gemini 2.5 Flash',
        provider: 'google',
        description: 'Fast and efficient for most tasks',
    },
    {
        id: 'gemini-2.5-pro',
        name: 'Gemini 2.5 Pro',
        provider: 'google',
        description: 'More capable for complex analysis',
    },
    {
        id: 'gemini-3-flash-preview',
        name: 'Gemini 3 Flash (Preview)',
        provider: 'google',
        description: 'Latest preview with new features',
    },
    {
        id: 'gemini-3-pro-preview',
        name: 'Gemini 3 Pro (Preview)',
        provider: 'google',
        description: 'Most capable preview model',
    },
];

export function getDefaultModel(): string {
    return 'gemini-2.5-flash';
}

export function isValidModel(modelId: string): boolean {
    return chatModels.some((m) => m.id === modelId);
}

export function getModelById(modelId: string): ChatModel | undefined {
    return chatModels.find((m) => m.id === modelId);
}
