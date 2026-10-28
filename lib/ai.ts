import Groq from "groq-sdk";

// Prioritized list of active Groq models with automatic fallback
export const CHAT_MODELS = [
  "qwen/qwen3.8-27b",
  "openai/gpt-oss-120b",
  "openai/gpt-oss-20b",
  "allam-2-7b",
] as const;

export const WHISPER_MODELS = [
  "whisper-large-v3",
  "whisper-large-v3-turbo",
] as const;

let globalGroqClient: Groq | null = null;

export function getGroqClient(): Groq {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error("GROQ_API_KEY environment variable is not defined");
  }
  if (!globalGroqClient) {
    globalGroqClient = new Groq({ apiKey });
  }
  return globalGroqClient;
}

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type CompletionOptions = {
  messages: ChatMessage[];
  temperature?: number;
  max_tokens?: number;
  response_format?: { type: "json_object" | "text" };
  model?: string;
};

/**
 * Creates a chat completion with automatic model fallback
 */
export async function createChatCompletion(options: CompletionOptions): Promise<{
  content: string;
  modelUsed: string;
}> {
  const groq = getGroqClient();
  const modelsToTry = options.model
    ? [options.model, ...CHAT_MODELS.filter((m) => m !== options.model)]
    : CHAT_MODELS;

  let lastError: any = null;

  for (const model of modelsToTry) {
    try {
      const response = await groq.chat.completions.create({
        model,
        messages: options.messages,
        temperature: options.temperature ?? 0.3,
        max_tokens: options.max_tokens ?? 1500,
        response_format: options.response_format,
      });

      const content = response.choices[0]?.message?.content || "";
      if (content.trim()) {
        return { content, modelUsed: model };
      }
    } catch (err: any) {
      lastError = err;
      console.warn(`Groq model ${model} failed (${err.status || err.message}). Trying fallback...`);
      // Continue to next model in loop
    }
  }

  throw new Error(`All Groq AI models failed. Last error: ${lastError?.message || "Unknown"}`);
}

/**
 * Transcribes audio buffer using Groq Whisper with fallback
 */
export async function createAudioTranscription(
  audioFile: File,
  language = "hi"
): Promise<string> {
  const groq = getGroqClient();
  let lastError: any = null;

  for (const model of WHISPER_MODELS) {
    try {
      const transcription = await groq.audio.transcriptions.create({
        file: audioFile,
        model,
        language,
      });
      if (transcription.text) {
        return transcription.text;
      }
    } catch (err: any) {
      lastError = err;
      console.warn(`Whisper model ${model} failed: ${err.message}. Trying fallback...`);
    }
  }

  throw new Error(`Groq Whisper transcription failed: ${lastError?.message || "Unknown"}`);
}
