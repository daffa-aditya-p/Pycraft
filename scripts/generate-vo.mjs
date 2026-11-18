import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const OUTPUT_DIR = path.join(ROOT_DIR, 'public', 'audio', 'vo');

const ACTS = [
  {
    id: 'act_0_prologue',
    text: {
      id: 'Jauh di atas samudra awan, kepulauan Aetheria melayang dalam keheningan abadi...',
      en: 'Far above the ocean of clouds, the floating archipelago of Aetheria drifts in eternal silence...',
    },
  },
  {
    id: 'act_1_core_spire',
    text: {
      id: 'Dahulu kala, Menara Inti memancarkan energi magis yang menggerakkan air terjun, jembatan energi, dan ekosistem Aetheria.',
      en: 'In ancient times, the Core Spire radiated magical energy that powered the waterfalls, energy bridges, and ecosystems of Aetheria.',
    },
  },
  {
    id: 'act_2_great_silence',
    text: {
      id: 'Ketika Menara Inti teredam, Zaman Kesunyian tiba. Jembatan runtuh, gerbang terkunci, dan mesin-mesin kuno tertidur lelap.',
      en: 'When the Core Spire dimmed, the Great Silence fell. Bridges crumbled, gates sealed shut, and ancient machines fell into deep slumber.',
    },
  },
  {
    id: 'act_3_the_architect',
    text: {
      id: 'Kini, ramalan kuno telah terwujud. Seorang Arsitek telah tiba di Kuil Stasis—membawa kembali kekuatan bahasa logika Python!',
      en: 'Now, ancient prophecy is fulfilled. An Architect has arrived at the Stasis Shrine—bringing back the power of Python logic!',
    },
  },
  {
    id: 'act_4_bit_awakening',
    text: {
      id: 'Tuliskan baris kodemu. Bangunkan rekan automasimu BIT, dan pulihkan kejayaan Aetheria!',
      en: 'Write your lines of code. Awaken your automaton companion BIT, and restore the glory of Aetheria!',
    },
  },
];

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

/**
 * Synthesizes a clean, warm harmonic WAV fallback if offline or TTS fetch fails.
 */
function createFallbackWav(durationSec = 3.5, sampleRate = 22050, baseFreq = 220) {
  const numSamples = Math.floor(durationSec * sampleRate);
  const dataSize = numSamples * 2;
  const buffer = Buffer.alloc(44 + dataSize);

  // RIFF header
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);

  // fmt chunk
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16); // PCM chunk size
  buffer.writeUInt16LE(1, 20); // PCM format
  buffer.writeUInt16LE(1, 22); // mono
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28); // byte rate
  buffer.writeUInt16LE(2, 32); // block align
  buffer.writeUInt16LE(16, 34); // bits per sample

  // data chunk
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);

  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const attack = Math.min(1, t / 0.25);
    const release = Math.min(1, (durationSec - t) / 0.6);
    const env = attack * release * 0.18;
    const sample =
      Math.sin(2 * Math.PI * baseFreq * t) * 0.55 +
      Math.sin(2 * Math.PI * (baseFreq * 1.5) * t) * 0.3 +
      Math.sin(2 * Math.PI * (baseFreq * 2.0) * t) * 0.15;
    const pcm = Math.max(-32767, Math.min(32767, Math.round(sample * env * 32767)));
    buffer.writeInt16LE(pcm, 44 + i * 2);
  }

  return buffer;
}

async function fetchTtsMp3(text, locale) {
  const url = `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=${encodeURIComponent(locale)}&q=${encodeURIComponent(text)}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': USER_AGENT,
        Referer: 'https://translate.google.com/',
      },
      signal: controller.signal,
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    const arr = await res.arrayBuffer();
    const buf = Buffer.from(arr);
    if (buf.length <= 1024) {
      throw new Error(`Response too small (${buf.length} bytes)`);
    }
    return buf;
  } finally {
    clearTimeout(timer);
  }
}

async function main() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const results = [];
  for (let i = 0; i < ACTS.length; i++) {
    const act = ACTS[i];
    for (const locale of ['id', 'en']) {
      const text = act.text[locale];
      const mp3Path = path.join(OUTPUT_DIR, `${act.id}_${locale}.mp3`);
      const wavPath = path.join(OUTPUT_DIR, `${act.id}_${locale}.wav`);

      try {
        const mp3Buf = await fetchTtsMp3(text, locale);
        fs.writeFileSync(mp3Path, mp3Buf);
        if (fs.existsSync(wavPath)) fs.unlinkSync(wavPath);
        results.push({ file: path.basename(mp3Path), bytes: mp3Buf.length, mode: 'tts-mp3' });
      } catch (err) {
        const wavBuf = createFallbackWav(3.5, 22050, 220 + i * 22);
        fs.writeFileSync(wavPath, wavBuf);
        if (fs.existsSync(mp3Path)) fs.unlinkSync(mp3Path);
        results.push({
          file: path.basename(wavPath),
          bytes: wavBuf.length,
          mode: `fallback-wav (${err instanceof Error ? err.message : String(err)})`,
        });
      }
    }
  }

  console.log('Generated VO assets in', OUTPUT_DIR);
  for (const r of results) {
    console.log(` - ${r.file}: ${r.bytes} bytes [${r.mode}]`);
    if (r.bytes <= 1024) {
      throw new Error(`Asset ${r.file} is <= 1024 bytes!`);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
