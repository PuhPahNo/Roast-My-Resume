const DEFAULT_GROQ_MODEL = 'openai/gpt-oss-120b';
const RETIRED_GROQ_MODELS = new Set([
    'llama-3.1-8b-instant'
]);

function resolveGroqModel(configuredModel) {
    const model = configuredModel?.trim();
    if (!model || RETIRED_GROQ_MODELS.has(model)) {
        return DEFAULT_GROQ_MODEL;
    }
    return model;
}

module.exports = {
    DEFAULT_GROQ_MODEL,
    RETIRED_GROQ_MODELS,
    resolveGroqModel
};
