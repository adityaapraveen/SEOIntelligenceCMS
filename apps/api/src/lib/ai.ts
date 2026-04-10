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
    try {
        const res = await ai.chat.completions.create({
            model: AI_MODEL,
            messages,
            max_tokens: 2048,
            ...opts,
        })

        // Guard against undefined/null choices from the API
        if (!res || !res.choices || !Array.isArray(res.choices) || res.choices.length === 0) {
            console.error('[AI chat] API returned no choices. Full response:', JSON.stringify(res, null, 2))
            return ''
        }

        return res.choices[0]?.message?.content ?? ''
    } catch (err: any) {
        console.error('[AI chat] API call failed:', err.message)
        // If the error has a response body, log it for debugging
        if (err.response) {
            console.error('[AI chat] Response status:', err.response.status)
            try {
                const body = await err.response.text?.()
                if (body) console.error('[AI chat] Response body:', body.slice(0, 500))
            } catch { }
        }
        throw new Error(`AI service error: ${err.message}`)
    }
}