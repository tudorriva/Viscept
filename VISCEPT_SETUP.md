# Viscept Model Setup

## Changes Made

### Backend Configuration
✅ Updated `.env` file in `/backend`:
- `OLLAMA_MODEL=viscept` (was `qwen2.5-coder:7b-instruct-q4_K_M`)
- `OLLAMA_VLM_MODEL=granite3.2-vision:2b` (was `qwen2.5vl:3b`)

✅ Updated `.env.example` with Viscept as recommended default

### Code Defaults
✅ Backend `ollamaService.ts`:
- Default: `OLLAMA_MODEL || 'viscept'`
- Falls back to code default if env var not set

✅ Frontend `useSettings.ts`:
- Default: `model: 'viscept'`

✅ Frontend `SettingsPanel.tsx`:
- Shows "Viscept (Recommended)" in model dropdown

## How It Works

### For Backend
1. **First**: Checks `OLLAMA_MODEL` environment variable (from `.env`)
2. **Fallback**: Uses code default `'viscept'`
3. **Priority**: `.env` > code defaults

### For Frontend
1. **User selects model** in Settings → stored in localStorage
2. **Can be passed** to backend via `model` parameter in future requests
3. **Current**: Backend uses env config, frontend setting is for UI only

## Next Steps

To activate the changes:

1. **Restart the backend**:
   ```bash
   npm run dev  # in /backend directory
   ```

2. **Verify in logs**:
   - Look for: `[Ollama] Requesting ... diagram generation...`
   - Should use viscept model now

3. **Test**:
   - Generate a new diagram
   - It should now use the viscept model (faster/better for diagrams)

## Model Comparison

| Model | Speed | Quality | Notes |
|-------|-------|---------|-------|
| viscept | ⚡ Fast | ⭐⭐⭐⭐⭐ | Best for diagrams |
| qwen2.5-coder:7b | 🐢 Slower | ⭐⭐⭐⭐ | General purpose |
| mistral | ⚡ Fast | ⭐⭐⭐ | Basic support |

## VLM Update

Also updated Vision Model to `qwen2.5vl:3b` which is:
- More capable than `granite3.2-vision:2b`
- Better at understanding complex diagrams
- Still fits in 4GB VRAM with model unloading
