# ZANE AI Studio — ChatGPT / OpenAI • GitHub Edition

All AI features in this version use OpenAI only. It is ready to upload to GitHub and deploy on a Node.js host.

## AI stack
- **GPT-Image-2** — image generation and image editing.
- **GPT-5.6** — prompt enhancement and image/vision analysis.

## Features
- Generate Image
- Prompt Enhancer
- Prompt dari Foto
- Face Swap AI
- HDR Enhancer
- Local browser history
- Drag/drop and clipboard image upload
- Mobile-first premium UI

## Run
1. Node.js 20+
2. Copy `.env.example` to `.env`
3. Put your OpenAI API key in `.env`
4. `npm install`
5. `npm start`
6. Open `http://localhost:3000`

The API key is server-side only. Never expose it in frontend JavaScript.

For production, add authentication, rate limiting, moderation, object storage, a database and usage/billing controls.


## Watermark
Every generated/edited image is permanently stamped with **ZANE OFC** in the bottom-right corner. The watermark uses a script-style stack designed to resemble Matcha Mint; a licensed Matcha Mint font file can be added if you own it.
