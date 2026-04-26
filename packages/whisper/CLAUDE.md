# @vienna/whisper

Local speech-to-text using OpenAI Whisper via ONNX Runtime. Privacy-first — all processing happens on-device, no cloud APIs.

## Architecture

- **Transcriber** — Core class that loads a Whisper ONNX model via `@huggingface/transformers` and runs inference on Float32Array audio data.
- **TwoPassTranscriber** — Runs a fast "hot" model (tiny, ~500ms) for immediate results, then a "cold" model (base, 1-5s) for refined text with word-level correction patches.
- **ModelManager** — Downloads and caches ONNX models from HuggingFace. Models are stored in `paths.whisperModels` (outside ASAR).
- **VoiceActivityDetector** — Energy-based VAD for detecting speech/silence transitions.
- **Audio utils** — Resampling, normalization, WAV encoding/decoding.

## Usage

### Main process (IPC handler)

```typescript
import { Transcriber, TwoPassTranscriber } from '@vienna/whisper';

const hot = new Transcriber({ model: 'tiny', cacheDir: paths.whisperModels });
const cold = new Transcriber({ model: 'base', cacheDir: paths.whisperModels });
const twoPass = new TwoPassTranscriber(hot, cold);

const result = await twoPass.transcribe(audioFloat32, 16000);
// result.hotText — fast draft
// result.coldText — refined text
// result.patches — word-level corrections
```

### ONNX + ASAR

Set `cacheDir` to a writable directory outside the ASAR archive. The transcriber automatically sets `transformers.env.allowLocalModels = false` when `cacheDir` is provided.

## Models

| Name | Params | Size | Speed |
|------|--------|------|-------|
| tiny | 39M | ~75MB | ~500ms |
| base | 74M | ~150MB | 1-5s |
| small | 244M | ~500MB | 5-15s |

English-only variants (`.en` suffix) are slightly faster and more accurate for English.

## Commands

```bash
pnpm typecheck   # Type check
pnpm test        # Run tests
pnpm lint        # Lint
```
