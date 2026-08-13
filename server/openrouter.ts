import axios from "axios";

const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";

type OpenRouterMessage = { role: "system" | "user" | "assistant"; content: string };

function headers(apiKey: string) {
  return {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
    "HTTP-Referer": "https://app-idea-hub.local",
    "X-Title": "App Idea Hub",
  };
}

export type OpenRouterModel = {
  id: string;
  name?: string;
  description?: string;
  context_length?: number;
  pricing?: { prompt?: string; completion?: string };
  architecture?: { modality?: string; input_modalities?: string[]; output_modalities?: string[] };
};

export async function listOpenRouterModels(apiKey: string): Promise<OpenRouterModel[]> {
  const response = await axios.get(`${OPENROUTER_BASE_URL}/models`, { headers: headers(apiKey), timeout: 15000 });
  const models = Array.isArray(response.data?.data) ? response.data.data : [];
  return models.map((model: OpenRouterModel) => ({
    id: model.id,
    name: model.name,
    description: model.description,
    context_length: model.context_length,
    pricing: model.pricing,
    architecture: model.architecture,
  }));
}

export async function completeOpenRouter(args: { apiKey: string; model: string; messages: OpenRouterMessage[]; temperature?: number }) {
  const response = await axios.post(`${OPENROUTER_BASE_URL}/chat/completions`, {
    model: args.model,
    messages: args.messages,
    temperature: args.temperature ?? 0.35,
  }, { headers: headers(args.apiKey), timeout: 60000 });
  const content = response.data?.choices?.[0]?.message?.content;
  if (typeof content !== "string" || !content.trim()) throw new Error("OpenRouter returned an empty response");
  return { content, model: response.data?.model ?? args.model, usage: response.data?.usage };
}

export function maskApiKey(apiKey: string) {
  if (apiKey.length < 8) return "••••••••";
  return `${apiKey.slice(0, 4)}••••••••${apiKey.slice(-4)}`;
}
