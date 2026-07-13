# Worldseed AI Lambda

Translates a natural-language world description into engine `WorldParams` via
the OpenAI API (GPT-4o mini + strict structured outputs). One function,
exposed through a Lambda Function URL.

```
Browser ── POST {"prompt": "misty pine valley"} ──▶ Lambda (holds OPENAI_API_KEY)
Browser ◀────────── WorldParams JSON ──────────────┘        └─▶ OpenAI API
```

## Local development

```sh
node dev-server.mjs                          # mock mode — free, no key needed
OPENAI_API_KEY=sk-... node dev-server.mjs    # live mode
```

The frontend talks to `http://localhost:8787` by default (`VITE_API_BASE_URL`).

## Deploy to AWS (one time, ~10 minutes)

Prerequisites: an AWS account and an OpenAI API key from
[platform.openai.com](https://platform.openai.com/api-keys) (set a monthly
spend limit under Billing — $5 is plenty).

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
3. **Configuration → General**: timeout **30 s** (model calls take a few seconds), memory 256 MB
4. **Configuration → Environment variables**:
   - `OPENAI_API_KEY` = your key
   - `ALLOWED_ORIGIN` = your deployed site origin (e.g. `https://worldseed.example.com`) — leave unset during testing (defaults to `*`)
   - optional `MODEL_ID` (defaults to `gpt-4o-mini`)
5. **Configuration → Function URL → Create**: Auth type **NONE**
   (the function itself rate-limits; the OpenAI spend cap is the backstop)

### 3. Point the frontend at it

Set `VITE_API_BASE_URL=https://<your-function-url>` (no trailing slash, and
note the handler responds on any path — the frontend calls `/generate`) in the
frontend's production env, rebuild, deploy.

### 4. Seatbelts

- AWS Console → Billing → **Budgets**: create a $1 budget alert.
- OpenAI dashboard → Billing → monthly spend limit.

## Cost

Lambda: free tier covers ~1M requests/month — effectively $0.
OpenAI: GPT-4o mini is ~$0.15/$0.60 per million tokens — a few hundredths of
a cent per generated world.
