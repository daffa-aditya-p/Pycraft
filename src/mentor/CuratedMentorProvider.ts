import idConcepts from '../content/locales/id/concepts.json';
import enConcepts from '../content/locales/en/concepts.json';
import { getKC } from '../learning/kcRegistry';
import { buildErrorMentorResponse } from './errorTranslator';
import type {
  ConceptCard,
  HintRungContent,
  Locale,
  MentorContext,
  MentorProvider,
  MentorResponse,
  VisorMood,
} from './types';

const CONCEPTS_ID = idConcepts as Record<string, ConceptCard>;
const CONCEPTS_EN = enConcepts as Record<string, ConceptCard>;

export class CuratedMentorProvider implements MentorProvider {
  async explainError(ctx: MentorContext): Promise<MentorResponse> {
    const isId = ctx.locale === 'id';

    if (ctx.lastError) {
      const response = buildErrorMentorResponse(ctx);
      // In M2.3 TypeError (str + int) or M2.4, surface the T1 arithmetic micro-card (RC-06)
      if (
        response.errorTag === 'type_str_int' &&
        (ctx.stepId === 'm2_s3' || ctx.stepId === 'm2_s4')
      ) {
        response.conceptCardId = 'T1_ARITH';
      } else if (ctx.targetKCs[0]) {
        response.conceptCardId = ctx.targetKCs[0];
      }
      return response;
    }

    // Check AST trap warnings when code ran without fatal CPython exception
    const printInsteadTrap = ctx.astReport?.traps?.find(
      (t) => t.kind === 'print_instead_of_return'
    );
    if (printInsteadTrap) {
      return {
        source: 'curated',
        visorMood: 'thinking',
        headline: isId ? 'Fungsi Mencetak, Bukan Mengembalikan' : 'Printed Instead of Returning',
        body: isId
          ? 'Fungsimu memakai `print()`, padahal pemanggil butuh nilai kembali. Ganti `print(...)` dengan `return ...`.'
          : 'Your function used `print()`, but the caller expects a return value. Replace `print(...)` with `return ...`.',
        socraticQuestion: isId
          ? 'Apa bedanya menampilkan ke layar dengan mengirim nilai balik ke depot?'
          : 'What is the difference between printing to screen and returning a value?',
        highlightLines: [printInsteadTrap.line],
        rung: 1,
        conceptCardId: 'N4',
        errorTag: 'print_instead_of_return',
      };
    }

    const uncalledTrap = ctx.astReport?.traps?.find((t) => t.kind === 'uncalled_method');
    if (uncalledTrap) {
      return {
        source: 'curated',
        visorMood: 'concerned',
        headline: isId ? 'Lupa Tanda Kurung ()' : 'Missing Parentheses ()',
        body: isId
          ? `Pada baris ${uncalledTrap.line}, kamu menulis \`${uncalledTrap.expr ?? 'perintah'}\` tanpa tanda kurung \`()\`. Tambahkan \`()\` agar BIT menjalankannya.`
          : `On line ${uncalledTrap.line}, you wrote \`${uncalledTrap.expr ?? 'command'}\` without \`()\`. Add \`()\` so BIT executes it.`,
        socraticQuestion: isId
          ? 'Simbol apa yang wajib ada di akhir pemanggilan method robot?'
          : 'What symbols are needed at the end of a robot method call?',
        highlightLines: [uncalledTrap.line],
        rung: 1,
        errorTag: 'type_missing_parens',
      };
    }

    if (ctx.astReport && !ctx.astReport.ok && ctx.astReport.ruleFailures.length > 0) {
      const failure = ctx.astReport.ruleFailures[0]!;
      const msgKey = failure.messageId;
      const isSlugKey = /^[a-z0-9_]+$/i.test(msgKey);
      const isMessageSlug = /^[a-z0-9_]+$/i.test(failure.message);

      const idSlugMap: Record<string, string> = {
        too_many_prints:
          'Kamu menggunakan print() lebih dari 1 kali. Gabungkan baris ke dalam satu print() menggunakan \\n.',
        missing_comment: 'Tambahkan minimal satu komentar Python yang diawali tanda #.',
        too_many_statements:
          'Kodemu melebihi batas maksimum jumlah baris perintah untuk tantangan ini.',
        forbidden_print: 'Jangan gunakan print() pada langkah ini.',
        missing_function_name: 'Definisikan nama fungsi yang diminta dengan def ...():.',
        missing_for: 'Tantangan ini membutuhkan perulangan for.',
        missing_while: 'Tantangan ini membutuhkan perulangan while.',
        missing_if: 'Tantangan ini membutuhkan percabangan if.',
        missing_functiondef: 'Tantangan ini membutuhkan pembuatan fungsi dengan def.',
        missing_return: 'Fungsimu harus mengembalikan nilai menggunakan return.',
        exact_print_calls:
          'Jumlah pemanggilan print() belum sesuai dengan yang diminta tantangan ini.',
      };

      const enSlugMap: Record<string, string> = {
        too_many_prints:
          'You used too many print() calls on this step. Combine lines into one print() using \\n.',
        missing_comment: 'Add at least one Python comment starting with #.',
        too_many_statements:
          'Your code exceeds the maximum statement line limit for this challenge.',
        forbidden_print: 'Do not use print() on this step.',
        missing_function_name: 'Define the required function name with def ...():.',
        missing_for: 'This challenge requires a for loop.',
        missing_while: 'This challenge requires a while loop.',
        missing_if: 'This challenge requires an if branch.',
        missing_functiondef: 'This challenge requires defining a function with def.',
        missing_return: 'Your function must return a value using return.',
        exact_print_calls:
          'The number of print() calls does not match what this challenge requires.',
      };

      const resolvedBody = isId
        ? isSlugKey
          ? !isMessageSlug && failure.message.trim().length > 0
            ? failure.message
            : idSlugMap[msgKey] ??
              idSlugMap[failure.message] ??
              'Periksa kembali struktur kodemu agar sesuai aturan tantangan.'
          : msgKey
        : isSlugKey || isMessageSlug
          ? enSlugMap[msgKey] ??
            enSlugMap[failure.message] ??
            (!isMessageSlug && failure.message.trim().length > 0
              ? failure.message
              : 'Check your code structure to match the challenge rules.')
          : failure.message;

      return {
        source: 'curated',
        visorMood: 'thinking',
        headline: isId ? 'Periksa Struktur Kode' : 'Check Code Structure',
        body: resolvedBody.slice(0, 240),
        highlightLines: failure.line ? [failure.line] : undefined,
        rung: 1,
        conceptCardId: ctx.targetKCs[0],
        errorTag: failure.rule,
      };
    }

    if (ctx.failedScenarioId) {
      return {
        source: 'curated',
        visorMood: 'thinking',
        headline: isId
          ? `Skenario "${ctx.failedScenarioId}" Belum Lolos`
          : `Scenario "${ctx.failedScenarioId}" Did Not Pass`,
        body: isId
          ? 'Kodemu berjalan di skenario utama, tetapi gagal pada skenario tersembunyi. Klik "Lihat skenario ini" untuk melihat apa yang terjadi.'
          : 'Your code passed the main scene but failed a hidden scenario. Click "Watch this scenario" to replay it in 3D.',
        socraticQuestion: isId
          ? 'Apakah kodemu bergantung pada nilai tetap, atau membaca sensor/ukuran dunia?'
          : 'Does your code hardcode a fixed value instead of reading world sensors/dimensions?',
        rung: 1,
        conceptCardId: ctx.targetKCs[0],
      };
    }

    return buildErrorMentorResponse(ctx);
  }

  async getHint(ctx: MentorContext, requestedRung: 1 | 2 | 3 | 4): Promise<MentorResponse> {
    const isId = ctx.locale === 'id';
    const authored = ctx.hintLadder?.find((h) => h.rung === requestedRung);

    if (authored) {
      return this.formatAuthoredHint(authored, ctx.locale, ctx.targetKCs[0]);
    }

    // Fallback deterministic 4-rung ladder derived from target KC
    const primaryKC = ctx.targetKCs[0] ?? 'F1';
    const card = await this.getConceptCard(primaryKC, ctx.locale);
    const moodByRung: Record<1 | 2 | 3 | 4, VisorMood> = {
      1: 'thinking',
      2: 'focused',
      3: 'focused',
      4: 'proud',
    };

    if (requestedRung === 1) {
      return {
        source: 'curated',
        visorMood: moodByRung[1],
        headline: isId ? `Petunjuk 1: Pertanyaan Pemantik` : `Hint 1: Guiding Question`,
        body: card.summary.slice(0, 240),
        socraticQuestion: isId
          ? `Bagaimana kamu menerapkan "${card.title}" pada langkah ${ctx.stepId}?`
          : `How can you apply "${card.title}" in step ${ctx.stepId}?`,
        rung: 1,
      };
    }

    if (requestedRung === 2) {
      return {
        source: 'curated',
        visorMood: moodByRung[2],
        headline: isId ? `Petunjuk 2: Fokus Konsep (${card.title})` : `Hint 2: Concept Focus (${card.title})`,
        body: card.inWorldNote.slice(0, 240),
        highlightLines: [1],
        conceptCardId: primaryKC,
        rung: 2,
      };
    }

    if (requestedRung === 3) {
      return {
        source: 'curated',
        visorMood: moodByRung[3],
        headline: isId ? `Petunjuk 3: Kerangka Kode` : `Hint 3: Code Scaffold`,
        body: isId
          ? 'Isi bagian yang kosong pada kerangka berikut untuk membimbing BIT.'
          : 'Fill in the blank parts in the scaffold below to guide BIT.',
        codeSnippet: card.exampleCode,
        conceptCardId: primaryKC,
        rung: 3,
      };
    }

    return {
      source: 'curated',
      visorMood: moodByRung[4],
      headline: isId ? `Petunjuk 4: Contoh Solusi & Penjelasan` : `Hint 4: Worked Solution`,
      body: `${card.summary} — ${card.exampleCaption}`.slice(0, 240),
      codeSnippet: card.exampleCode,
      conceptCardId: primaryKC,
      rung: 4,
    };
  }

  async getConceptCard(kcId: string, locale: Locale): Promise<ConceptCard> {
    const dict = locale === 'en' ? CONCEPTS_EN : CONCEPTS_ID;
    const direct = dict[kcId];
    if (direct) return direct;

    // Fallback to KC registry for R2-R4 concepts
    const kc = getKC(kcId);
    if (kc) {
      return {
        kcId: kc.id,
        title: kc.title[locale],
        summary: kc.practicalExplain[locale],
        exampleCode: `# ${kc.title[locale]}`,
        exampleCaption: kc.description[locale],
        inWorldNote: kc.inGameApplication[locale],
      };
    }

    return {
      kcId,
      title: kcId,
      summary: locale === 'en' ? 'Python concept reference.' : 'Referensi konsep Python.',
      exampleCode: 'print("Aetheria")',
      exampleCaption: locale === 'en' ? 'Example output' : 'Contoh keluaran',
      inWorldNote: locale === 'en' ? 'Used across Aetheria.' : 'Digunakan di seluruh Aetheria.',
    };
  }

  private formatAuthoredHint(
    hint: HintRungContent,
    locale: Locale,
    fallbackConceptId?: string
  ): MentorResponse {
    const moodByRung: Record<1 | 2 | 3 | 4, VisorMood> = {
      1: 'thinking',
      2: 'focused',
      3: 'focused',
      4: 'proud',
    };
    return {
      source: 'curated',
      visorMood: moodByRung[hint.rung],
      headline: hint.headline[locale].slice(0, 90),
      body: hint.body[locale].slice(0, 240),
      ...(hint.socraticQuestion ? { socraticQuestion: hint.socraticQuestion[locale].slice(0, 120) } : {}),
      ...(hint.highlightLines ? { highlightLines: hint.highlightLines } : {}),
      ...(hint.codeSnippet ? { codeSnippet: hint.codeSnippet } : {}),
      ...(hint.conceptCardId ?? (hint.rung >= 2 ? fallbackConceptId : undefined)
        ? { conceptCardId: hint.conceptCardId ?? fallbackConceptId }
        : {}),
      rung: hint.rung,
    };
  }
}

export const curatedMentorProvider = new CuratedMentorProvider();
