# Worldseed AI Lambda

Translates a natural-language world description into engine `WorldParams` via
the Claude API. One function, exposed through a Lambda Function URL.

```
Browser ── POST {"prompt": "misty pine valley"} ──▶ Lambda (holds ANTHROPIC_API_KEY)
Browser ◀────────── WorldParams JSON ──────────────┘        └─▶ Claude API
```

## Local development

```sh
node dev-server.mjs                          # mock mode — free, no key needed
ANTHROPIC_API_KEY=sk-ant-... node dev-server.mjs   # live mode
```

The frontend talks to `http://localhost:8787` by default (`VITE_API_BASE_URL`).

## Deploy to AWS (one time, ~10 minutes)

Prerequisites: an AWS account, an Anthropic API key from
[console.anthropic.com](https://console.anthropic.com) (set a monthly spend
limit there — $5 is plenty).

### 1. Build the zip

```sh
cd lambda
npm install --omit=dev
zip -r worldseed-ai.zip index.mjs generateWorld.mjs worldParamsSchema.mjs node_modules package.json
```

### 2. Create the function (AWS Console)

1. Lambda → **Create function** → Author from scratch
   - Name: `worldseed-ai` · Runtime: **Node.js 22.x** · Architecture: arm64
2. Upload the zip: **Code → Upload from → .zip file**
3. **Configuration → General**: timeout **30 s** (Claude calls take a few seconds), memory 256 MB
4. **Configuration → Environment variables**:
   - `ANTHROPIC_API_KEY` = your key
   - `ALLOWED_ORIGIN` = your deployed site origin (e.g. `https://worldseed.example.com`) — leave unset during testing (defaults to `*`)
   - optional `MODEL_ID` (defaults to `claude-opus-4-8`; `claude-haiku-4-5` is ~10× cheaper per generation)
5. **Configuration → Function URL → Create**: Auth type **NONE**
   (the function itself rate-limits; the Anthropic spend cap is the backstop)

### 3. Point the frontend at it

Set `VITE_API_BASE_URL=https://<your-function-url>` (no trailing slash, and
note the handler responds on any path — the frontend calls `/generate`) in the
frontend's production env, rebuild, deploy.

### 4. Seatbelts

- AWS Console → Billing → **Budgets**: create a $1 budget alert.
- Anthropic Console → Limits: monthly spend cap.

## Cost

Lambda: free tier covers ~1M requests/month — effectively $0.
Anthropic: ~1¢ per generation on the default model, ~0.1¢ on Haiku.
