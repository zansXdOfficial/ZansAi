import express from "express";
import multer from "multer";
import dotenv from "dotenv";
import OpenAI, { toFile } from "openai";
import sharp from "sharp";

dotenv.config();

const app = express();
const port = Number(process.env.PORT || 3000);
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }
});

app.use(express.json({ limit: "3mb" }));
app.use(express.static("public"));

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

function ensureKey(res) {
  if (!openai) {
    res.status(503).json({
      error: "OPENAI_API_KEY belum diatur. Isi file .env lalu restart server."
    });
    return false;
  }
  return true;
}

function b64(response) {
  return response?.data?.[0]?.b64_json || null;
}

function dataUrl(file) {
  return `data:${file.mimetype || "image/jpeg"};base64,${file.buffer.toString("base64")}`;
}

const styleRules = {
  photorealistic: "ultra-realistic professional photography, natural skin texture, physically plausible lighting, authentic camera optics",
  smartphone: "authentic modern smartphone photography, natural HDR, slight computational photography, candid imperfections, realistic exposure",
  cinematic: "cinematic photography, controlled contrast, motivated practical lighting, subtle filmic color, realistic lens rendering",
  editorial: "high-end editorial fashion photography, refined composition, premium styling, realistic studio/location lighting",
  street: "raw candid street photography, spontaneous moment, documentary realism, natural ambient light"
};

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    configured: Boolean(process.env.OPENAI_API_KEY),
    imageModel: "gpt-image-2",
    visionModel: "gpt-5.6"
  });
});

app.post("/api/enhance-prompt", async (req, res) => {
  try {
    if (!ensureKey(res)) return;
    const { prompt, style = "photorealistic", ratio = "3:2" } = req.body || {};
    if (!prompt?.trim()) return res.status(400).json({ error: "Tulis ide gambar terlebih dahulu." });

    const instruction = `You are an expert image-prompt director.
Rewrite the user's short idea into ONE production-ready prompt for GPT-Image-2.
Preserve the user's intent. Add useful specifics only when they improve visual quality:
subject, pose, expression if supplied, wardrobe, environment, composition, camera/lens language,
lighting, depth of field, realistic materials/skin, color treatment and photographic imperfections.
Do not invent a person's identity. Do not add text in the image unless requested.
Style: ${styleRules[style] || styleRules.photorealistic}.
Aspect ratio: ${ratio}.
Return only the final prompt in Indonesian, no markdown.

User idea:
${prompt.trim()}`;

    const r = await openai.responses.create({
      model: "gpt-5.6",
      input: instruction
    });
    res.json({ prompt: r.output_text?.trim() || prompt.trim() });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e?.message || "Prompt enhancer gagal." });
  }
});

app.post("/api/generate", async (req, res) => {
  try {
    if (!ensureKey(res)) return;
    const { prompt, size = "1536x1024", quality = "high", format = "png" } = req.body || {};
    if (!prompt?.trim()) return res.status(400).json({ error: "Prompt wajib diisi." });

    const finalPrompt = `${prompt.trim()}

Quality direction: prioritize coherent anatomy, realistic hands, natural facial proportions,
physically plausible light and shadows, authentic material texture, clean edges and believable optics.
Do not add captions, watermarks or logos unless explicitly requested.`;

    const r = await openai.images.generate({
      model: "gpt-image-2",
      prompt: finalPrompt,
      size,
      quality,
      output_format: format
    });
    const image = b64(r);
    if (!image) throw new Error("Tidak ada gambar pada respons model.");
    const watermarked = await addWatermark(`data:image/${format};base64,${image}`);
    res.json({ image: watermarked });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e?.message || "Generate gagal." });
  }
});

app.post("/api/vision-prompt", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "Upload foto terlebih dahulu." });
    if (!ensureKey(res)) return;

    const instruction = `Analisis gambar ini sebagai fotografer profesional dan prompt engineer.
Buat SATU prompt fotografi siap pakai dalam bahasa Indonesia untuk GPT-Image-2.
Jelaskan hanya hal yang benar-benar terlihat: subjek, pose, ekspresi yang terlihat, framing,
pakaian, lokasi, latar, pencahayaan, perspektif, kemungkinan kamera/lensa, depth of field,
warna, tekstur dan mood.
Jika identitas seseorang tidak diketahui, jangan menebak nama atau identitasnya.
Pertahankan detail visual yang khas. Jangan gunakan markdown dan jangan beri penjelasan tambahan.`;

    const r = await openai.responses.create({
      model: "gpt-5.6",
      input: [{
        role: "user",
        content: [
          { type: "input_text", text: instruction },
          { type: "input_image", image_url: dataUrl(req.file), detail: "high" }
        ]
      }]
    });

    res.json({
      prompt: r.output_text?.trim() || "",
      provider: "OpenAI / GPT-5.6 Vision"
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e?.message || "Vision gagal." });
  }
});

async function addWatermark(dataUrl) {
  const raw = Buffer.from(dataUrl.split(",")[1], "base64");
  const meta = await sharp(raw).metadata();
  const width = meta.width || 1536;
  const height = meta.height || 1024;
  const fontSize = Math.max(28, Math.round(width * 0.028));
  const pad = Math.max(28, Math.round(width * 0.025));
  const text = "ZANE OFC";
  const svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <filter id="shadow" x="-30%" y="-30%" width="160%" height="160%">
        <feGaussianBlur stdDeviation="3" result="blur"/>
        <feOffset dx="0" dy="2" result="off"/>
        <feMerge><feMergeNode in="off"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
    </defs>
    <text x="${width-pad}" y="${height-pad}" text-anchor="end"
      font-family="'Matcha Mint','Brush Script MT','Segoe Script',cursive"
      font-size="${fontSize}px" font-weight="600" letter-spacing="1.2"
      fill="white" fill-opacity=".92" stroke="#061018" stroke-opacity=".35"
      stroke-width="2" paint-order="stroke" filter="url(#shadow)">${text}</text>
  </svg>`;
  const out = await sharp(raw).composite([{ input: Buffer.from(svg), top: 0, left: 0 }]).png().toBuffer();
  return `data:image/png;base64,${out.toString("base64")}`;
}

async function edit(files, prompt) {
  const inputs = [];
  for (const f of files) {
    inputs.push(await toFile(f.buffer, f.originalname || "reference.jpg", { type: f.mimetype || "image/jpeg" }));
  }
  const r = await openai.images.edit({
    model: "gpt-image-2",
    image: inputs.length === 1 ? inputs[0] : inputs,
    prompt,
    size: "1536x1024",
    quality: "high",
    output_format: "png"
  });
  const image = b64(r);
  if (!image) throw new Error("Tidak ada gambar hasil edit.");
  return `data:image/png;base64,${image}`;
}

app.post("/api/face-swap", upload.fields([
  { name: "source", maxCount: 1 },
  { name: "target", maxCount: 1 }
]), async (req, res) => {
  try {
    if (!ensureKey(res)) return;
    const source = req.files?.source?.[0];
    const target = req.files?.target?.[0];
    if (!source || !target) return res.status(400).json({ error: "Foto wajah dan target wajib diisi." });

    const image = await edit(
      [target, source],
      `Edit the first image as the target photograph. Use the second image as the face reference.
Replace only the visible facial identity of the target person while preserving the target's pose,
body, hair where possible, clothing, background, camera perspective and lighting.
Make the result photorealistic, seamless and naturally blended. Do not alter unrelated areas.`
    );
    res.json({ image: await addWatermark(image) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e?.message || "Face swap gagal." });
  }
});

app.post("/api/hdr", upload.single("image"), async (req, res) => {
  try {
    if (!ensureKey(res)) return;
    if (!req.file) return res.status(400).json({ error: "Upload foto terlebih dahulu." });
    const image = await edit([req.file],
      `Enhance this exact photograph without changing its composition or identity.
Improve dynamic range, highlight recovery, shadow detail, micro-contrast, realistic texture,
local clarity and optical sharpness. Preserve natural skin and colors. Avoid halos, oversharpening,
plastic skin, fake HDR glow, excessive saturation and invented objects.`
    );
    res.json({ image: await addWatermark(image) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e?.message || "HDR gagal." });
  }
});

app.listen(port, () => console.log(`ZANE AI Studio Pro → http://localhost:${port}`));
