// apps/api/src/lib/ai.ts
import OpenAI from 'openai'

if (!process.env.OPENROUTER_API_KEY) {
    throw new Error('OPENROUTER_API_KEY is not set in .env')
}

export const ai = new OpenAI({
    apiKey: process.env.OPENROUTER_API_KEY,
    baseURL: process.env.OPENROUTER_BASE_URL ?? 'https://openrouter.ai/api/v1',
    defaultHeaders: {
        'HTTP-Referer': process.env.CLIENT_URL ?? 'http://localhost:5173',
        'X-Title': 'Semantic CMS',
    },
})

// Single export — import this in every service that needs AI
export const AI_MODEL = process.env.OPENROUTER_MODEL ?? 'anthropic/claude-3.5-sonnet'

// Helper: typed chat completion with the global model
export async function chat(
    messages: OpenAI.Chat.ChatCompletionMessageParam[],
    opts?: Partial<OpenAI.Chat.ChatCompletionCreateParamsNonStreaming>
): Promise<string> {
    const res = await ai.chat.completions.create({
        model: AI_MODEL,
        messages,
        max_tokens: 2048,
        ...opts,
    })
    return res.choices[0]?.message?.content ?? ''
}