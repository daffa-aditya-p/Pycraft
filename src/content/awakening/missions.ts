import type { AssistanceTier } from '../../learning/masteryEngine';
import type { StepASTValidationRules } from '../../learning/validators';
import type { HintRungContent, Locale } from '../../mentor/types';
import type { FunctionTestSpec, RuntimeLimits, ScenarioSpec } from '../../runtime/protocol';

type WorldSimInit = ScenarioSpec['initialState'];

export interface LessonSlide {
  title: { id: string; en: string };
  body: { id: string; en: string };
  exampleCode?: string;
}

export interface MissionStepManifest {
  stepId: string;
  missionId: string;
  order: number;
  isBonus?: boolean;
  title: { id: string; en: string };
  goal: { id: string; en: string };
  targetKCs: string[];
  capabilities: string[];
  requirementChips: { id: string[]; en: string[] };
  xp: number;
  unlocksCosmeticId?: string;
  lessonSlides: LessonSlide[];
  starters: Record<AssistanceTier, string>;
  astRules?: StepASTValidationRules;
  limits?: Partial<RuntimeLimits>;
  scenarios: ScenarioSpec[];
  functionTests?: FunctionTestSpec[];
  hintLadder: HintRungContent[];
  referenceSolution: string;
}

export interface MissionManifest {
  missionId: string;
  questId: string;
  islandId: string;
  order: number;
  title: { id: string; en: string };
  subtitle: { id: string; en: string };
  npcName: string;
  steps: MissionStepManifest[];
}

function emptyGrid(width: number, height: number, extra?: Partial<WorldSimInit>): WorldSimInit {
  return {
    width,
    height,
    seed: 42,
    defaultKind: 'empty',
    defaultElevation: 0,
    ...extra,
  };
}

function makeBridgeScenario(id: string, label: string, gapLength: number): ScenarioSpec {
  const width = gapLength + 3;
  const cells: NonNullable<WorldSimInit['cells']> = [];
  for (let i = 1; i <= gapLength; i++) {
    cells.push({ x: i, y: 0, kind: 'bridge_gap' });
  }
  return {
    id,
    label,
    initialState: {
      width,
      height: 1,
      seed: gapLength * 17,
      robot: { x: 0, y: 0, facing: 'east' },
      bridge: { gapLength, builtLength: 0, complete: false },
      cells,
    },
    predicates: [
      { type: 'bridge_complete', requireExactLength: true },
      { type: 'stdout_matches_regex', pattern: '\\d+\\.\\d+' },
      { type: 'stdout_tokens_in_order', tokens: ['False', 'True'] },
    ],
  };
}

function makeGateScenario(
  id: string,
  label: string,
  crystalColor: 'blue' | 'green' | 'red' | 'white',
  weight: number,
  expectOpen: boolean,
  expectLight: 'off' | 'red' | 'yellow' | 'green'
): ScenarioSpec {
  return {
    id,
    label,
    initialState: {
      width: 3,
      height: 1,
      seed: weight * 11,
      sensor: { crystalColor },
      scale: { weight },
      gate: { isOpen: false, lightColor: 'off' },
      cells: [{ x: 2, y: 0, kind: 'gate' }],
    },
    predicates: [
      { type: 'gate_is_open', expected: expectOpen },
      ...(expectLight !== 'off' ? [{ type: 'gate_light' as const, expected: expectLight }] : []),
    ],
  };
}

function makeFarmRowScenario(id: string, label: string, length: number): ScenarioSpec {
  const cells: NonNullable<WorldSimInit['cells']> = [];
  for (let x = 1; x <= length; x++) {
    cells.push({ x, y: 0, kind: 'soil' });
  }
  return {
    id,
    label,
    initialState: {
      width: length + 1,
      height: 1,
      seed: length * 13,
      robot: { x: 0, y: 0, facing: 'east' },
      farm: {
        rows: 1,
        cols: length,
        rowStarts: [{ x: 0, y: 0, facing: 'east' }],
        plantedCount: 0,
        targetCount: length,
      },
      cells,
    },
    predicates: [{ type: 'farm_planted_count', exact: length, allSoilPlanted: true }],
  };
}

function makeFarmGridScenario(id: string, label: string, rows: number, cols: number): ScenarioSpec {
  const cells: NonNullable<WorldSimInit['cells']> = [];
  const rowStarts: Array<{ x: number; y: number; facing: 'east' }> = [];
  for (let y = 0; y < rows; y++) {
    rowStarts.push({ x: 0, y, facing: 'east' });
    for (let x = 1; x <= cols; x++) {
      cells.push({ x, y, kind: 'soil' });
    }
  }
  return {
    id,
    label,
    initialState: {
      width: cols + 1,
      height: rows,
      seed: rows * 100 + cols,
      robot: { x: 0, y: 0, facing: 'east', rowIndex: 0 },
      farm: {
        rows,
        cols,
        rowStarts,
        plantedCount: 0,
        targetCount: rows * cols,
      },
      cells,
    },
    predicates: [{ type: 'farm_planted_count', exact: rows * cols, allSoilPlanted: true }],
  };
}

function makeCellCorridorScenario(id: string, label: string, cellPositions: number[]): ScenarioSpec {
  const cells: NonNullable<WorldSimInit['cells']> = cellPositions.map((x) => ({
    x,
    y: 0,
    kind: 'cell',
    item: 'cell',
    itemCount: 1,
  }));
  return {
    id,
    label,
    initialState: {
      width: 9,
      height: 1,
      seed: cellPositions.reduce((a, b) => a + b, 0),
      robot: { x: 0, y: 0, facing: 'east' },
      cells,
    },
    predicates: [{ type: 'robot_cargo_at_least', item: 'cell', count: cellPositions.length }],
  };
}

function makeStairScenario(id: string, label: string, n: number): ScenarioSpec {
  const expectedCells = Array.from({ length: n }, (_, idx) => ({
    x: idx + 1,
    y: 0,
    kind: 'block' as const,
    stackHeight: idx + 1,
    blockType: 'stone' as const,
  }));
  return {
    id,
    label,
    initialState: {
      width: n + 2,
      height: 2,
      seed: n * 31,
      robot: { x: 0, y: 1, facing: 'east' },
      farm: { rows: 1, cols: n, rowStarts: [{ x: 0, y: 1, facing: 'east' }], plantedCount: 0, targetCount: 0 },
    },
    predicates: [{ type: 'cells_match_blueprint', cells: expectedCells }],
  };
}

export const AWAKENING_MISSIONS: readonly MissionManifest[] = [
  // =========================================================================
  // MISSION 1 — Hello Architect (Beacon Point)
  // =========================================================================
  {
    missionId: 'm1_hello_architect',
    questId: 'm1_hello_architect',
    islandId: 'beacon_point',
    order: 1,
    title: { id: 'Misi 1: Halo Arsitek', en: 'Mission 1: Hello Architect' },
    subtitle: {
      id: 'Terminal Suar hanya merespons bahasa Python.',
      en: 'The Beacon Terminal only obeys Python.',
    },
    npcName: 'NEO',
    steps: [
      {
        stepId: 'm1_s1',
        missionId: 'm1_hello_architect',
        order: 1,
        title: { id: '1.1 Suara Pertama', en: '1.1 First Voice' },
        goal: {
          id: 'Cetak pesan apa saja ke Terminal Suar menggunakan print().',
          en: 'Print any message to the Beacon Terminal using print().',
        },
        targetKCs: ['F1', 'F2', 'F3'],
        capabilities: ['print', 'beacon.print'],
        requirementChips: { id: ['Gunakan: print(...)'], en: ['Use: print(...)'] },
        xp: 25,
        lessonSlides: [
          {
            title: { id: 'Bahasa para Arsitek', en: 'Language of the Architects' },
            body: {
              id: 'Program adalah daftar instruksi yang dijalankan dari atas ke bawah. Gunakan print("...") untuk mengirim pesan.',
              en: 'A program runs top to bottom. Use print("...") to display a message.',
            },
            exampleCode: 'print("NEO online")',
          },
        ],
        starters: {
          guided: 'print("___")',
          assisted: '# TODO: cetak pesan salam ke layar Suar\nprint("")',
          independent: '# Cetak pesan pertamamu ke Terminal Suar\n',
          mastery: '',
        },
        scenarios: [
          {
            id: 'm1_s1_main',
            label: 'Suar Utama',
            initialState: emptyGrid(3, 1),
            predicates: [{ type: 'stdout_non_empty', minLines: 1 }],
          },
        ],
        hintLadder: [
          {
            rung: 1,
            headline: { id: 'Bagaimana cara menyapa Suar?', en: 'How do you greet the Beacon?' },
            body: {
              id: 'Teks di Python harus diapit tanda kutip di dalam tanda kurung print().',
              en: 'Text in Python must be wrapped in quotes inside print().',
            },
            socraticQuestion: {
              id: 'Teks apa yang ingin kamu tampilkan di layar Suar?',
              en: 'What message do you want to show on the Beacon screen?',
            },
          },
          {
            rung: 2,
            headline: { id: 'Periksa Baris 1', en: 'Check Line 1' },
            body: {
              id: 'Isi bagian kosong di antara tanda kutip pada baris 1.',
              en: 'Fill in the blank inside the quotation marks on line 1.',
            },
            highlightLines: [1],
            conceptCardId: 'F2',
          },
          {
            rung: 3,
            headline: { id: 'Kerangka Kode', en: 'Code Scaffold' },
            body: {
              id: 'Ganti ___ dengan kata apa saja, misalnya Halo Aetheria.',
              en: 'Replace ___ with any greeting text.',
            },
            codeSnippet: 'print("___")',
          },
          {
            rung: 4,
            headline: { id: 'Contoh Solusi', en: 'Worked Solution' },
            body: {
              id: 'print() mengirim teks di dalam tanda kutip ke konsol dan layar Suar.',
              en: 'print() sends the quoted text to the console and Beacon screen.',
            },
            codeSnippet: 'print("Halo, Aetheria!")',
          },
        ],
        referenceSolution: 'print("Halo, Aetheria!")',
      },
      {
        stepId: 'm1_s2',
        missionId: 'm1_hello_architect',
        order: 2,
        title: { id: '1.2 Pesan untuk NEO', en: '1.2 Message for NEO' },
        goal: {
          id: 'Cetak 3 baris daftar boot NEO secara berurutan: "Sistem suara", "Sistem memori", lalu "Siap".',
          en: 'Print NEO’s 3 boot lines in order: "Sistem suara", "Sistem memori", then "Siap".',
        },
        targetKCs: ['F2', 'F7'],
        capabilities: ['print', 'beacon.print'],
        requirementChips: {
          id: ['Urutan: Sistem suara -> Sistem memori -> Siap'],
          en: ['Order: Sistem suara -> Sistem memori -> Siap'],
        },
        xp: 30,
        lessonSlides: [
          {
            title: { id: 'Berjalan dari Atas ke Bawah', en: 'Top-to-Bottom Order' },
            body: {
              id: 'Python mengeksekusi setiap perintah print() satu per satu dari baris paling atas.',
              en: 'Python runs each print() statement sequentially from top to bottom.',
            },
            exampleCode: 'print("Satu")\nprint("Dua")',
          },
        ],
        starters: {
          guided: 'print("___")\nprint("___")\nprint("___")',
          assisted: '# TODO: cetak 3 status boot NEO secara berurutan\nprint("Sistem suara")\nprint("")\nprint("")',
          independent: '# Cetak: Sistem suara, Sistem memori, Siap\n',
          mastery: '',
        },
        scenarios: [
          {
            id: 'm1_s2_main',
            label: 'Boot NEO',
            initialState: emptyGrid(3, 1),
            predicates: [
              {
                type: 'stdout_tokens_in_order',
                tokens: ['Sistem suara', 'Sistem memori', 'Siap'],
                caseInsensitive: true,
              },
            ],
          },
        ],
        hintLadder: [
          {
            rung: 1,
            headline: { id: 'Urutan Boot', en: 'Boot Order' },
            body: {
              id: 'NEO butuh ketiga pesan muncul dalam urutan yang tepat dari atas ke bawah.',
              en: 'NEO needs all three lines to appear in exact top-to-bottom order.',
            },
            socraticQuestion: {
              id: 'Baris mana yang harus dijalankan pertama kali oleh Python?',
              en: 'Which line should Python execute first?',
            },
          },
          {
            rung: 2,
            headline: { id: 'Tiga Baris Berurutan', en: 'Three Sequential Lines' },
            body: {
              id: 'Gunakan tiga baris print() berurutan: suara dulu, memori kedua, siap terakhir.',
              en: 'Write three print() lines in order: suara, memori, Siap.',
            },
            highlightLines: [1, 2, 3],
            conceptCardId: 'F7',
          },
          {
            rung: 3,
            headline: { id: 'Kerangka Daftar Boot', en: 'Checklist Scaffold' },
            body: { id: 'Lengkapi baris kedua dan ketiga.', en: 'Complete the second and third lines.' },
            codeSnippet: 'print("Sistem suara")\nprint("___")\nprint("___")',
          },
          {
            rung: 4,
            headline: { id: 'Contoh Solusi', en: 'Worked Solution' },
            body: {
              id: 'Setiap baris print() berjalan tepat sesuai urutannya.',
              en: 'Each print() executes in top-to-bottom order.',
            },
            codeSnippet: 'print("Sistem suara")\nprint("Sistem memori")\nprint("Siap")',
          },
        ],
        referenceSolution: 'print("Sistem suara")\nprint("Sistem memori")\nprint("Siap")',
      },
      {
        stepId: 'm1_s3',
        missionId: 'm1_hello_architect',
        order: 3,
        title: { id: '1.3 Catatan Arsitek', en: "1.3 Architect's Notes" },
        goal: {
          id: 'Nonaktifkan 2 baris perintah merah yang rusak dengan tanda komentar #, tanpa menghapus pesan "Suar stabil".',
          en: 'Comment out the 2 faulty red-flash lines using #, keeping "Suar stabil".',
        },
        targetKCs: ['F4', 'F8'],
        capabilities: ['print', 'beacon.print'],
        requirementChips: {
          id: ['Wajib: minimal 1 komentar #', 'Jangan cetak: FLASH_RED'],
          en: ['Require: # comment', 'Exclude: FLASH_RED'],
        },
        xp: 30,
        lessonSlides: [
          {
            title: { id: 'Komentar Arsitek (#)', en: 'Architect Comments (#)' },
            body: {
              id: 'Python melewati segala sesuatu setelah tanda # pada baris tersebut. Ini membantu mematikan baris bermasalah.',
              en: 'Python ignores everything after # on a line, letting you disable broken commands safely.',
            },
            exampleCode: '# print("RUSAK")\nprint("Aman")',
          },
        ],
        starters: {
          guided: '# Tandai 2 baris bermasalah dengan # di awal baris:\n___print("FLASH_RED_1")\n___print("FLASH_RED_2")\nprint("Suar stabil")',
          assisted: '# TODO: nonaktifkan kedua baris FLASH_RED menggunakan #\nprint("FLASH_RED_1")\nprint("FLASH_RED_2")\nprint("Suar stabil")',
          independent: 'print("FLASH_RED_1")\nprint("FLASH_RED_2")\nprint("Suar stabil")',
          mastery: '',
        },
        astRules: {
          requireComment: true,
          minCommentCount: 2,
        },
        scenarios: [
          {
            id: 'm1_s3_main',
            label: 'Stabilkan Suar',
            initialState: emptyGrid(3, 1),
            predicates: [
              { type: 'stdout_not_contains', text: 'FLASH_RED' },
              { type: 'stdout_contains', text: 'Suar stabil', caseInsensitive: true },
            ],
          },
        ],
        hintLadder: [
          {
            rung: 1,
            headline: { id: 'Mengapa Suar Berkedip Merah?', en: 'Why Is It Flashing Red?' },
            body: {
              id: 'Dua baris masih mencetak teks FLASH_RED. Kita tidak perlu menghapusnya — cukup jadikan komentar.',
              en: 'Two lines still print FLASH_RED. Comment them out instead of deleting.',
            },
            socraticQuestion: {
              id: 'Simbol apa yang membuat Python melewati sebuah baris?',
              en: 'Which symbol tells Python to ignore a line?',
            },
          },
          {
            rung: 2,
            headline: { id: 'Tambahkan # di Awal Baris', en: 'Prefix Lines with #' },
            body: {
              id: 'Tambahkan # di depan dua baris FLASH_RED.',
              en: 'Place # at the start of both FLASH_RED lines.',
            },
            highlightLines: [2, 3],
            conceptCardId: 'F4',
          },
          {
            rung: 3,
            headline: { id: 'Kerangka Kode', en: 'Code Scaffold' },
            body: { id: 'Isi # pada awal baris bermasalah.', en: 'Add # before each faulty print.' },
            codeSnippet: '# print("FLASH_RED_1")\n# print("FLASH_RED_2")\nprint("Suar stabil")',
          },
          {
            rung: 4,
            headline: { id: 'Contoh Solusi', en: 'Worked Solution' },
            body: {
              id: 'Komentar # membuat Python melewati baris rusak sehingga hanya "Suar stabil" yang berjalan.',
              en: '# comments skip both faulty prints so only "Suar stabil" runs.',
            },
            codeSnippet: '# print("FLASH_RED_1")\n# print("FLASH_RED_2")\nprint("Suar stabil")',
          },
        ],
        referenceSolution: '# print("FLASH_RED_1")\n# print("FLASH_RED_2")\nprint("Suar stabil")',
      },
      {
        stepId: 'm1_s4',
        missionId: 'm1_hello_architect',
        order: 4,
        title: { id: '1.4 Papan Tanda', en: '1.4 The Signpost' },
        goal: {
          id: 'Buat papan tanda 3 baris yang berisi tanda kutip " menggunakan tepat SATU perintah print().',
          en: 'Write a 3-line signpost containing a quote " using exactly ONE print() call.',
        },
        targetKCs: ['F3', 'F5'],
        capabilities: ['print', 'beacon.print'],
        requirementChips: {
          id: ['Tepat 1 print()', 'Minimal 3 baris output', 'Mengandung tanda "'],
          en: ['Exactly 1 print()', '3+ output lines', 'Contains " quote'],
        },
        xp: 30,
        lessonSlides: [
          {
            title: { id: 'Karakter Escape \\n dan \\"', en: 'Escape Characters \\n and \\"' },
            body: {
              id: 'Gunakan \\n untuk pindah ke baris baru dan \\" untuk menulis tanda kutip di dalam string.',
              en: 'Use \\n for a newline and \\" to include a literal double quote inside a string.',
            },
            exampleCode: 'print("Jembatan\\nRusak\\n\\"Hati-hati!\\"")',
          },
        ],
        starters: {
          guided: 'print("Jembatan___Rusak___\\"Hati-hati!\\"")',
          assisted: '# TODO: gunakan \\n agar papan tanda punya 3 baris dan tanda \\" di dalam satu print\nprint("Jembatan...")',
          independent: '# Satu print(), 3 baris output, ada tanda kutip "\n',
          mastery: '',
        },
        astRules: {
          maxPrintCalls: 1,
          exactPrintCalls: 1,
        },
        scenarios: [
          {
            id: 'm1_s4_main',
            label: 'Papan Tanda Kayu',
            initialState: emptyGrid(3, 1),
            predicates: [
              { type: 'stdout_line_count', min: 3 },
              { type: 'stdout_contains', text: '"' },
            ],
          },
        ],
        hintLadder: [
          {
            rung: 1,
            headline: { id: 'Baris Baru dalam Satu print()', en: 'Newlines in One print()' },
            body: {
              id: 'Bagaimana Python tahu kamu ingin pindah ke baris baru, bukan mencetak huruf n?',
              en: 'How does Python know you want a line break instead of the letter n?',
            },
            socraticQuestion: {
              id: 'Simbol apa yang mengawali \\n dan \\"?',
              en: 'Which character starts \\n and \\"?',
            },
          },
          {
            rung: 2,
            headline: { id: 'Gunakan \\n dan \\"', en: 'Use \\n and \\"' },
            body: {
              id: 'Sisipkan \\n di antara tiga frasa pada baris 1.',
              en: 'Insert \\n between the three lines inside your single string.',
            },
            highlightLines: [1],
            conceptCardId: 'F5',
          },
          {
            rung: 3,
            headline: { id: 'Kerangka Papan Tanda', en: 'Signpost Scaffold' },
            body: { id: 'Lengkapi baris ketiga di dalam kutip.', en: 'Complete the third line inside quotes.' },
            codeSnippet: 'print("Jembatan\\nRusak\\n\\"___\\"")',
          },
          {
            rung: 4,
            headline: { id: 'Contoh Solusi', en: 'Worked Solution' },
            body: {
              id: '\\n memutus teks menjadi 3 baris dan \\" menampilkan kutip di dalam teks.',
              en: '\\n splits the output into 3 lines and \\" prints a literal quote.',
            },
            codeSnippet: 'print("Jembatan\\nRusak\\n\\"Hati-hati!\\"")',
          },
        ],
        referenceSolution: 'print("Jembatan\\nRusak\\n\\"Hati-hati!\\"")',
      },
      {
        stepId: 'm1_s5',
        missionId: 'm1_hello_architect',
        order: 5,
        title: { id: '1.5 Siapa Namamu?', en: '1.5 What Is Your Name?' },
        goal: {
          id: 'Minta nama Arsitek dengan input(), simpan ke variabel, lalu cetak salam yang menyebut nama itu (Suar menguji beberapa nama secara dinamis).',
          en: 'Ask the Architect’s name with input(), store it in a variable, and print a greeting using that variable (tested dynamically with multiple names).',
        },
        targetKCs: ['F6', 'V1', 'F2'],
        capabilities: ['print', 'input', 'beacon.print'],
        requirementChips: { id: ['Gunakan: input(...)'], en: ['Use: input(...)'] },
        xp: 35,
        lessonSlides: [
          {
            title: { id: 'Membaca Masukan dengan input()', en: 'Reading User Input' },
            body: {
              id: 'input("...") menunggu jawaban dan menyimpannya ke variabel agar bisa dicetak ulang secara dinamis untuk nama apa pun (misal "Rara" maupun "Budi Santoso"). Jangan menulis nama secara statis di dalam print()!',
              en: 'input("...") waits for an answer and stores it in a variable so print() greets any name dynamically (e.g. "Rara" or "Budi Santoso") instead of hardcoding.',
            },
            exampleCode: 'nama = input("Siapa namamu? ")\nprint("Selamat datang,", nama)',
          },
        ],
        starters: {
          guided: 'nama = input("___")\nprint("Selamat datang,", ___)',
          assisted: '# TODO: baca nama dengan input() lalu sapa nama tersebut\nnama = input("Siapa namamu? ")\nprint()',
          independent: '# Gunakan input() dan cetak salam dengan nama tersebut\n',
          mastery: '',
        },
        scenarios: [
          {
            id: 'm1_s5_rara',
            label: 'Arsitek Rara',
            initialState: emptyGrid(3, 1),
            scriptedInputs: ['Rara'],
            predicates: [{ type: 'stdout_contains', text: 'Rara' }],
          },
          {
            id: 'm1_s5_budi',
            label: 'Arsitek Budi',
            initialState: emptyGrid(3, 1),
            scriptedInputs: ['Budi Santoso'],
            predicates: [{ type: 'stdout_contains', text: 'Budi Santoso' }],
          },
        ],
        hintLadder: [
          {
            rung: 1,
            headline: { id: 'Menyimpan Jawaban', en: 'Storing the Answer' },
            body: {
              id: 'Jika jawaban tidak disimpan ke variabel, print() tidak tahu apa yang harus disapa.',
              en: 'If you do not save input() in a variable, print() cannot reuse it.',
            },
            socraticQuestion: {
              id: 'Variabel apa yang menyimpan teks dari input()?',
              en: 'Which variable holds the text returned by input()?',
            },
          },
          {
            rung: 2,
            headline: { id: 'Gunakan Variabel nama', en: 'Use the nama Variable' },
            body: {
              id: 'Pastikan baris 2 mencetak variabel `nama` tanpa tanda kutip di sekitar nama variabel.',
              en: 'Print the variable `nama` on line 2 without quotes around the variable name.',
            },
            highlightLines: [1, 2],
            conceptCardId: 'F6',
          },
          {
            rung: 3,
            headline: { id: 'Kerangka Kode', en: 'Code Scaffold' },
            body: { id: 'Isi variabel nama di dalam print().', en: 'Pass `nama` to print().' },
            codeSnippet: 'nama = input("Siapa namamu? ")\nprint("Halo,", nama)',
          },
          {
            rung: 4,
            headline: { id: 'Contoh Solusi', en: 'Worked Solution' },
            body: {
              id: 'input() bekerja untuk nama siapa pun yang diuji Suar ("Rara" maupun "Budi Santoso").',
              en: 'input() works dynamically for every scripted Architect name.',
            },
            codeSnippet: 'nama = input("Siapa namamu? ")\nprint("Selamat datang,", nama)',
          },
        ],
        referenceSolution: 'nama = input("Siapa namamu? ")\nprint("Selamat datang,", nama)',
      },
      {
        stepId: 'm1_bonus',
        missionId: 'm1_hello_architect',
        order: 6,
        isBonus: true,
        title: { id: 'Bonus 1: Spanduk Suar', en: 'Bonus 1: Beacon Banner' },
        goal: {
          id: 'Cetak spanduk ASCII minimal 3 baris menggunakan \\n dan tab \\t dalam satu print().',
          en: 'Print a 3+ line ASCII banner with \\n and \\t in a single print().',
        },
        targetKCs: ['F5'],
        capabilities: ['print', 'beacon.print'],
        requirementChips: {
          id: ['Tepat 1 print()', '3+ baris', 'Mengandung \\t'],
          en: ['Exactly 1 print()', '3+ lines', 'Includes \\t tab'],
        },
        xp: 50,
        unlocksCosmeticId: 'neo_visor_amber',
        lessonSlides: [
          {
            title: { id: 'Merapikan Kolom dengan \\t', en: 'Aligning with \\t' },
            body: {
              id: '`\\t` menyisipkan jarak tab horizontal, sedangkan `\\n` memutus baris di dalam satu perintah `print()`.',
              en: '`\\t` inserts a horizontal tab stop while `\\n` breaks lines inside a single `print()` call.',
            },
            exampleCode: 'print("===\\tSUAR\\t===\\n\\tAKTIF\\n===")',
          },
        ],
        starters: {
          guided: 'print("===\\tSUAR\\t===\\n___\\n===")',
          assisted: 'print("===\\tAETHERIA\\t===\\n...")',
          independent: '# Cetak spanduk 3+ baris dengan \\n dan \\t dalam satu print()\n',
          mastery: '# Bonus Mahir: satu print(), 3+ baris, mengandung \\t\n',
        },
        astRules: {
          maxPrintCalls: 1,
          exactPrintCalls: 1,
        },
        scenarios: [
          {
            id: 'm1_bonus_main',
            label: 'Spanduk Suar',
            initialState: emptyGrid(3, 1),
            predicates: [
              { type: 'stdout_line_count', min: 3 },
              { type: 'stdout_matches_regex', pattern: '\\t' },
            ],
          },
        ],
        hintLadder: [
          {
            rung: 1,
            headline: { id: 'Tab dan Baris Baru', en: 'Tabs and Newlines' },
            body: { id: 'Gabungkan \\t dan \\n di satu string.', en: 'Combine \\t and \\n inside one string.' },
          },
          {
            rung: 2,
            headline: { id: 'Satu print()', en: 'Single print()' },
            body: { id: 'Pastikan hanya ada satu print() dalam kodemu.', en: 'Keep only one print() call.' },
            highlightLines: [1],
            conceptCardId: 'F5',
          },
          {
            rung: 3,
            headline: { id: 'Kerangka Spanduk', en: 'Banner Scaffold' },
            body: { id: 'Tambahkan satu baris lagi dengan \\n.', en: 'Add another \\n line.' },
            codeSnippet: 'print("===\\tPYCRAFT\\t===\\n\\tSUAR AKTIF\\n===")',
          },
          {
            rung: 4,
            headline: { id: 'Contoh Solusi', en: 'Worked Solution' },
            body: { id: 'Satu print() mencetak spanduk 3 baris dengan tab.', en: 'One print() outputs a 3-line tabbed banner.' },
            codeSnippet: 'print("===\\tPYCRAFT\\t===\\n\\tSUAR AKTIF\\n==================")',
          },
        ],
        referenceSolution: 'print("===\\tPYCRAFT\\t===\\n\\tSUAR AKTIF\\n==================")',
      },
    ],
  },

  // =========================================================================
  // MISSION 2 — Data Collector (Supply Grove)
  // =========================================================================
  {
    missionId: 'm2_data_collector',
    questId: 'm2_data_collector',
    islandId: 'supply_grove',
    order: 2,
    title: { id: 'Misi 2: Pengumpul Data', en: 'Mission 2: Data Collector' },
    subtitle: {
      id: 'Variabel, angka, konversi int(), dan jembatan kayu.',
      en: 'Variables, numbers, int() conversion, and the plank bridge.',
    },
    npcName: 'NEO & BIT',
    steps: [
      {
        stepId: 'm2_s1',
        missionId: 'm2_data_collector',
        order: 1,
        title: { id: '2.1 Kotak Bernama', en: '2.1 Labeled Boxes' },
        goal: {
          id: 'Buat variabel kayu = 4, tampilkan dengan robot.say(kayu), lalu ubah kayu menjadi 6 dan tampilkan lagi.',
          en: 'Set kayu = 4, call robot.say(kayu), reassign kayu = 6, and call robot.say(kayu) again.',
        },
        targetKCs: ['V1', 'D2'],
        capabilities: ['print', 'robot.say'],
        requirementChips: {
          id: ['Ubah nilai variabel yang sama', 'BIT ucap: 4 lalu 6'],
          en: ['Reassign the same variable', 'BIT says 4 then 6'],
        },
        xp: 35,
        lessonSlides: [
          {
            title: { id: 'Variabel Itu Seperti Kotak Berlabel', en: 'Variables Are Labeled Boxes' },
            body: {
              id: 'Gunakan `kayu = 4` untuk mengisi kotak. Kamu bisa mengganti isinya kapan saja dengan `kayu = 6`.',
              en: 'Use `kayu = 4` to store a value, then reassign `kayu = 6` to update it.',
            },
            exampleCode: 'kayu = 4\nrobot.say(kayu)',
          },
        ],
        starters: {
          guided: 'kayu = ___\nrobot.say(kayu)\nkayu = ___\nrobot.say(kayu)',
          assisted: '# TODO: isi kayu = 4, ucapkan, ubah jadi 6, ucapkan lagi\nkayu = 4\n',
          independent: '# Simpan 4 di variabel kayu, ucapkan, ubah ke 6, ucapkan lagi\n',
          mastery: '',
        },
        astRules: {
          requireExtendedConstructs: ['ReassignVar'],
        },
        scenarios: [
          {
            id: 'm2_s1_main',
            label: 'Kotak Kayu',
            initialState: emptyGrid(3, 1, { robot: { x: 1, y: 0, facing: 'east' } }),
            predicates: [{ type: 'robot_say_equals', expected: ['4', '6'], exact: true }],
          },
        ],
        hintLadder: [
          {
            rung: 1,
            headline: { id: 'Mengubah Isi Kotak', en: 'Updating the Box' },
            body: { id: 'Variabel yang sama bisa diberi nilai baru dengan tanda =.', en: 'Assigning again with = replaces the old value.' },
            socraticQuestion: { id: 'Berapa nilai awal dan nilai baru variabel kayu?', en: 'What are the first and updated values of kayu?' },
          },
          {
            rung: 2,
            headline: { id: 'Urutan Ucap', en: 'Speak Order' },
            body: { id: 'Panggil robot.say(kayu) tepat setelah setiap pengisian.', en: 'Call robot.say(kayu) right after each assignment.' },
            highlightLines: [1, 2, 3, 4],
            conceptCardId: 'V1',
          },
          {
            rung: 3,
            headline: { id: 'Kerangka Kode', en: 'Code Scaffold' },
            body: { id: 'Isi angka 4 dan 6.', en: 'Fill in 4 and 6.' },
            codeSnippet: 'kayu = 4\nrobot.say(kayu)\nkayu = ___\nrobot.say(kayu)',
          },
          {
            rung: 4,
            headline: { id: 'Contoh Solusi', en: 'Worked Solution' },
            body: { id: 'Panel Variabel menampilkan kayu berubah dari 4 menjadi 6.', en: 'Variables Panel tracks kayu updating from 4 to 6.' },
            codeSnippet: 'kayu = 4\nrobot.say(kayu)\nkayu = 6\nrobot.say(kayu)',
          },
        ],
        referenceSolution: 'kayu = 4\nrobot.say(kayu)\nkayu = 6\nrobot.say(kayu)',
      },
      {
        stepId: 'm2_s2',
        missionId: 'm2_data_collector',
        order: 2,
        title: { id: '2.2 Jalan BIT', en: '2.2 Drive BIT' },
        goal: {
          id: 'Simpan langkah = 3, gerakkan BIT maju dengan robot.move(langkah), lalu belok kanan dan maju 1 langkah ke titik peti.',
          en: 'Store langkah = 3, call robot.move(langkah), turn right, and move 1 step to the crate spot.',
        },
        targetKCs: ['V1', 'D2'],
        capabilities: ['print', 'robot.move', 'robot.turn'],
        requirementChips: {
          id: ['Pakai variabel di robot.move(langkah)', 'Capai koordinat (3, 1)'],
          en: ['Pass variable to robot.move(langkah)', 'Reach (3, 1)'],
        },
        xp: 40,
        lessonSlides: [
          {
            title: { id: 'Mengirim Variabel ke Robot', en: 'Passing Variables to BIT' },
            body: {
              id: 'Kamu bisa meneruskan nama variabel langsung ke `robot.move(langkah)` dan mengarahkan BIT dengan `robot.turn("right")`.',
              en: 'Pass a variable directly into `robot.move(langkah)` and steer with `robot.turn("right")`.',
            },
            exampleCode: 'langkah = 3\nrobot.move(langkah)',
          },
        ],
        starters: {
          guided: 'langkah = ___\nrobot.move(langkah)\nrobot.turn("___")\nrobot.move(1)',
          assisted: '# TODO: set langkah = 3, maju, belok kanan, maju 1 langkah\nlangkah = 3\n',
          independent: '# Gunakan variabel langkah = 3, robot.move(langkah), dan robot.turn("right")\n',
          mastery: '',
        },
        astRules: {
          requireExtendedConstructs: ['NameArg:move'],
        },
        scenarios: [
          {
            id: 'm2_s2_main',
            label: 'Rute Peti',
            initialState: emptyGrid(5, 3, {
              robot: { x: 0, y: 0, facing: 'east' },
              cells: [{ x: 3, y: 2, kind: 'crate', label: '12' }],
            }),
            predicates: [{ type: 'robot_at', x: 3, y: 1 }],
          },
        ],
        hintLadder: [
          {
            rung: 1,
            headline: { id: 'Arah Hadap BIT', en: 'BIT Heading' },
            body: { id: 'BIT mulai menghadap timur (east). Belok kanan mengarahkannya ke selatan menuju (3, 1).', en: 'BIT starts facing east. Turning right faces south toward (3, 1).' },
            socraticQuestion: { id: 'Ke arah mana BIT berbelok setelah maju 3 petak?', en: 'Which way should BIT turn after moving 3 tiles?' },
          },
          {
            rung: 2,
            headline: { id: 'Gunakan Variabel langkah', en: 'Use Variable langkah' },
            body: { id: 'Pastikan memanggil robot.move(langkah), bukan angka langsung.', en: 'Pass `langkah` into robot.move(langkah).' },
            highlightLines: [1, 2],
            conceptCardId: 'D2',
          },
          {
            rung: 3,
            headline: { id: 'Kerangka Rute', en: 'Route Scaffold' },
            body: { id: 'Lengkapi arah belok "right".', en: 'Fill in "right".' },
            codeSnippet: 'langkah = 3\nrobot.move(langkah)\nrobot.turn("___")\nrobot.move(1)',
          },
          {
            rung: 4,
            headline: { id: 'Contoh Solusi', en: 'Worked Solution' },
            body: { id: 'BIT melangkah 3 ke timur lalu berbelok ke selatan tepat di depan peti.', en: 'BIT moves 3 east, turns right, and stops right beside the crate.' },
            codeSnippet: 'langkah = 3\nrobot.move(langkah)\nrobot.turn("right")\nrobot.move(1)',
          },
        ],
        referenceSolution: 'langkah = 3\nrobot.move(langkah)\nrobot.turn("right")\nrobot.move(1)',
      },
      {
        stepId: 'm2_s3',
        missionId: 'm2_data_collector',
        order: 3,
        title: { id: '2.3 Membaca Label', en: '2.3 Reading the Label' },
        goal: {
          id: 'Pindai label peti dengan robot.scan(), ubah menjadi bilangan bulat dengan int(), tambah 3, lalu ucapkan hasilnya dengan robot.say().',
          en: 'Scan the crate label, convert with int(), add 3, and have BIT say the result.',
        },
        targetKCs: ['D6', 'D2'],
        capabilities: ['print', 'robot.scan', 'robot.say'],
        requirementChips: {
          id: ['Konversi str -> int()', 'Lulus 3 skenario label'],
          en: ['Convert str -> int()', 'Pass 3 label scenarios'],
        },
        xp: 45,
        lessonSlides: [
          {
            title: { id: 'Mengapa label + 3 Error?', en: 'Why Does label + 3 Fail?' },
            body: {
              id: 'robot.scan() membaca label sebagai teks ("12"). Di Python, teks + angka memicu TypeError. Gunakan int(label) + 3!',
              en: 'robot.scan() returns text ("12"). Adding text and a number raises TypeError — convert with int(label) first.',
            },
            exampleCode: 'label = robot.scan()\nrobot.say(int(label) + 3)',
          },
        ],
        starters: {
          guided: 'label = robot.scan()\nhasil = ___(label) + 3\nrobot.say(hasil)',
          assisted: '# TODO: robot.scan() mengembalikan teks; ubah dengan int() sebelum + 3\nlabel = robot.scan()\nrobot.say(label + 3)',
          independent: '# Pindai label peti, ubah ke int, tambah 3, dan ucapkan dengan robot.say()\n',
          mastery: '',
        },
        scenarios: [
          {
            id: 'm2_s3_12',
            label: 'Label "12"',
            initialState: emptyGrid(3, 1, {
              robot: { x: 0, y: 0, facing: 'east' },
              cells: [{ x: 1, y: 0, kind: 'crate', label: '12' }],
            }),
            predicates: [{ type: 'robot_say_equals', expected: ['15'], exact: true }],
          },
          {
            id: 'm2_s3_7',
            label: 'Label "7"',
            initialState: emptyGrid(3, 1, {
              robot: { x: 0, y: 0, facing: 'east' },
              cells: [{ x: 1, y: 0, kind: 'crate', label: '7' }],
            }),
            predicates: [{ type: 'robot_say_equals', expected: ['10'], exact: true }],
          },
          {
            id: 'm2_s3_20',
            label: 'Label "20"',
            initialState: emptyGrid(3, 1, {
              robot: { x: 0, y: 0, facing: 'east' },
              cells: [{ x: 1, y: 0, kind: 'crate', label: '20' }],
            }),
            predicates: [{ type: 'robot_say_equals', expected: ['23'], exact: true }],
          },
        ],
        hintLadder: [
          {
            rung: 1,
            headline: { id: 'Teks vs Angka', en: 'Text vs Numbers' },
            body: { id: 'Jika mencoba `label + 3`, Python menolak karena `label` bertipe str.', en: '`label + 3` fails because `label` is a string.' },
            socraticQuestion: { id: 'Fungsi apa yang mengubah teks `"12"` menjadi bilangan bulat `12`?', en: 'Which function turns `"12"` into integer `12`?' },
          },
          {
            rung: 2,
            headline: { id: 'Gunakan int() & Kartu Mikro +/*', en: 'Use int() & +/* Micro-Card' },
            body: { id: 'Bungkus `label` di dalam `int(label)` sebelum menambahkan 3.', en: 'Wrap `label` inside `int(label)` before adding 3.' },
            highlightLines: [2],
            conceptCardId: 'T1_ARITH',
          },
          {
            rung: 3,
            headline: { id: 'Kerangka Konversi', en: 'Conversion Scaffold' },
            body: { id: 'Gunakan int(label) + 3.', en: 'Use int(label) + 3.' },
            codeSnippet: 'label = robot.scan()\nhasil = int(label) + 3\nrobot.say(___)',
          },
          {
            rung: 4,
            headline: { id: 'Contoh Solusi', en: 'Worked Solution' },
            body: { id: 'int(label) mengubah teks pemindai menjadi angka di semua skenario.', en: 'int(label) converts the scanned string across all crates.' },
            codeSnippet: 'label = robot.scan()\nhasil = int(label) + 3\nrobot.say(hasil)',
          },
        ],
        referenceSolution: 'label = robot.scan()\nhasil = int(label) + 3\nrobot.say(hasil)',
      },
      {
        stepId: 'm2_s4',
        missionId: 'm2_data_collector',
        order: 4,
        title: { id: '2.4 Jembatan Data', en: '2.4 Data Bridge' },
        goal: {
          id: 'Cetak robot.can_move() sebelum membangun, ukur jarak celah dengan robot.measure(), bangun jembatan dengan bridge.build(jarak), cetak total_berat = jarak * 1.5 (float), lalu cetak robot.can_move() sesudahnya.',
          en: 'Print robot.can_move() before building, measure gap with robot.measure(), call bridge.build(jarak), print float total_berat = jarak * 1.5, and print robot.can_move() after.',
        },
        targetKCs: ['D3', 'D5', 'V1'],
        capabilities: ['print', 'robot.measure', 'robot.can_move', 'bridge.build'],
        requirementChips: {
          id: ['Ukur celah dinamis', 'Cetak float jarak * 1.5', 'Cetak False lalu True'],
          en: ['Dynamic gap measure', 'Print float weight', 'Print False then True'],
        },
        xp: 55,
        lessonSlides: [
          {
            title: { id: 'Mengukur & Membangun Jembatan', en: 'Measure & Build Bridge' },
            body: {
              id: 'Jangan menebak panjang celah! Gunakan `robot.measure()` agar kodemu berhasil untuk celah 4, 5, maupun 6 petak.',
              en: 'Never hardcode bridge length! `robot.measure()` works across 4, 5, or 6 tile gaps.',
            },
            exampleCode: 'jarak = robot.measure()\nbridge.build(jarak)',
          },
        ],
        starters: {
          guided: 'print(robot.can_move())\njarak = robot.___()\nbridge.build(jarak)\ntotal_berat = jarak * ___\nprint(total_berat)\nprint(robot.can_move())',
          assisted: '# TODO: cetak can_move() sebelum, measure, bridge.build, hitung berat * 1.5, cetak can_move() sesudah\nprint(robot.can_move())\n',
          independent: '# Bangun jembatan sesuai robot.measure() dan laporkan berat float + status can_move()\n',
          mastery: '',
        },
        scenarios: [
          makeBridgeScenario('m2_s4_gap4', 'Celah 4', 4),
          makeBridgeScenario('m2_s4_gap5', 'Celah 5', 5),
          makeBridgeScenario('m2_s4_gap6', 'Celah 6', 6),
        ],
        hintLadder: [
          {
            rung: 1,
            headline: { id: 'Mengapa Tidak Boleh Menebak Angka 4?', en: 'Why Not Hardcode 4?' },
            body: { id: 'Ada skenario tersembunyi dengan celah sepanjang 5 dan 6 petak.', en: 'Hidden scenarios have gaps of 5 and 6 tiles.' },
            socraticQuestion: { id: 'Perintah sensor apa yang menghitung jumlah petak celah?', en: 'Which sensor command counts the bridge gap tiles?' },
          },
          {
            rung: 2,
            headline: { id: 'Cek Berat Desimal (float)', en: 'Check Decimal Weight (float)' },
            body: { id: 'Kalikan jarak dengan 1.5 untuk mendapat angka float.', en: 'Multiply jarak by 1.5 to compute total_berat.' },
            highlightLines: [2, 4],
            conceptCardId: 'D3',
          },
          {
            rung: 3,
            headline: { id: 'Kerangka Jembatan', en: 'Bridge Scaffold' },
            body: { id: 'Lengkapi measure() dan 1.5.', en: 'Fill in measure() and 1.5.' },
            codeSnippet: 'print(robot.can_move())\njarak = robot.measure()\nbridge.build(jarak)\ntotal_berat = jarak * 1.5\nprint(total_berat)\nprint(robot.can_move())',
          },
          {
            rung: 4,
            headline: { id: 'Contoh Solusi', en: 'Worked Solution' },
            body: { id: 'Sebelum dibangun can_move() bernilai False, setelah jembatan selesai bernilai True.', en: 'can_move() flips from False to True once the bridge is built.' },
            codeSnippet: 'print(robot.can_move())\njarak = robot.measure()\nbridge.build(jarak)\ntotal_berat = jarak * 1.5\nprint(total_berat)\nprint(robot.can_move())',
          },
        ],
        referenceSolution: 'print(robot.can_move())\njarak = robot.measure()\nbridge.build(jarak)\ntotal_berat = jarak * 1.5\nprint(total_berat)\nprint(robot.can_move())',
      },
      {
        stepId: 'm2_bonus',
        missionId: 'm2_data_collector',
        order: 5,
        isBonus: true,
        title: { id: 'Bonus 2: Laporan f-string', en: 'Bonus 2: f-string Report' },
        goal: {
          id: 'Bangun jembatan dan cetak laporan persis berformat f"Jarak: {jarak}, Berat: {total_berat}".',
          en: 'Build the bridge and print a report formatted as f"Jarak: {jarak}, Berat: {total_berat}".',
        },
        targetKCs: ['D4', 'D3'],
        capabilities: ['print', 'robot.measure', 'bridge.build'],
        requirementChips: { id: ['Format: Jarak: X, Berat: Y'], en: ['Format: Jarak: X, Berat: Y'] },
        xp: 50,
        unlocksCosmeticId: 'bit_paint_clay',
        lessonSlides: [
          {
            title: { id: 'Menyisipkan Nilai dengan f-string', en: 'Formatting with f-strings' },
            body: { id: 'Awalan f di depan string memungkinkan penyisipan variabel di dalam { }.', en: 'Prefixing a string with f lets you embed variables inside { }.' },
            exampleCode: 'print(f"Jarak: {jarak}, Berat: {total_berat}")',
          },
        ],
        starters: {
          guided: 'jarak = robot.measure()\nbridge.build(jarak)\ntotal_berat = jarak * 1.5\nprint(f"Jarak: {___}, Berat: {___}")',
          assisted: 'jarak = robot.measure()\nbridge.build(jarak)\ntotal_berat = jarak * 1.5\n',
          independent: '# Bangun jembatan lalu cetak f"Jarak: {jarak}, Berat: {total_berat}"\n',
          mastery: '',
        },
        scenarios: [
          {
            ...makeBridgeScenario('m2_bonus_gap4', 'Celah 4', 4),
            predicates: [
              { type: 'bridge_complete', requireExactLength: true },
              { type: 'stdout_matches_regex', pattern: 'Jarak:\\s*4,\\s*Berat:\\s*6\\.0' },
            ],
          },
        ],
        hintLadder: [
          { rung: 1, headline: { id: 'Format f-string', en: 'f-string Format' }, body: { id: 'Jangan lupa huruf f sebelum tanda kutip pembuka.', en: 'Remember the leading f before the opening quote.' } },
          { rung: 2, headline: { id: 'Kurung Kurawal', en: 'Curly Braces' }, body: { id: 'Letakkan jarak dan total_berat di dalam { }.', en: 'Put jarak and total_berat inside { }.' }, highlightLines: [4] },
          { rung: 3, headline: { id: 'Kerangka Laporan', en: 'Report Scaffold' }, body: { id: 'Lengkapi {jarak} dan {total_berat}.', en: 'Fill in {jarak} and {total_berat}.' }, codeSnippet: 'print(f"Jarak: {jarak}, Berat: {total_berat}")' },
          { rung: 4, headline: { id: 'Contoh Solusi', en: 'Worked Solution' }, body: { id: 'f-string menggabungkan label dan nilai secara rapi.', en: 'f-strings interpolate variables cleanly.' }, codeSnippet: 'jarak = robot.measure()\nbridge.build(jarak)\ntotal_berat = jarak * 1.5\nprint(f"Jarak: {jarak}, Berat: {total_berat}")' },
        ],
        referenceSolution: 'jarak = robot.measure()\nbridge.build(jarak)\ntotal_berat = jarak * 1.5\nprint(f"Jarak: {jarak}, Berat: {total_berat}")',
      },
    ],
  },

  // =========================================================================
  // MISSION 3 — The Locked Gate (Gatehouse Rock)
  // =========================================================================
  {
    missionId: 'm3_locked_gate',
    questId: 'm3_locked_gate',
    islandId: 'gatehouse_rock',
    order: 3,
    title: { id: 'Misi 3: Gerbang Terkunci', en: 'Mission 3: The Locked Gate' },
    subtitle: {
      id: 'Teka-teki rune kebenaran dan percabangan if / elif / else.',
      en: 'Rune truths and if / elif / else conditionals.',
    },
    npcName: 'Kakek Tamo',
    steps: [
      {
        stepId: 'm3_s1',
        missionId: 'm3_locked_gate',
        order: 1,
        title: { id: '3.1 Benar atau Salah', en: '3.1 True or False' },
        goal: {
          id: 'Cetak hasil 4 perbandingan rune Kakek Tamo: 5 > 3, 2 == 4, "blue" != "red", dan 10 < 5.',
          en: 'Print Old Tamo’s 4 rune comparisons: 5 > 3, 2 == 4, "blue" != "red", and 10 < 5.',
        },
        targetKCs: ['B1', 'O5', 'D5'],
        capabilities: ['print'],
        requirementChips: { id: ['4 baris True/False'], en: ['4 True/False lines'] },
        xp: 30,
        lessonSlides: [
          {
            title: { id: 'Kebenaran Rune (True / False)', en: 'Rune Truths (True / False)' },
            body: {
              id: 'Operator perbandingan (>, <, ==, !=, >=, <=) menghasilkan nilai boolean True atau False.',
              en: 'Comparison operators evaluate to True or False.',
            },
            exampleCode: 'print(5 > 3)\nprint(2 == 4)',
          },
        ],
        starters: {
          guided: 'print(5 ___ 3)\nprint(2 ___ 4)\nprint("blue" != "red")\nprint(10 < 5)',
          assisted: '# TODO: cetak hasil 5 > 3, 2 == 4, "blue" != "red", 10 < 5\n',
          independent: '# Cetak hasil 4 perbandingan: 5 > 3, 2 == 4, "blue" != "red", 10 < 5\n',
          mastery: '',
        },
        scenarios: [
          {
            id: 'm3_s1_main',
            label: 'Empat Pilar Rune',
            initialState: emptyGrid(3, 1),
            predicates: [{ type: 'stdout_equals_lines', lines: ['True', 'False', 'True', 'False'] }],
          },
        ],
        hintLadder: [
          { rung: 1, headline: { id: 'Membandingkan Nilai', en: 'Comparing Values' }, body: { id: 'Apakah 5 lebih besar dari 3?', en: 'Is 5 greater than 3?' }, socraticQuestion: { id: 'Operator apa yang menguji kesamaan di Python?', en: 'Which operator tests equality?' } },
          { rung: 2, headline: { id: 'Gunakan == Bukan =', en: 'Use == Not =' }, body: { id: 'Periksa baris kedua: gunakan == untuk membandingkan 2 dan 4.', en: 'Check line 2: use == between 2 and 4.' }, highlightLines: [1, 2], conceptCardId: 'B1' },
          { rung: 3, headline: { id: 'Kerangka Rune', en: 'Rune Scaffold' }, body: { id: 'Lengkapi > dan ==.', en: 'Fill in > and ==.' }, codeSnippet: 'print(5 > 3)\nprint(2 == 4)\nprint("blue" != "red")\nprint(10 < 5)' },
          { rung: 4, headline: { id: 'Contoh Solusi', en: 'Worked Solution' }, body: { id: 'Hasil keempat perbandingan adalah True, False, True, False.', en: 'Outputs True, False, True, False.' }, codeSnippet: 'print(5 > 3)\nprint(2 == 4)\nprint("blue" != "red")\nprint(10 < 5)' },
        ],
        referenceSolution: 'print(5 > 3)\nprint(2 == 4)\nprint("blue" != "red")\nprint(10 < 5)',
      },
      {
        stepId: 'm3_s2',
        missionId: 'm3_locked_gate',
        order: 2,
        title: { id: '3.2 Gerbang Pertama', en: '3.2 The First Gate' },
        goal: {
          id: 'Baca warna kristal dengan sensor.read(), lalu buka gerbang (gate.open()) HANYA jika warna == "blue".',
          en: 'Read the crystal color with sensor.read() and call gate.open() ONLY when warna == "blue".',
        },
        targetKCs: ['B2', 'F7'],
        capabilities: ['print', 'sensor.read', 'gate.open', 'gate.close'],
        requirementChips: { id: ['Gunakan: if', 'Uji 3 warna kristal'], en: ['Use: if', 'Tested on 3 crystal colors'] },
        xp: 35,
        lessonSlides: [
          {
            title: { id: 'Keputusan dengan if', en: 'Decisions with if' },
            body: { id: 'Kode yang menjorok 4 spasi di bawah `if` hanya berjalan jika kondisi bernilai True.', en: 'Indented code under `if` runs only when the condition is True.' },
            exampleCode: 'warna = sensor.read()\nif warna == "blue":\n    gate.open()',
          },
        ],
        starters: {
          guided: 'warna = sensor.read()\nif warna == "___":\n    gate.open()',
          assisted: '# TODO: buka gerbang hanya saat warna == "blue"\nwarna = sensor.read()\n',
          independent: '# Gunakan sensor.read() dan if untuk membuka gerbang hanya pada kristal "blue"\n',
          mastery: '',
        },
        astRules: {
          requireConstructs: ['If'],
        },
        scenarios: [
          makeGateScenario('m3_s2_blue', 'Kristal Biru', 'blue', 2, true, 'off'),
          makeGateScenario('m3_s2_red', 'Kristal Merah', 'red', 2, false, 'off'),
          makeGateScenario('m3_s2_green', 'Kristal Hijau', 'green', 2, false, 'off'),
        ],
        hintLadder: [
          { rung: 1, headline: { id: 'Jangan Selalu Membuka', en: 'Do Not Always Open' }, body: { id: 'Jika menulis gate.open() tanpa if, gerbang terbuka untuk kristal merah juga!', en: 'Calling gate.open() without `if` opens for red crystals too!' }, socraticQuestion: { id: 'Warna apa yang seharusnya membuka gerbang?', en: 'Which crystal color should unlock the gate?' } },
          { rung: 2, headline: { id: 'Perhatikan Titik Dua & 4 Spasi', en: 'Colon & 4 Spaces' }, body: { id: 'Akhiri baris if dengan : dan geser gate.open() 4 spasi.', en: 'End the if line with : and indent gate.open() by 4 spaces.' }, highlightLines: [2, 3], conceptCardId: 'B2' },
          { rung: 3, headline: { id: 'Kerangka if', en: 'if Scaffold' }, body: { id: 'Isi "blue".', en: 'Fill in "blue".' }, codeSnippet: 'warna = sensor.read()\nif warna == "blue":\n    gate.open()' },
          { rung: 4, headline: { id: 'Contoh Solusi', en: 'Worked Solution' }, body: { id: 'Gerbang terbuka pada skenario biru dan tetap tertutup pada merah dan hijau.', en: 'Opens for blue and stays closed for red and green.' }, codeSnippet: 'warna = sensor.read()\nif warna == "blue":\n    gate.open()' },
        ],
        referenceSolution: 'warna = sensor.read()\nif warna == "blue":\n    gate.open()',
      },
      {
        stepId: 'm3_s3',
        missionId: 'm3_locked_gate',
        order: 3,
        title: { id: '3.3 Jika Tidak', en: '3.3 Otherwise (else)' },
        goal: {
          id: 'Jika warna == "blue" buka gerbang; jika tidak (else), nyalakan lampu merah dengan gate.light("red").',
          en: 'If warna == "blue" open the gate; else call gate.light("red").',
        },
        targetKCs: ['B3', 'B2'],
        capabilities: ['print', 'sensor.read', 'gate.open', 'gate.light'],
        requirementChips: { id: ['Gunakan: if dan else'], en: ['Use: if and else'] },
        xp: 40,
        lessonSlides: [
          {
            title: { id: 'Jalur Alternatif else', en: 'The else Branch' },
            body: {
              id: '`else:` tidak butuh syarat sendiri dan menangani semua keadaan saat kondisi `if` bernilai `False`. Gunakan `gate.light("red")` untuk sinyal penolakan.',
              en: '`else:` takes no condition and runs whenever the `if` condition is `False`. Call `gate.light("red")` to signal denial.',
            },
            exampleCode: 'if warna == "blue":\n    gate.open()\nelse:\n    gate.light("red")',
          },
        ],
        starters: {
          guided: 'warna = sensor.read()\nif warna == "blue":\n    gate.open()\n___:\n    gate.light("red")',
          assisted: 'warna = sensor.read()\nif warna == "blue":\n    gate.open()\n# TODO: tambahkan cabang else dengan gate.light("red")\n',
          independent: '# Buka untuk "blue", selain itu gate.light("red")\n',
          mastery: '',
        },
        astRules: {
          requireConstructs: ['If'],
          requireExtendedConstructs: ['Else'],
        },
        scenarios: [
          makeGateScenario('m3_s3_blue', 'Kristal Biru', 'blue', 2, true, 'off'),
          makeGateScenario('m3_s3_red', 'Kristal Merah', 'red', 2, false, 'red'),
        ],
        hintLadder: [
          { rung: 1, headline: { id: 'Saat Syarat Gagal', en: 'When Condition Fails' }, body: { id: 'Kita perlu menyalakan lampu merah saat kristal bukan biru.', en: 'We need a red light whenever the crystal is not blue.' }, socraticQuestion: { id: 'Kata kunci apa yang menangani kondisi "selain itu"?', en: 'Which keyword handles the fallback branch?' } },
          { rung: 2, headline: { id: 'Sejajarkan else dengan if', en: 'Align else with if' }, body: { id: 'else berada di kolom yang sama dengan if dan diakhiri titik dua :.', en: 'Align `else:` with `if`.' }, highlightLines: [4, 5], conceptCardId: 'B3' },
          { rung: 3, headline: { id: 'Kerangka if-else', en: 'if-else Scaffold' }, body: { id: 'Lengkapi kata kunci else.', en: 'Add else:.' }, codeSnippet: 'warna = sensor.read()\nif warna == "blue":\n    gate.open()\nelse:\n    gate.light("red")' },
          { rung: 4, headline: { id: 'Contoh Solusi', en: 'Worked Solution' }, body: { id: 'Biru membuka gerbang, merah menyalakan lampu merah.', en: 'Blue opens the gate; red lights red.' }, codeSnippet: 'warna = sensor.read()\nif warna == "blue":\n    gate.open()\nelse:\n    gate.light("red")' },
        ],
        referenceSolution: 'warna = sensor.read()\nif warna == "blue":\n    gate.open()\nelse:\n    gate.light("red")',
      },
      {
        stepId: 'm3_s4',
        missionId: 'm3_locked_gate',
        order: 4,
        title: { id: '3.4 Tiga Kristal', en: '3.4 Three Crystals' },
        goal: {
          id: 'Tangani tiga cabang: "blue" -> gate.open(), "green" -> gate.light("yellow"), selain itu -> gate.light("red").',
          en: 'Handle 3 branches: "blue" -> gate.open(), "green" -> gate.light("yellow"), else -> gate.light("red").',
        },
        targetKCs: ['B4'],
        capabilities: ['print', 'sensor.read', 'gate.open', 'gate.light'],
        requirementChips: { id: ['Gunakan: if / elif / else', '4 skenario warna'], en: ['Use: if / elif / else', '4 color scenarios'] },
        xp: 45,
        lessonSlides: [
          {
            title: { id: 'Banyak Pilihan dengan elif', en: 'Multiple Choices with elif' },
            body: {
              id: '`elif` (singkatan dari else-if) memeriksa kondisi berikutnya hanya jika kondisi `if` di atasnya bernilai `False`. Gunakan `gate.light("yellow")` untuk kristal `"green"`.',
              en: '`elif` (else-if) checks another condition only when earlier branches are `False`. Call `gate.light("yellow")` for `"green"`.',
            },
            exampleCode: 'if warna == "blue":\n    gate.open()\nelif warna == "green":\n    gate.light("yellow")\nelse:\n    gate.light("red")',
          },
        ],
        starters: {
          guided: 'warna = sensor.read()\nif warna == "blue":\n    gate.open()\n___ warna == "green":\n    gate.light("yellow")\nelse:\n    gate.light("red")',
          assisted: 'warna = sensor.read()\nif warna == "blue":\n    gate.open()\n# TODO: tambahkan elif untuk "green" -> yellow, dan else -> red\n',
          independent: '# blue -> open, green -> light("yellow"), lainnya -> light("red")\n',
          mastery: '',
        },
        astRules: {
          requireConstructs: ['If'],
          requireExtendedConstructs: ['Elif', 'Else'],
        },
        scenarios: [
          makeGateScenario('m3_s4_blue', 'Biru', 'blue', 2, true, 'off'),
          makeGateScenario('m3_s4_green', 'Hijau', 'green', 2, false, 'yellow'),
          makeGateScenario('m3_s4_red', 'Merah', 'red', 2, false, 'red'),
          makeGateScenario('m3_s4_white', 'Putih', 'white', 2, false, 'red'),
        ],
        hintLadder: [
          { rung: 1, headline: { id: 'Cabang Ketiga', en: 'A Third Path' }, body: { id: 'Kristal hijau butuh lampu kuning, bukan merah.', en: 'Green crystals need a yellow lamp.' }, socraticQuestion: { id: 'Kata kunci gabungan else + if di Python adalah…?', en: 'What is Python’s combined else-if keyword?' } },
          { rung: 2, headline: { id: 'Gunakan elif', en: 'Use elif' }, body: { id: 'Tulis `elif warna == "green":` di baris 4.', en: 'Write `elif warna == "green":` on line 4.' }, highlightLines: [4, 5], conceptCardId: 'B4' },
          { rung: 3, headline: { id: 'Kerangka 3 Cabang', en: '3-Branch Scaffold' }, body: { id: 'Isi kata kunci elif.', en: 'Fill in elif.' }, codeSnippet: 'warna = sensor.read()\nif warna == "blue":\n    gate.open()\nelif warna == "green":\n    gate.light("yellow")\nelse:\n    gate.light("red")' },
          { rung: 4, headline: { id: 'Contoh Solusi', en: 'Worked Solution' }, body: { id: 'Keempat skenario warna tertangani dengan tepat.', en: 'All 4 crystal scenarios pass.' }, codeSnippet: 'warna = sensor.read()\nif warna == "blue":\n    gate.open()\nelif warna == "green":\n    gate.light("yellow")\nelse:\n    gate.light("red")' },
        ],
        referenceSolution: 'warna = sensor.read()\nif warna == "blue":\n    gate.open()\nelif warna == "green":\n    gate.light("yellow")\nelse:\n    gate.light("red")',
      },
      {
        stepId: 'm3_s5',
        missionId: 'm3_locked_gate',
        order: 5,
        title: { id: '3.5 Kunci Ganda', en: '3.5 Double Lock' },
        goal: {
          id: 'Buka gerbang hanya jika warna == "blue" AND beban >= 2 (dari scale.read()). Selain itu nyalakan gate.light("red").',
          en: 'Open the gate only when warna == "blue" and beban >= 2 (from scale.read()). Otherwise gate.light("red").',
        },
        targetKCs: ['B5', 'O5'],
        capabilities: ['print', 'sensor.read', 'scale.read', 'gate.open', 'gate.light'],
        requirementChips: { id: ['Gunakan: and', 'Tabel kebenaran 4 kasus'], en: ['Use: and', '4-case truth table'] },
        xp: 50,
        lessonSlides: [
          {
            title: { id: 'Operator Logika: and (Kedua Syarat Wajib Benar)', en: 'Logical and (Both Conditions Required)' },
            body: {
              id: 'Operator `and` hanya bernilai `True` jika KEDUA syarat di kiri dan kanannya bernilai `True`. Jika salah satu saja `False`, seluruh ekspresi menjadi `False`.',
              en: 'The `and` operator evaluates to `True` ONLY when BOTH left and right conditions are `True`. If either is `False`, the result is `False`.',
            },
            exampleCode: 'if warna == "blue" and beban >= 2:\n    gate.open()',
          },
          {
            title: { id: 'Bandingkan dengan or & not', en: 'Compare with or & not' },
            body: {
              id: '• `and`: kedua syarat WAJIB `True` (`warna == "blue" and beban >= 2`).\n• `or`: cukup SALAH SATU syarat `True` (`if warna == "blue" or warna == "green":`).\n• `not`: membalik hasil logika `True` ↔ `False` (`if not (warna == "red"):`).',
              en: '• `and`: BOTH conditions must be `True`.\n• `or`: AT LEAST ONE condition is `True` (`if warna == "blue" or warna == "green":`).\n• `not`: flips `True` ↔ `False` (`if not (warna == "red"):`).',
            },
            exampleCode: '# and -> keduanya True\n# or  -> minimal satu True\nif warna == "blue" or warna == "green":\n    gate.light("yellow")\n# not -> membalik True/False\nif not (warna == "red"):\n    gate.open()',
          },
        ],
        starters: {
          guided: 'warna = sensor.read()\nbeban = scale.read()\nif warna == "blue" ___ beban >= 2:\n    gate.open()\nelse:\n    gate.light("red")',
          assisted: 'warna = sensor.read()\nbeban = scale.read()\n# TODO: buka jika warna biru DAN beban >= 2\n',
          independent: '# Baca sensor.read() dan scale.read(); buka jika biru dan beban >= 2\n',
          mastery: '',
        },
        astRules: {
          requireConstructs: ['If'],
          requireExtendedConstructs: ['Else'],
        },
        scenarios: [
          makeGateScenario('m3_s5_tt', 'Biru & Berat >= 2', 'blue', 3, true, 'off'),
          makeGateScenario('m3_s5_tf', 'Biru & Ringan', 'blue', 1, false, 'red'),
          makeGateScenario('m3_s5_ft', 'Merah & Berat >= 2', 'red', 4, false, 'red'),
          makeGateScenario('m3_s5_ff', 'Hijau & Ringan', 'green', 1, false, 'red'),
        ],
        hintLadder: [
          { rung: 1, headline: { id: 'Dua Kunci Sekaligus', en: 'Two Keys at Once' }, body: { id: 'Kristal biru saja tidak cukup jika timbangan kurang dari 2.', en: 'Blue crystal alone fails if weight < 2.' }, socraticQuestion: { id: 'Operator logika apa yang mewajibkan kedua syarat benar?', en: 'Which logical operator requires both conditions?' } },
          { rung: 2, headline: { id: 'Gunakan and', en: 'Use and' }, body: { id: 'Gabungkan `warna == "blue"` dan `beban >= 2` memakai `and`.', en: 'Join both conditions with `and`.' }, highlightLines: [3], conceptCardId: 'B5' },
          { rung: 3, headline: { id: 'Kerangka Kunci Ganda', en: 'Double-Lock Scaffold' }, body: { id: 'Isi kata kunci and.', en: 'Fill in and.' }, codeSnippet: 'warna = sensor.read()\nbeban = scale.read()\nif warna == "blue" and beban >= 2:\n    gate.open()\nelse:\n    gate.light("red")' },
          { rung: 4, headline: { id: 'Contoh Solusi', en: 'Worked Solution' }, body: { id: 'Gerbang utama hanya terbuka saat keempat kasus tabel kebenaran tepat.', en: 'Passes all 4 truth-table combinations.' }, codeSnippet: 'warna = sensor.read()\nbeban = scale.read()\nif warna == "blue" and beban >= 2:\n    gate.open()\nelse:\n    gate.light("red")' },
        ],
        referenceSolution: 'warna = sensor.read()\nbeban = scale.read()\nif warna == "blue" and beban >= 2:\n    gate.open()\nelse:\n    gate.light("red")',
      },
      {
        stepId: 'm3_bonus',
        missionId: 'm3_locked_gate',
        order: 6,
        isBonus: true,
        title: { id: 'Bonus 3: Logika not', en: 'Bonus 3: Negation with not' },
        goal: {
          id: 'Capai hasil kunci ganda yang sama (buka hanya saat biru dan beban >= 2), wajib menggunakan operator `not`.',
          en: 'Achieve the exact same double-lock behavior while using the `not` operator.',
        },
        targetKCs: ['B7', 'B5'],
        capabilities: ['print', 'sensor.read', 'scale.read', 'gate.open', 'gate.light'],
        requirementChips: { id: ['Wajib: operator not', '4 skenario'], en: ['Require: not operator', '4 scenarios'] },
        xp: 50,
        unlocksCosmeticId: 'scarf_amber',
        lessonSlides: [
          {
            title: { id: 'Operator Logika: not (Pembalik Nilai)', en: 'Logical not (Boolean Inverter)' },
            body: {
              id: 'Operator `not` membalik hasil logika: `not True` menjadi `False`, dan `not False` menjadi `True`. Cocok untuk menuliskan syarat penolakan lebih dulu: `if not (warna == "blue" and beban >= 2):`.',
              en: 'The `not` operator flips a boolean: `not True` becomes `False`, and `not False` becomes `True`. Ideal for checking denial first: `if not (warna == "blue" and beban >= 2):`.',
            },
            exampleCode: 'if not (warna == "red"):\n    gate.open()\n\n# Kunci ganda dengan not:\nif not (warna == "blue" and beban >= 2):\n    gate.light("red")\nelse:\n    gate.open()',
          },
          {
            title: { id: 'Ringkasan 3 Operator Logika (and / or / not)', en: '3 Logical Operators Summary (and / or / not)' },
            body: {
              id: '• `and`: kedua syarat harus `True` (`if warna == "blue" and beban >= 2:`).\n• `or`: cukup satu syarat `True` (`if warna == "blue" or warna == "green":`).\n• `not`: membalik `True` ↔ `False` (`if not (warna == "red"):`).',
              en: '• `and`: both conditions must be `True`.\n• `or`: either condition can be `True` (`if warna == "blue" or warna == "green":`).\n• `not`: inverts `True` ↔ `False` (`if not (warna == "red"):`).',
            },
            exampleCode: 'if warna == "blue" and beban >= 2:\n    gate.open()\nelif warna == "blue" or warna == "green":\n    gate.light("yellow")\nelif not (warna == "red"):\n    gate.light("red")',
          },
        ],
        starters: {
          guided: 'warna = sensor.read()\nbeban = scale.read()\nif ___(warna == "blue" and beban >= 2):\n    gate.light("red")\nelse:\n    gate.open()',
          assisted: 'warna = sensor.read()\nbeban = scale.read()\n# TODO: gunakan not untuk menolak lebih dulu\n',
          independent: '# Gunakan operator not untuk mengimplementasikan kunci ganda\n',
          mastery: '',
        },
        astRules: {
          requireConstructs: ['If'],
          requireExtendedConstructs: ['NotOp'],
        },
        scenarios: [
          makeGateScenario('m3_b_tt', 'Biru & Berat >= 2', 'blue', 3, true, 'off'),
          makeGateScenario('m3_b_tf', 'Biru & Ringan', 'blue', 1, false, 'red'),
          makeGateScenario('m3_b_ft', 'Merah & Berat >= 2', 'red', 4, false, 'red'),
          makeGateScenario('m3_b_ff', 'Hijau & Ringan', 'green', 1, false, 'red'),
        ],
        hintLadder: [
          { rung: 1, headline: { id: 'Balik Urutannya', en: 'Flip the Check' }, body: { id: 'Gunakan `not` untuk mengecek kapan gerbang HARUS ditolak.', en: 'Check when access should be denied using `not`.' } },
          { rung: 2, headline: { id: 'Gunakan not (...)', en: 'Use not (...)' }, body: { id: 'if not (warna == "blue" and beban >= 2):', en: 'if not (warna == "blue" and beban >= 2):' }, highlightLines: [3], conceptCardId: 'B7' },
          { rung: 3, headline: { id: 'Kerangka not', en: 'not Scaffold' }, body: { id: 'Tulis else: gate.open().', en: 'Add else: gate.open().' }, codeSnippet: 'warna = sensor.read()\nbeban = scale.read()\nif not (warna == "blue" and beban >= 2):\n    gate.light("red")\nelse:\n    gate.open()' },
          { rung: 4, headline: { id: 'Contoh Solusi', en: 'Worked Solution' }, body: { id: 'Menolak saat syarat utama tidak terpenuhi.', en: 'Denies whenever the double lock is not satisfied.' }, codeSnippet: 'warna = sensor.read()\nbeban = scale.read()\nif not (warna == "blue" and beban >= 2):\n    gate.light("red")\nelse:\n    gate.open()' },
        ],
        referenceSolution: 'warna = sensor.read()\nbeban = scale.read()\nif not (warna == "blue" and beban >= 2):\n    gate.light("red")\nelse:\n    gate.open()',
      },
    ],
  },

  // =========================================================================
  // MISSION 4 — Automated Farm (Terrace Farm)
  // =========================================================================
  {
    missionId: 'm4_automated_farm',
    questId: 'm4_automated_farm',
    islandId: 'terrace_farm',
    order: 4,
    title: { id: 'Misi 4: Ladang Otomatis', en: 'Mission 4: Automated Farm' },
    subtitle: {
      id: 'Otomatiskan penanaman terasering dengan for, while, dan nested loop.',
      en: 'Automate terrace planting using for, while, and nested loops.',
    },
    npcName: 'Mira & BOLT',
    steps: [
      {
        stepId: 'm4_s1',
        missionId: 'm4_automated_farm',
        order: 1,
        title: { id: '4.1 Tanam Manual', en: '4.1 Manual Planting' },
        goal: {
          id: 'Tanam 3 petak gandum secara manual dengan robot.plant("wheat") dan robot.move(1).',
          en: 'Plant 3 wheat tiles manually using robot.plant("wheat") and robot.move(1).',
        },
        targetKCs: ['F7'],
        capabilities: ['print', 'robot.plant', 'robot.move'],
        requirementChips: { id: ['3 petak tertanam'], en: ['3 tiles planted'] },
        xp: 30,
        lessonSlides: [
          {
            title: { id: 'Pengulangan Manual Itu Melelahkan', en: 'Manual Repetition' },
            body: {
              id: 'Gunakan `robot.plant("wheat")` untuk menanam gandum di petak saat ini, lalu `robot.move(1)` untuk maju 1 petak. Ulangi 3 kali untuk merasakan mengapa loop dibutuhkan.',
              en: 'Call `robot.plant("wheat")` to sow wheat on the current tile and `robot.move(1)` to step forward. Repeat 3 times to see why loops exist.',
            },
            exampleCode: 'robot.plant("wheat")\nrobot.move(1)',
          },
        ],
        starters: {
          guided: 'robot.plant("wheat")\nrobot.move(1)\nrobot.plant("wheat")\nrobot.move(1)\nrobot.plant("___")\nrobot.move(1)',
          assisted: '# TODO: tanam 3 petak gandum berturut-turut\nrobot.plant("wheat")\nrobot.move(1)\n',
          independent: '# Tanam 3 petak "wheat" dengan robot.plant dan robot.move\n',
          mastery: '',
        },
        scenarios: [makeFarmRowScenario('m4_s1_main', 'Baris 3 Petak', 3)],
        hintLadder: [
          { rung: 1, headline: { id: 'Tiga Kali Berulang', en: 'Three Repeats' }, body: { id: 'Ulangi pasangan plant("wheat") dan move(1) sebanyak 3 kali.', en: 'Repeat plant("wheat") + move(1) 3 times.' } },
          { rung: 2, headline: { id: 'Cek Petak Terakhir', en: 'Check Final Tile' }, body: { id: 'Pastikan ketiga petak diberi "wheat".', en: 'Use "wheat" on all 3 tiles.' }, highlightLines: [5] },
          { rung: 3, headline: { id: 'Kerangka Manual', en: 'Manual Scaffold' }, body: { id: 'Isi "wheat".', en: 'Fill in "wheat".' }, codeSnippet: 'robot.plant("wheat")\nrobot.move(1)\nrobot.plant("wheat")\nrobot.move(1)\nrobot.plant("wheat")\nrobot.move(1)' },
          { rung: 4, headline: { id: 'Contoh Solusi', en: 'Worked Solution' }, body: { id: 'Ketiga petak tertanam, tetapi bayangkan jika ada 30 petak!', en: 'All 3 planted — now imagine 30 tiles!' }, codeSnippet: 'robot.plant("wheat")\nrobot.move(1)\nrobot.plant("wheat")\nrobot.move(1)\nrobot.plant("wheat")\nrobot.move(1)' },
        ],
        referenceSolution: 'robot.plant("wheat")\nrobot.move(1)\nrobot.plant("wheat")\nrobot.move(1)\nrobot.plant("wheat")\nrobot.move(1)',
      },
      {
        stepId: 'm4_s2',
        missionId: 'm4_automated_farm',
        order: 2,
        title: { id: '4.2 Ulangi!', en: '4.2 Repeat!' },
        goal: {
          id: 'Tanam baris 6 petak dengan perulangan for i in range(6): menggunakan maksimal 4 baris kode.',
          en: 'Plant a 6-tile row with for i in range(6): in at most 4 statement lines.',
        },
        targetKCs: ['L1', 'F7'],
        capabilities: ['print', 'robot.plant', 'robot.move'],
        requirementChips: { id: ['Wajib: for', 'Maksimal 4 baris'], en: ['Require: for', 'Max 4 lines'] },
        xp: 40,
        lessonSlides: [
          {
            title: { id: 'Perulangan for & range()', en: 'for Loops & range()' },
            body: { id: 'for i in range(6): mengulang blok berindentasi di dalamnya sebanyak 6 kali.', en: 'for i in range(6): repeats the indented block 6 times.' },
            exampleCode: 'for i in range(6):\n    robot.plant("wheat")\n    robot.move(1)',
          },
        ],
        starters: {
          guided: 'for i in range(___):\n    robot.plant("wheat")\n    robot.move(1)',
          assisted: '# TODO: gunakan for i in range(6): untuk menanam 6 petak\nfor i in range():\n    ',
          independent: '# Tanam 6 petak dengan perulangan for (<= 4 baris)\n',
          mastery: '',
        },
        astRules: {
          requireConstructs: ['For'],
          maxStatementLines: 4,
        },
        scenarios: [makeFarmRowScenario('m4_s2_main', 'Baris 6 Petak', 6)],
        hintLadder: [
          { rung: 1, headline: { id: 'Berapa Kali Diulang?', en: 'How Many Repeats?' }, body: { id: 'Berapa banyak petak tanah di baris ini?', en: 'How many soil tiles are in this row?' }, socraticQuestion: { id: 'Angka berapa yang harus masuk ke dalam range(...)?', en: 'What number goes inside range(...)?' } },
          { rung: 2, headline: { id: 'Periksa range(6)', en: 'Check range(6)' }, body: { id: 'Isi 6 di dalam range() dan pertahankan indentasi 4 spasi.', en: 'Put 6 inside range() and keep 4-space indentation.' }, highlightLines: [1], conceptCardId: 'L1' },
          { rung: 3, headline: { id: 'Kerangka for', en: 'for Scaffold' }, body: { id: 'Lengkapi range(6).', en: 'Fill in 6.' }, codeSnippet: 'for i in range(6):\n    robot.plant("wheat")\n    robot.move(1)' },
          { rung: 4, headline: { id: 'Contoh Solusi', en: 'Worked Solution' }, body: { id: 'Tiga baris kode ini menanam seluruh 6 petak secara otomatis.', en: 'Just 3 lines plant all 6 tiles.' }, codeSnippet: 'for i in range(6):\n    robot.plant("wheat")\n    robot.move(1)' },
        ],
        referenceSolution: 'for i in range(6):\n    robot.plant("wheat")\n    robot.move(1)',
      },
      {
        stepId: 'm4_s3',
        missionId: 'm4_automated_farm',
        order: 3,
        title: { id: '4.3 Hitung dengan i', en: '4.3 Counting with i' },
        goal: {
          id: 'Gunakan for i in range(1, 6): untuk menanam 5 petak sambil mengucapkan angka 1 sampai 5 lewat robot.say(i).',
          en: 'Use for i in range(1, 6): to plant 5 tiles and have BIT say 1 through 5 via robot.say(i).',
        },
        targetKCs: ['L1'],
        capabilities: ['print', 'robot.plant', 'robot.move', 'robot.say'],
        requirementChips: { id: ['Gunakan: for & range(1, 6)', 'BIT ucap 1..5'], en: ['Use: for & range(1, 6)', 'BIT says 1..5'] },
        xp: 45,
        lessonSlides: [
          {
            title: { id: 'Variabel Loop i & range(1, 6)', en: 'Loop Variable i & range(1, 6)' },
            body: {
              id: '`range(1, 6)` mulai dari `1` dan berhenti tepat sebelum `6` (menghasilkan 1, 2, 3, 4, 5). Kirim variabel `i` ke `robot.say(i)` di setiap iterasi.',
              en: '`range(1, 6)` starts at `1` and stops before `6` (yielding 1, 2, 3, 4, 5). Pass `i` into `robot.say(i)` on each iteration.',
            },
            exampleCode: 'for i in range(1, 6):\n    robot.say(i)\n    robot.plant("wheat")\n    robot.move(1)',
          },
        ],
        starters: {
          guided: 'for i in range(1, ___):\n    robot.say(i)\n    robot.plant("wheat")\n    robot.move(1)',
          assisted: '# TODO: range(1, 6) agar i bernilai 1..5\nfor i in range(1, 6):\n    ',
          independent: '# Tanam 5 petak dan ucapkan 1..5 menggunakan variabel loop i\n',
          mastery: '',
        },
        astRules: {
          requireConstructs: ['For'],
          maxStatementLines: 5,
        },
        scenarios: [
          {
            ...makeFarmRowScenario('m4_s3_main', 'Batu Penanda 1..5', 5),
            predicates: [
              { type: 'farm_planted_count', exact: 5, allSoilPlanted: true },
              { type: 'robot_say_equals', expected: ['1', '2', '3', '4', '5'], exact: true },
            ],
          },
        ],
        hintLadder: [
          { rung: 1, headline: { id: 'Batas Atas range()', en: 'Upper Bound of range()' }, body: { id: 'Di Python, angka kedua pada range(a, b) tidak ikut disertakan.', en: 'In Python, the stop value in range(a, b) is exclusive.' }, socraticQuestion: { id: 'Jika ingin berhenti di 5, angka apa yang ditulis setelah 1?', en: 'To end at 5, what stop number goes after 1?' } },
          { rung: 2, headline: { id: 'range(1, 6)', en: 'range(1, 6)' }, body: { id: 'range(1, 6) menghasilkan 1, 2, 3, 4, 5.', en: 'range(1, 6) yields 1, 2, 3, 4, 5.' }, highlightLines: [1], conceptCardId: 'L1' },
          { rung: 3, headline: { id: 'Kerangka Penanda', en: 'Marker Scaffold' }, body: { id: 'Isi 6 pada range(1, 6).', en: 'Fill in 6.' }, codeSnippet: 'for i in range(1, 6):\n    robot.say(i)\n    robot.plant("wheat")\n    robot.move(1)' },
          { rung: 4, headline: { id: 'Contoh Solusi', en: 'Worked Solution' }, body: { id: 'BIT menyebut 1 sampai 5 di setiap petak.', en: 'BIT speaks 1..5 while planting all 5 tiles.' }, codeSnippet: 'for i in range(1, 6):\n    robot.say(i)\n    robot.plant("wheat")\n    robot.move(1)' },
        ],
        referenceSolution: 'for i in range(1, 6):\n    robot.say(i)\n    robot.plant("wheat")\n    robot.move(1)',
      },
      {
        stepId: 'm4_s4',
        missionId: 'm4_automated_farm',
        order: 4,
        title: { id: '4.4 Sampai Habis', en: '4.4 Until the End' },
        goal: {
          id: 'Gunakan while robot.can_move(): untuk menanam seluruh baris yang panjangnya berubah-ubah (5, 7, dan 9 petak).',
          en: 'Use while robot.can_move(): to plant rows of unknown length (5, 7, and 9 tiles).',
        },
        targetKCs: ['L3'],
        capabilities: ['print', 'robot.plant', 'robot.move', 'robot.can_move'],
        requirementChips: { id: ['Wajib: while', '3 panjang baris berbeda'], en: ['Require: while', '3 row lengths'] },
        xp: 50,
        lessonSlides: [
          {
            title: { id: 'Perulangan while', en: 'while Loops' },
            body: { id: 'Ketika panjang baris tidak pasti, `while robot.can_move():` terus berjalan sampai BIT mencapai ujung.', en: 'When length varies, `while robot.can_move():` runs until BIT reaches the edge.' },
            exampleCode: 'while robot.can_move():\n    robot.plant("wheat")\n    robot.move(1)',
          },
        ],
        starters: {
          guided: 'while robot.___():\n    robot.plant("wheat")\n    robot.move(1)',
          assisted: '# TODO: ulangi selama robot.can_move() bernilai True\nwhile :\n    ',
          independent: '# Tanam seluruh baris tanpa tahu panjang pastinya menggunakan while\n',
          mastery: '',
        },
        astRules: {
          requireConstructs: ['While'],
        },
        scenarios: [
          makeFarmRowScenario('m4_s4_5', 'Baris 5', 5),
          makeFarmRowScenario('m4_s4_7', 'Baris 7', 7),
          makeFarmRowScenario('m4_s4_9', 'Baris 9', 9),
        ],
        hintLadder: [
          { rung: 1, headline: { id: 'Kapan Harus Berhenti?', en: 'When to Stop?' }, body: { id: 'Sensor mana yang memberi tahu bahwa petak di depan masih bisa dilangkahi?', en: 'Which sensor tells BIT the tile ahead is clear?' }, socraticQuestion: { id: 'Jangan lupa panggil robot.move(1) di dalam while agar tidak macet!', en: 'Make sure robot.move(1) is inside the loop so it terminates!' } },
          { rung: 2, headline: { id: 'Panggil robot.can_move()', en: 'Call robot.can_move()' }, body: { id: 'Pastikan ada tanda kurung () pada robot.can_move().', en: 'Include () after robot.can_move.' }, highlightLines: [1], conceptCardId: 'L3' },
          { rung: 3, headline: { id: 'Kerangka while', en: 'while Scaffold' }, body: { id: 'Isi can_move.', en: 'Fill in can_move.' }, codeSnippet: 'while robot.can_move():\n    robot.plant("wheat")\n    robot.move(1)' },
          { rung: 4, headline: { id: 'Contoh Solusi', en: 'Worked Solution' }, body: { id: 'while robot.can_move() berhasil untuk panjang 5, 7, maupun 9.', en: 'Works identically across lengths 5, 7, and 9.' }, codeSnippet: 'while robot.can_move():\n    robot.plant("wheat")\n    robot.move(1)' },
        ],
        referenceSolution: 'while robot.can_move():\n    robot.plant("wheat")\n    robot.move(1)',
      },
      {
        stepId: 'm4_s5',
        missionId: 'm4_automated_farm',
        order: 5,
        title: { id: '4.5 Ladang Penuh', en: '4.5 Full Farm' },
        goal: {
          id: 'Gunakan nested loop dengan farm.rows, farm.cols, dan robot.next_row() untuk menanam seluruh ladang (diuji pada 3×5, 2×6, dan 4×4).',
          en: 'Use nested loops with farm.rows, farm.cols, and robot.next_row() across 3×5, 2×6, and 4×4 fields.',
        },
        targetKCs: ['L6', 'L1'],
        capabilities: [
          'print',
          'robot.plant',
          'robot.move',
          'robot.next_row',
          'farm.rows',
          'farm.cols',
        ],
        requirementChips: {
          id: ['Wajib: nested loop', 'Pakai farm.rows & farm.cols', 'Skenario 3x5, 2x6, 4x4'],
          en: ['Require: nested loops', 'Use farm.rows & farm.cols', '3x5, 2x6, 4x4 fields'],
        },
        xp: 60,
        lessonSlides: [
          {
            title: { id: 'Grid 2D dengan Loop Bersarang', en: '2D Grids with Nested Loops' },
            body: {
              id: 'Loop luar mengulang `farm.rows` baris; loop dalam mengulang `farm.cols` petak per baris; lalu `robot.next_row()` berpindah ke awal baris berikutnya.',
              en: 'Outer loop iterates `farm.rows`; inner loop iterates `farm.cols`; `robot.next_row()` moves to the next row.',
            },
            exampleCode: 'for r in range(farm.rows):\n    for c in range(farm.cols):\n        robot.plant("wheat")\n        robot.move(1)\n    robot.next_row()',
          },
        ],
        starters: {
          guided: 'for r in range(farm.rows):\n    for c in range(farm.___):\n        robot.plant("wheat")\n        robot.move(1)\n    robot.___()',
          assisted: '# TODO: loop luar range(farm.rows), loop dalam range(farm.cols), lalu robot.next_row()\nfor r in range(farm.rows):\n    ',
          independent: '# Tanam seluruh ladang farm.rows x farm.cols menggunakan nested loop + robot.next_row()\n',
          mastery: '',
        },
        astRules: {
          requireConstructs: ['For'],
          requireExtendedConstructs: ['NestedLoop'],
        },
        scenarios: [
          makeFarmGridScenario('m4_s5_3x5', 'Ladang 3x5', 3, 5),
          makeFarmGridScenario('m4_s5_2x6', 'Ladang 2x6', 2, 6),
          makeFarmGridScenario('m4_s5_4x4', 'Ladang 4x4', 4, 4),
        ],
        hintLadder: [
          { rung: 1, headline: { id: 'Baris dan Kolom', en: 'Rows and Columns' }, body: { id: 'Setelah selesai 1 baris penuh, BIT harus berpindah ke baris berikutnya.', en: 'After finishing one row, BIT needs to step to the next row.' }, socraticQuestion: { id: 'Perintah apa yang memindahkan BIT ke awal baris baru?', en: 'Which command moves BIT to the next row start?' } },
          { rung: 2, headline: { id: 'Gunakan farm.cols & next_row()', en: 'Use farm.cols & next_row()' }, body: { id: 'Loop dalam memakai `farm.cols`, dan `robot.next_row()` berada di dalam loop luar (bukan loop dalam!).', en: 'Inner loop uses `farm.cols`; `robot.next_row()` sits inside the outer loop.' }, highlightLines: [2, 5], conceptCardId: 'L6' },
          { rung: 3, headline: { id: 'Kerangka Nested Loop', en: 'Nested Loop Scaffold' }, body: { id: 'Isi cols dan next_row.', en: 'Fill in cols and next_row.' }, codeSnippet: 'for r in range(farm.rows):\n    for c in range(farm.cols):\n        robot.plant("wheat")\n        robot.move(1)\n    robot.next_row()' },
          { rung: 4, headline: { id: 'Contoh Solusi', en: 'Worked Solution' }, body: { id: 'Berhasil menanam seluruh ladang 3x5, 2x6, dan 4x4 sehingga air terjun kembali mengalir!', en: 'Plants 3x5, 2x6, and 4x4 fields and restores the waterfall!' }, codeSnippet: 'for r in range(farm.rows):\n    for c in range(farm.cols):\n        robot.plant("wheat")\n        robot.move(1)\n    robot.next_row()' },
        ],
        referenceSolution: 'for r in range(farm.rows):\n    for c in range(farm.cols):\n        robot.plant("wheat")\n        robot.move(1)\n    robot.next_row()',
      },
      {
        stepId: 'm4_bonus',
        missionId: 'm4_automated_farm',
        order: 6,
        isBonus: true,
        title: { id: 'Bonus 4: Lewati Batu', en: 'Bonus 4: Skip the Rocks' },
        goal: {
          id: 'Tanam semua petak tanah pada baris ladang yang memiliki batu di depan dengan `if robot.front() == "rock": continue` tanpa peringatan.',
          en: 'Plant all soil across rows that may end in a rock using `if robot.front() == "rock": continue` with zero warnings.',
        },
        targetKCs: ['L5', 'B2'],
        capabilities: ['print', 'robot.plant', 'robot.move', 'robot.front', 'robot.next_row', 'farm.rows', 'farm.cols'],
        requirementChips: { id: ['Wajib: continue', 'Tanpa menabrak batu'], en: ['Require: continue', 'No rock bumps'] },
        xp: 50,
        unlocksCosmeticId: 'bit_acc_lantern',
        lessonSlides: [
          {
            title: { id: 'Melompati Iterasi dengan continue', en: 'Skipping with continue' },
            body: {
              id: 'Periksa petak di depan dengan `robot.front()`. Jika bernilai `"rock"`, jalankan `continue` agar BIT langsung melompati `robot.plant()` dan `robot.move(1)` pada iterasi tersebut.',
              en: 'Check the tile ahead with `robot.front()`. If it is `"rock"`, run `continue` to skip `robot.plant()` and `robot.move(1)` for that iteration.',
            },
            exampleCode: 'if robot.front() == "rock":\n    continue',
          },
        ],
        starters: {
          guided: 'for r in range(farm.rows):\n    for c in range(farm.cols):\n        if robot.front() == "rock":\n            ___\n        robot.plant("wheat")\n        robot.move(1)\n    robot.next_row()',
          assisted: '# TODO: periksa if robot.front() == "rock": lalu continue\n',
          independent: '# Gunakan nested loop dan continue saat robot.front() == "rock"\n',
          mastery: '',
        },
        astRules: {
          requireConstructs: ['For', 'If'],
          requireExtendedConstructs: ['Continue'],
        },
        scenarios: [
          {
            id: 'm4_bonus_rocks',
            label: 'Teras Berbatu',
            initialState: {
              width: 5,
              height: 2,
              seed: 99,
              robot: { x: 0, y: 0, facing: 'east', rowIndex: 0 },
              farm: {
                rows: 2,
                cols: 4,
                rowStarts: [
                  { x: 0, y: 0, facing: 'east' },
                  { x: 0, y: 1, facing: 'east' },
                ],
                plantedCount: 0,
                targetCount: 6,
              },
              cells: [
                { x: 1, y: 0, kind: 'soil' },
                { x: 2, y: 0, kind: 'soil' },
                { x: 3, y: 0, kind: 'rock' },
                { x: 4, y: 0, kind: 'rock' },
                { x: 1, y: 1, kind: 'soil' },
                { x: 2, y: 1, kind: 'soil' },
                { x: 3, y: 1, kind: 'soil' },
                { x: 4, y: 1, kind: 'soil' },
              ],
            },
            predicates: [
              { type: 'farm_planted_count', exact: 6, allSoilPlanted: true },
              { type: 'no_warnings', allowedCodes: ['no_next_row'] },
            ],
          },
        ],
        hintLadder: [
          { rung: 1, headline: { id: 'Hindari Batu', en: 'Avoid Rocks' }, body: { id: 'Jika depan adalah batu, langsung skip penanaman dan langkah.', en: 'When rock is ahead, skip planting and moving.' } },
          { rung: 2, headline: { id: 'Pakai continue', en: 'Use continue' }, body: { id: 'Letakkan `continue` di dalam `if robot.front() == "rock":`.', en: 'Place `continue` inside the `if`.' }, highlightLines: [4], conceptCardId: 'L5' },
          { rung: 3, headline: { id: 'Kerangka continue', en: 'continue Scaffold' }, body: { id: 'Isi `continue`.', en: 'Fill in `continue`.' }, codeSnippet: 'if robot.front() == "rock":\n    continue' },
          { rung: 4, headline: { id: 'Contoh Solusi', en: 'Worked Solution' }, body: { id: 'Semua petak subur tertanam tanpa menabrak batu.', en: 'All soil planted with zero rock warnings.' }, codeSnippet: 'for r in range(farm.rows):\n    for c in range(farm.cols):\n        if robot.front() == "rock":\n            continue\n        robot.plant("wheat")\n        robot.move(1)\n    robot.next_row()' },
        ],
        referenceSolution: 'for r in range(farm.rows):\n    for c in range(farm.cols):\n        if robot.front() == "rock":\n            continue\n        robot.plant("wheat")\n        robot.move(1)\n    robot.next_row()',
      },
    ],
  },

  // =========================================================================
  // MISSION 5 — The Blueprint (BOLT's Workshop)
  // =========================================================================
  {
    missionId: 'm5_blueprint',
    questId: 'm5_blueprint',
    islandId: 'bolts_workshop',
    order: 5,
    title: { id: 'Misi 5: Cetak Biru', en: 'Mission 5: The Blueprint' },
    subtitle: {
      id: 'Buat fungsi def, parameter, nilai kembali return, dan menara pengawas.',
      en: 'Define def functions, parameters, return values, and the watchtower.',
    },
    npcName: 'BOLT',
    steps: [
      {
        stepId: 'm5_s1',
        missionId: 'm5_blueprint',
        order: 1,
        title: { id: '5.1 Resep Pertama', en: '5.1 First Recipe' },
        goal: {
          id: 'Definisikan def pasang_tiang(): yang menumpuk 3 balok batu, lalu panggil dua kali untuk membangun tiang di (1, 0) dan (3, 0).',
          en: 'Define def pasang_tiang(): stacking 3 stone blocks, then call it twice to build pillars at (1, 0) and (3, 0).',
        },
        targetKCs: ['N1', 'F7'],
        capabilities: ['print', 'robot.place_block', 'robot.move', 'robot.turn'],
        requirementChips: { id: ['Wajib: def pasang_tiang', '2 tiang tinggi 3'], en: ['Require: def pasang_tiang', '2 pillars height 3'] },
        xp: 50,
        lessonSlides: [
          {
            title: { id: 'Resep Fungsi dengan def', en: 'Function Recipes with def' },
            body: { id: 'Menulis `def pasang_tiang():` hanya menyimpan resep. Panggil `pasang_tiang()` agar BIT benar-benar membangun.', en: '`def` only stores the recipe; call `pasang_tiang()` to run it.' },
            exampleCode: 'def pasang_tiang():\n    for i in range(3):\n        robot.place_block("stone")',
          },
        ],
        starters: {
          guided: 'def pasang_tiang():\n    for i in range(3):\n        robot.place_block("stone")\n\npasang_tiang()\nrobot.turn("right")\nrobot.move(2)\nrobot.turn("left")\n___()',
          assisted: '# TODO: definisikan pasang_tiang() lalu panggil di (1, 0), geser ke (3, 1) menghadap utara, dan panggil lagi\ndef pasang_tiang():\n    ',
          independent: '# Buat def pasang_tiang(): dan bangun 2 tiang setinggi 3 di (1, 0) dan (3, 0)\n',
          mastery: '',
        },
        astRules: {
          requireConstructs: ['FunctionDef'],
          requireFunctionName: 'pasang_tiang',
        },
        scenarios: [
          {
            id: 'm5_s1_main',
            label: 'Dua Tiang Bengkel',
            initialState: emptyGrid(5, 2, { robot: { x: 1, y: 1, facing: 'north' } }),
            predicates: [
              {
                type: 'cells_match_blueprint',
                cells: [
                  { x: 1, y: 0, kind: 'block', stackHeight: 3, blockType: 'stone' },
                  { x: 3, y: 0, kind: 'block', stackHeight: 3, blockType: 'stone' },
                ],
              },
            ],
          },
        ],
        hintLadder: [
          { rung: 1, headline: { id: 'Resep Belum Dipanggil', en: 'Recipe Not Called' }, body: { id: 'Mendefinisikan fungsi saja tidak membuat BIT bergerak — kamu harus memanggilnya.', en: 'Defining a function alone does nothing until you call it.' }, socraticQuestion: { id: 'Sudahkah kamu memanggil pasang_tiang() di kedua titik?', en: 'Did you call pasang_tiang() at both spots?' } },
          { rung: 2, headline: { id: 'Panggil Setelah Pindah', en: 'Call After Moving' }, body: { id: 'Panggil pasang_tiang() kedua setelah berbelok dan melangkah ke (3, 1).', en: 'Call pasang_tiang() again after stepping to (3, 1).' }, highlightLines: [9], conceptCardId: 'N1' },
          { rung: 3, headline: { id: 'Kerangka Fungsi', en: 'Function Scaffold' }, body: { id: 'Panggil pasang_tiang().', en: 'Call pasang_tiang().' }, codeSnippet: 'def pasang_tiang():\n    for i in range(3):\n        robot.place_block("stone")\n\npasang_tiang()\nrobot.turn("right")\nrobot.move(2)\nrobot.turn("left")\npasang_tiang()' },
          { rung: 4, headline: { id: 'Contoh Solusi', en: 'Worked Solution' }, body: { id: 'Satu resep dipakai membangun dua tiang identik.', en: 'One function builds both identical pillars.' }, codeSnippet: 'def pasang_tiang():\n    for i in range(3):\n        robot.place_block("stone")\n\npasang_tiang()\nrobot.turn("right")\nrobot.move(2)\nrobot.turn("left")\npasang_tiang()' },
        ],
        referenceSolution: 'def pasang_tiang():\n    for i in range(3):\n        robot.place_block("stone")\n\npasang_tiang()\nrobot.turn("right")\nrobot.move(2)\nrobot.turn("left")\npasang_tiang()',
      },
      {
        stepId: 'm5_s2',
        missionId: 'm5_blueprint',
        order: 2,
        title: { id: '5.2 Parameter', en: '5.2 Parameters' },
        goal: {
          id: 'Ubah fungsi menjadi def pasang_tiang(tinggi): lalu bangun tiang setinggi 2 di (1,0), 4 di (3,0), dan 3 di (5,0).',
          en: 'Add a height parameter: def pasang_tiang(tinggi): and build pillars of height 2, 4, and 3.',
        },
        targetKCs: ['N2'],
        capabilities: ['print', 'robot.place_block', 'robot.move', 'robot.turn'],
        requirementChips: { id: ['Parameter: tinggi', 'Tinggi: 2, 4, 3'], en: ['Parameter: tinggi', 'Heights: 2, 4, 3'] },
        xp: 55,
        lessonSlides: [
          {
            title: { id: 'Parameter Membuat Fungsi Fleksibel', en: 'Parameters Make Recipes Flexible' },
            body: {
              id: 'Parameter adalah nilai masukan di dalam tanda kurung `def`. Dengan `def pasang_tiang(tinggi):`, satu fungsi dapat menumpuk balok batu setinggi angka apa pun yang dikirim saat dipanggil.',
              en: 'A parameter is an input inside `def` parentheses. With `def pasang_tiang(tinggi):`, one function stacks stone blocks to any requested height.',
            },
            exampleCode: 'def pasang_tiang(tinggi):\n    for i in range(tinggi):\n        robot.place_block("stone")',
          },
        ],
        starters: {
          guided: 'def pasang_tiang(___):\n    for i in range(tinggi):\n        robot.place_block("stone")\n\npasang_tiang(2)\nrobot.turn("right")\nrobot.move(2)\nrobot.turn("left")\npasang_tiang(4)\nrobot.turn("right")\nrobot.move(2)\nrobot.turn("left")\npasang_tiang(___)',
          assisted: 'def pasang_tiang(tinggi):\n    for i in range(tinggi):\n        robot.place_block("stone")\n# TODO: bangun tinggi 2 di (1,0), pindah ke (3,1) bangun 4, pindah ke (5,1) bangun 3\n',
          independent: '# Buat def pasang_tiang(tinggi): lalu bangun tinggi 2, 4, 3 di (1,0), (3,0), (5,0)\n',
          mastery: '',
        },
        astRules: {
          requireConstructs: ['FunctionDef'],
          requireFunctionName: 'pasang_tiang',
        },
        scenarios: [
          {
            id: 'm5_s2_main',
            label: 'Tiga Tinggi Tiang',
            initialState: emptyGrid(7, 2, { robot: { x: 1, y: 1, facing: 'north' } }),
            predicates: [
              {
                type: 'cells_match_blueprint',
                cells: [
                  { x: 1, y: 0, kind: 'block', stackHeight: 2, blockType: 'stone' },
                  { x: 3, y: 0, kind: 'block', stackHeight: 4, blockType: 'stone' },
                  { x: 5, y: 0, kind: 'block', stackHeight: 3, blockType: 'stone' },
                ],
              },
            ],
          },
        ],
        hintLadder: [
          { rung: 1, headline: { id: 'Mengirim Ukuran', en: 'Passing the Size' }, body: { id: 'Jika fungsi menerima parameter `tinggi`, pakai `range(tinggi)` di dalamnya.', en: 'Use `range(tinggi)` inside the function.' }, socraticQuestion: { id: 'Tinggi tiang ketiga harus berapa?', en: 'How tall should the third pillar be?' } },
          { rung: 2, headline: { id: 'Parameter tinggi', en: 'Parameter tinggi' }, body: { id: 'Tulis `tinggi` di dalam `def pasang_tiang(tinggi):`.', en: 'Put `tinggi` inside `def pasang_tiang(tinggi):`.' }, highlightLines: [1, 13], conceptCardId: 'N2' },
          { rung: 3, headline: { id: 'Kerangka Parameter', en: 'Parameter Scaffold' }, body: { id: 'Panggil pasang_tiang(3) di akhir.', en: 'Call pasang_tiang(3) last.' }, codeSnippet: 'def pasang_tiang(tinggi):\n    for i in range(tinggi):\n        robot.place_block("stone")\n\npasang_tiang(2)\nrobot.turn("right")\nrobot.move(2)\nrobot.turn("left")\npasang_tiang(4)\nrobot.turn("right")\nrobot.move(2)\nrobot.turn("left")\npasang_tiang(3)' },
          { rung: 4, headline: { id: 'Contoh Solusi', en: 'Worked Solution' }, body: { id: 'Ketiga tiang sesuai dengan cetak biru 2, 4, 3.', en: 'All 3 pillars match heights 2, 4, and 3.' }, codeSnippet: 'def pasang_tiang(tinggi):\n    for i in range(tinggi):\n        robot.place_block("stone")\n\npasang_tiang(2)\nrobot.turn("right")\nrobot.move(2)\nrobot.turn("left")\npasang_tiang(4)\nrobot.turn("right")\nrobot.move(2)\nrobot.turn("left")\npasang_tiang(3)' },
        ],
        referenceSolution: 'def pasang_tiang(tinggi):\n    for i in range(tinggi):\n        robot.place_block("stone")\n\npasang_tiang(2)\nrobot.turn("right")\nrobot.move(2)\nrobot.turn("left")\npasang_tiang(4)\nrobot.turn("right")\nrobot.move(2)\nrobot.turn("left")\npasang_tiang(3)',
      },
      {
        stepId: 'm5_s3',
        missionId: 'm5_blueprint',
        order: 3,
        title: { id: '5.3 Nilai Kembali', en: '5.3 Return Value' },
        goal: {
          id: 'Buat fungsi hitung_balok(lebar, tinggi) yang MENGEMBALIKAN lebar * tinggi dengan return, lalu pesan balok lewat depot.request("stone", hitung_balok(3, 4)).',
          en: 'Define hitung_balok(lebar, tinggi) returning lebar * tinggi via return, then call depot.request("stone", hitung_balok(3, 4)).',
        },
        targetKCs: ['N4', 'N2'],
        capabilities: ['print', 'depot.request'],
        requirementChips: {
          id: ['Wajib: return (bukan print)', 'Diuji dengan (2, 5) dan (4, 4)'],
          en: ['Require: return (not print)', 'Tested on (2, 5) & (4, 4)'],
        },
        xp: 65,
        lessonSlides: [
          {
            title: { id: 'return vs print()', en: 'return vs print()' },
            body: { id: 'depot.request() butuh angka hasil hitung. Jika memakai print(), fungsi mengembalikan None dan depot menolak pesanan!', en: 'depot.request() needs the returned integer. Using print() returns None!' },
            exampleCode: 'def hitung_balok(lebar, tinggi):\n    return lebar * tinggi',
          },
        ],
        starters: {
          guided: 'def hitung_balok(lebar, tinggi):\n    ___ lebar * tinggi\n\ndepot.request("stone", hitung_balok(3, 4))',
          assisted: 'def hitung_balok(lebar, tinggi):\n    # TODO: kembalikan hasil lebar * tinggi (gunakan return)\n\ndepot.request("stone", hitung_balok(3, 4))',
          independent: '# Definisikan hitung_balok(lebar, tinggi) dengan return dan panggil depot.request("stone", hitung_balok(3, 4))\n',
          mastery: '',
        },
        astRules: {
          requireConstructs: ['FunctionDef', 'Return'],
          requireFunctionName: 'hitung_balok',
          forbidPrint: true,
        },
        scenarios: [
          {
            id: 'm5_s3_main',
            label: 'Pesanan Depot 3x4',
            initialState: emptyGrid(3, 1, {
              depot: {
                requestedItem: null,
                requestedAmount: 0,
                expectedItem: 'stone',
                expectedAmount: 12,
                delivered: false,
              },
            }),
            predicates: [{ type: 'depot_delivered', expected: true, item: 'stone', amount: 12 }],
          },
        ],
        functionTests: [
          { id: 'ft_2_5', fnName: 'hitung_balok', args: [2, 5], expectedReturn: 10, description: 'hitung_balok(2, 5) == 10' },
          { id: 'ft_4_4', fnName: 'hitung_balok', args: [4, 4], expectedReturn: 16, description: 'hitung_balok(4, 4) == 16' },
        ],
        hintLadder: [
          { rung: 1, headline: { id: 'Kenapa Depot Menolak None?', en: 'Why Did Depot Refuse?' }, body: { id: 'print() hanya menulis ke layar, tidak mengirim angka kembali ke pemanggil.', en: 'print() displays text; it does not send a number back.' }, socraticQuestion: { id: 'Kata kunci apa yang mengembalikan nilai dari dalam fungsi?', en: 'Which keyword sends a value back from a function?' } },
          { rung: 2, headline: { id: 'Gunakan return', en: 'Use return' }, body: { id: 'Tulis `return lebar * tinggi` di baris 2.', en: 'Write `return lebar * tinggi` on line 2.' }, highlightLines: [2], conceptCardId: 'N4' },
          { rung: 3, headline: { id: 'Kerangka return', en: 'return Scaffold' }, body: { id: 'Isi `return`.', en: 'Fill in `return`.' }, codeSnippet: 'def hitung_balok(lebar, tinggi):\n    return lebar * tinggi\n\ndepot.request("stone", hitung_balok(3, 4))' },
          { rung: 4, headline: { id: 'Contoh Solusi', en: 'Worked Solution' }, body: { id: 'Fungsi lulus uji tersembunyi (2, 5)->10, (4, 4)->16 dan depot mengirim 12 batu.', en: 'Passes hidden unit tests (2,5)=10, (4,4)=16 and delivers 12 stone.' }, codeSnippet: 'def hitung_balok(lebar, tinggi):\n    return lebar * tinggi\n\ndepot.request("stone", hitung_balok(3, 4))' },
        ],
        referenceSolution: 'def hitung_balok(lebar, tinggi):\n    return lebar * tinggi\n\ndepot.request("stone", hitung_balok(3, 4))',
      },
      {
        stepId: 'm5_s4',
        missionId: 'm5_blueprint',
        order: 4,
        title: { id: '5.4 Menara Pengawas', en: '5.4 The Watchtower' },
        goal: {
          id: 'Gunakan fungsi pasang_tiang(tinggi) untuk membangun 4 tiang sudut setinggi 3 di (1, 1), (3, 1), (3, 3), dan (1, 3).',
          en: 'Use pasang_tiang(tinggi) to build 4 corner pillars of height 3 at (1, 1), (3, 1), (3, 3), and (1, 3).',
        },
        targetKCs: ['N1', 'N2', 'L1'],
        capabilities: ['print', 'robot.place_block', 'robot.move', 'robot.turn'],
        requirementChips: { id: ['Wajib: def', '4 tiang sudut menara'], en: ['Require: def', '4 watchtower corner pillars'] },
        xp: 80,
        lessonSlides: [
          {
            title: { id: 'Menyusun Menara dengan Fungsi', en: 'Composing Watchtower Pillars' },
            body: {
              id: 'Gabungkan `def pasang_tiang(tinggi):` dengan loop `for sisi in range(4):`. Kelilingi tepi pelataran 5×5, belok ke dalam (`robot.turn("right")`) untuk memanggil `pasang_tiang(3)`, lalu belok keluar dan lanjutkan ke sudut berikutnya.',
              en: 'Combine `def pasang_tiang(tinggi):` with `for sisi in range(4):`. Walk the 5×5 perimeter, turn inward (`robot.turn("right")`) to call `pasang_tiang(3)`, then turn back and continue.',
            },
            exampleCode: 'for sisi in range(4):\n    robot.move(1)\n    robot.turn("right")\n    pasang_tiang(3)\n    robot.turn("left")\n    robot.move(3)\n    robot.turn("right")',
          },
        ],
        starters: {
          guided: 'def pasang_tiang(tinggi):\n    for i in range(tinggi):\n        robot.place_block("stone")\n\nfor sisi in range(4):\n    robot.move(1)\n    robot.turn("right")\n    pasang_tiang(3)\n    robot.turn("left")\n    robot.move(___)\n    robot.turn("___")',
          assisted: 'def pasang_tiang(tinggi):\n    for i in range(tinggi):\n        robot.place_block("stone")\n\n# TODO: kelilingi 4 sisi: move(1), turn("right"), pasang_tiang(3), turn("left"), move(3), turn("right")\n',
          independent: '# Bangun 4 tiang sudut setinggi 3 di (1,1), (3,1), (3,3), (1,3) memakai fungsi def\n',
          mastery: '',
        },
        astRules: {
          requireConstructs: ['FunctionDef'],
        },
        scenarios: [
          {
            id: 'm5_s4_main',
            label: 'Menara Pengawas',
            initialState: emptyGrid(5, 5, { robot: { x: 0, y: 0, facing: 'east' } }),
            predicates: [
              {
                type: 'cells_match_blueprint',
                cells: [
                  { x: 1, y: 1, kind: 'block', stackHeight: 3, blockType: 'stone' },
                  { x: 3, y: 1, kind: 'block', stackHeight: 3, blockType: 'stone' },
                  { x: 3, y: 3, kind: 'block', stackHeight: 3, blockType: 'stone' },
                  { x: 1, y: 3, kind: 'block', stackHeight: 3, blockType: 'stone' },
                ],
              },
            ],
          },
        ],
        hintLadder: [
          { rung: 1, headline: { id: 'Empat Sudut Simetris', en: 'Four Symmetric Corners' }, body: { id: 'BIT berjalan di tepi luar, menoleh ke dalam untuk memasang tiang sudut, lalu melanjutkan ke sudut berikutnya.', en: 'Walk the outer ring, face inward to build, then continue around.' } },
          { rung: 2, headline: { id: 'Gabungkan Fungsi & Loop', en: 'Combine Function & Loop' }, body: { id: 'Ulangi 4 kali: move(1), turn("right"), pasang_tiang(3), turn("left"), move(3), turn("right").', en: 'Loop 4 times: move(1), turn("right"), pasang_tiang(3), turn("left"), move(3), turn("right").' }, highlightLines: [10, 11] },
          { rung: 3, headline: { id: 'Kerangka Menara', en: 'Watchtower Scaffold' }, body: { id: 'Isi 3 dan "right".', en: 'Fill in 3 and "right".' }, codeSnippet: 'def pasang_tiang(tinggi):\n    for i in range(tinggi):\n        robot.place_block("stone")\n\nfor sisi in range(4):\n    robot.move(1)\n    robot.turn("right")\n    pasang_tiang(3)\n    robot.turn("left")\n    robot.move(3)\n    robot.turn("right")' },
          { rung: 4, headline: { id: 'Contoh Solusi', en: 'Worked Solution' }, body: { id: 'Keempat tiang menara selesai dan membuka tangga menuju Puncak Serpihan Inti!', en: 'All 4 watchtower pillars complete!' }, codeSnippet: 'def pasang_tiang(tinggi):\n    for i in range(tinggi):\n        robot.place_block("stone")\n\nfor sisi in range(4):\n    robot.move(1)\n    robot.turn("right")\n    pasang_tiang(3)\n    robot.turn("left")\n    robot.move(3)\n    robot.turn("right")' },
        ],
        referenceSolution: 'def pasang_tiang(tinggi):\n    for i in range(tinggi):\n        robot.place_block("stone")\n\nfor sisi in range(4):\n    robot.move(1)\n    robot.turn("right")\n    pasang_tiang(3)\n    robot.turn("left")\n    robot.move(3)\n    robot.turn("right")',
      },
      {
        stepId: 'm5_bonus',
        missionId: 'm5_blueprint',
        order: 5,
        isBonus: true,
        title: { id: 'Bonus 5: Parameter Default', en: 'Bonus 5: Default Parameters' },
        goal: {
          id: 'Buat def pasang_tiang(tinggi=3, blok="stone"):, panggil pasang_tiang() tanpa argumen di (1,0), lalu pasang_tiang(2, "wood") di (3,0).',
          en: 'Define pasang_tiang(tinggi=3, blok="stone"), call pasang_tiang() at (1,0) and pasang_tiang(2, "wood") at (3,0).',
        },
        targetKCs: ['N3'],
        capabilities: ['print', 'robot.place_block', 'robot.move', 'robot.turn'],
        requirementChips: { id: ['Wajib: parameter default'], en: ['Require: default parameters'] },
        xp: 50,
        unlocksCosmeticId: 'bit_acc_antenna_flag',
        lessonSlides: [
          {
            title: { id: 'Nilai Default pada Parameter', en: 'Default Parameter Values' },
            body: {
              id: 'Dengan `def pasang_tiang(tinggi=3, blok="stone"):`, parameter memakai nilai bawaan saat fungsi dipanggil tanpa argumen (`pasang_tiang()`), tetapi tetap bisa ditimpa (`pasang_tiang(2, "wood")`).',
              en: 'With `def pasang_tiang(tinggi=3, blok="stone"):`, calling `pasang_tiang()` uses the defaults, while `pasang_tiang(2, "wood")` overrides them.',
            },
            exampleCode: 'def pasang_tiang(tinggi=3, blok="stone"):\n    for i in range(tinggi):\n        robot.place_block(blok)',
          },
        ],
        starters: {
          guided: 'def pasang_tiang(tinggi=___, blok="___"):\n    for i in range(tinggi):\n        robot.place_block(blok)\n\npasang_tiang()\nrobot.turn("right")\nrobot.move(2)\nrobot.turn("left")\npasang_tiang(2, "wood")',
          assisted: 'def pasang_tiang(tinggi=3, blok="stone"):\n    # TODO: tumpuk blok sebanyak tinggi lalu panggil dengan & tanpa argumen\n',
          independent: '# Buat def pasang_tiang(tinggi=3, blok="stone") dan panggil tanpa & dengan argumen\n',
          mastery: '',
        },
        astRules: {
          requireConstructs: ['FunctionDef'],
          requireExtendedConstructs: ['DefaultArg'],
          requireFunctionName: 'pasang_tiang',
        },
        scenarios: [
          {
            id: 'm5_bonus_main',
            label: 'Tiang Batu & Kayu',
            initialState: emptyGrid(5, 2, { robot: { x: 1, y: 1, facing: 'north' } }),
            predicates: [
              {
                type: 'cells_match_blueprint',
                cells: [
                  { x: 1, y: 0, kind: 'block', stackHeight: 3, blockType: 'stone' },
                  { x: 3, y: 0, kind: 'block', stackHeight: 2, blockType: 'wood' },
                ],
              },
            ],
          },
        ],
        hintLadder: [
          { rung: 1, headline: { id: 'Nilai Bawaan', en: 'Default Arguments' }, body: { id: 'Tulis `tinggi=3, blok="stone"` di header fungsi.', en: 'Write `tinggi=3, blok="stone"` in def.' } },
          { rung: 2, headline: { id: 'Gunakan parameter blok', en: 'Use blok Parameter' }, body: { id: 'Kirim `blok` ke robot.place_block(blok).', en: 'Pass `blok` to robot.place_block(blok).' }, highlightLines: [1, 3], conceptCardId: 'N3' },
          { rung: 3, headline: { id: 'Kerangka Default', en: 'Default Scaffold' }, body: { id: 'Lengkapi nilai default.', en: 'Complete defaults.' }, codeSnippet: 'def pasang_tiang(tinggi=3, blok="stone"):\n    for i in range(tinggi):\n        robot.place_block(blok)\n\npasang_tiang()\nrobot.turn("right")\nrobot.move(2)\nrobot.turn("left")\npasang_tiang(2, "wood")' },
          { rung: 4, headline: { id: 'Contoh Solusi', en: 'Worked Solution' }, body: { id: 'Tiang pertama memakai default batu tinggi 3, tiang kedua kayu tinggi 2.', en: 'First pillar uses defaults (3 stone), second overrides (2 wood).' }, codeSnippet: 'def pasang_tiang(tinggi=3, blok="stone"):\n    for i in range(tinggi):\n        robot.place_block(blok)\n\npasang_tiang()\nrobot.turn("right")\nrobot.move(2)\nrobot.turn("left")\npasang_tiang(2, "wood")' },
        ],
        referenceSolution: 'def pasang_tiang(tinggi=3, blok="stone"):\n    for i in range(tinggi):\n        robot.place_block(blok)\n\npasang_tiang()\nrobot.turn("right")\nrobot.move(2)\nrobot.turn("left")\npasang_tiang(2, "wood")',
      },
    ],
  },

  // =========================================================================
  // FINAL CHALLENGE — Inti yang Terbangun (Core Shard Spire)
  // =========================================================================
  {
    missionId: 'final_core_shard',
    questId: 'final_core_shard',
    islandId: 'core_spire',
    order: 6,
    title: { id: 'Tantangan Inti: Inti yang Terbangun', en: 'Final Challenge: The Awakened Core' },
    subtitle: {
      id: 'Gabungkan seluruh konsep Dasar Python untuk memulihkan Serpihan Inti.',
      en: 'Combine all Python fundamentals to restore the Core Shard.',
    },
    npcName: 'NEO & Sang Penjaga',
    steps: [
      {
        stepId: 'final_a',
        missionId: 'final_core_shard',
        order: 1,
        title: { id: 'Tahap A: Kumpulkan Sel', en: 'Stage A: Collect Energy Cells' },
        goal: {
          id: 'Susuri koridor hingga ujung (while robot.front() != "edge":), cek if robot.front() == "cell": untuk memanggil robot.collect("cell") dan hitung jumlah = jumlah + 1 di 3 tata letak.',
          en: 'Walk the corridor until the edge (while robot.front() != "edge":), collect cells when robot.front() == "cell", and count them across 3 layouts.',
        },
        targetKCs: ['L3', 'B2', 'V1'],
        capabilities: ['print', 'robot.move', 'robot.can_move', 'robot.front', 'robot.collect'],
        requirementChips: { id: ['Wajib: while & if', '3 tata letak sel'], en: ['Require: while & if', '3 cell layouts'] },
        xp: 100,
        lessonSlides: [
          { title: { id: 'Indera + Keputusan + Perulangan', en: 'Sense + Decide + Repeat' }, body: { id: 'Berjalanlah selama di depan belum ujung (`robot.front() != "edge"`), kumpulkan sel energi dengan `robot.collect("cell")` saat `robot.front() == "cell"`, lalu maju!', en: 'Loop while `robot.front() != "edge"`, collect cells when `robot.front() == "cell"`, and move forward!' } },
        ],
        starters: {
          guided: 'jumlah = 0\nwhile robot.front() != "edge":\n    if robot.front() == "___":\n        robot.collect("cell")\n        jumlah = jumlah + 1\n    robot.move(1)',
          assisted: 'jumlah = 0\n# TODO: selama front() != "edge", cek front() == "cell" -> collect & tambah jumlah, lalu move(1)\n',
          independent: '# Kumpulkan semua 3 sel energi di 3 tata letak berbeda menggunakan while, if, dan penghitung\n',
          mastery: '',
        },
        astRules: {
          requireConstructs: ['While', 'If'],
        },
        scenarios: [
          makeCellCorridorScenario('final_a_1', 'Koridor 1', [2, 4, 6]),
          makeCellCorridorScenario('final_a_2', 'Koridor 2', [1, 3, 5]),
          makeCellCorridorScenario('final_a_3', 'Koridor 3', [2, 5, 7]),
        ],
        hintLadder: [
          { rung: 1, headline: { id: 'Posisi Sel Berbeda-beda', en: 'Varying Cell Positions' }, body: { id: 'Setiap skenario menaruh sel di jarak berbeda. Periksa robot.front() setiap langkah hingga mencapai ujung ("edge")!', en: 'Cells sit at different spots across layouts; keep checking robot.front() until "edge".' } },
          { rung: 2, headline: { id: 'Kumpulkan Sebelum Maju', en: 'Collect Before Moving' }, body: { id: 'Panggil robot.collect("cell") saat front() == "cell", baru panggil robot.move(1).', en: 'Collect the cell first so the tile opens, then move(1).' }, highlightLines: [3, 4, 6] },
          { rung: 3, headline: { id: 'Kerangka Koridor', en: 'Corridor Scaffold' }, body: { id: 'Isi "cell".', en: 'Fill in "cell".' }, codeSnippet: 'jumlah = 0\nwhile robot.front() != "edge":\n    if robot.front() == "cell":\n        robot.collect("cell")\n        jumlah = jumlah + 1\n    robot.move(1)' },
          { rung: 4, headline: { id: 'Contoh Solusi', en: 'Worked Solution' }, body: { id: 'Ketiga sel terkumpul di semua tata letak.', en: 'All 3 cells collected in every layout.' }, codeSnippet: 'jumlah = 0\nwhile robot.front() != "edge":\n    if robot.front() == "cell":\n        robot.collect("cell")\n        jumlah = jumlah + 1\n    robot.move(1)' },
        ],
        referenceSolution: 'jumlah = 0\nwhile robot.front() != "edge":\n    if robot.front() == "cell":\n        robot.collect("cell")\n        jumlah = jumlah + 1\n    robot.move(1)',
      },
      {
        stepId: 'final_b',
        missionId: 'final_core_shard',
        order: 2,
        title: { id: 'Tahap B: Tangga Inti', en: 'Stage B: Core Stairs' },
        goal: {
          id: 'Buat def buat_tangga(n): yang membangun n anak tangga menaik (tinggi 1..n) memakai loop, lalu panggil buat_tangga(farm.cols).',
          en: 'Define def buat_tangga(n): building n ascending steps (1..n) with a loop, then call buat_tangga(farm.cols).',
        },
        targetKCs: ['N1', 'N2', 'L1', 'L6'],
        capabilities: ['print', 'robot.place_block', 'robot.move', 'robot.turn', 'farm.cols'],
        requirementChips: { id: ['Wajib: def buat_tangga(n) & for', 'Celah 3, 4, 5'], en: ['Require: def buat_tangga(n) & for', 'Gaps 3, 4, 5'] },
        xp: 100,
        lessonSlides: [
          {
            title: { id: 'Tangga Menaik dengan Nested Loop', en: 'Ascending Stairs' },
            body: {
              id: 'Di dalam `def buat_tangga(n):`, gunakan `for tingkat in range(1, n + 1):`. Pada setiap tingkat, panggil `robot.move(1)`, belok kiri (`robot.turn("left")`), tumpuk `tingkat` balok dengan `robot.place_block("stone")`, lalu belok kanan lagi.',
              en: 'Inside `def buat_tangga(n):`, loop `for tingkat in range(1, n + 1):`. On each step, call `robot.move(1)`, `robot.turn("left")`, stack `tingkat` blocks with `robot.place_block("stone")`, and `robot.turn("right")`.',
            },
            exampleCode: 'def buat_tangga(n):\n    for tingkat in range(1, n + 1):\n        robot.move(1)\n        robot.turn("left")\n        for b in range(tingkat):\n            robot.place_block("stone")\n        robot.turn("right")',
          },
        ],
        starters: {
          guided: 'def buat_tangga(n):\n    for tingkat in range(1, n + 1):\n        robot.move(1)\n        robot.turn("left")\n        for b in range(___):\n            robot.place_block("stone")\n        robot.turn("right")\n\nbuat_tangga(farm.cols)',
          assisted: 'def buat_tangga(n):\n    # TODO: di setiap tingkat 1..n, move(1), belok kiri, pasang `tingkat` balok, belok kanan\n\nbuat_tangga(farm.cols)',
          independent: '# Definisikan buat_tangga(n) untuk membangun tangga 1..n lalu panggil buat_tangga(farm.cols)\n',
          mastery: '',
        },
        astRules: {
          requireConstructs: ['FunctionDef', 'For'],
          requireFunctionName: 'buat_tangga',
        },
        scenarios: [
          makeStairScenario('final_b_3', 'Tangga 3', 3),
          makeStairScenario('final_b_4', 'Tangga 4', 4),
          makeStairScenario('final_b_5', 'Tangga 5', 5),
        ],
        hintLadder: [
          { rung: 1, headline: { id: 'Tinggi Tiap Anak Tangga', en: 'Step Height' }, body: { id: 'Anak tangga ke-1 tingginya 1, ke-2 tingginya 2, sampai ke-n tingginya n.', en: 'Step 1 has height 1, step 2 height 2, up to n.' } },
          { rung: 2, headline: { id: 'Loop Dalam Berjumlah tingkat', en: 'Inner Loop = tingkat' }, body: { id: 'Pada tingkat ke-i, ulangi place_block sebanyak `tingkat` kali.', en: 'Repeat place_block `tingkat` times.' }, highlightLines: [5], conceptCardId: 'N2' },
          { rung: 3, headline: { id: 'Kerangka Tangga', en: 'Stair Scaffold' }, body: { id: 'Isi `tingkat` pada range(tingkat).', en: 'Fill in `tingkat`.' }, codeSnippet: 'def buat_tangga(n):\n    for tingkat in range(1, n + 1):\n        robot.move(1)\n        robot.turn("left")\n        for b in range(tingkat):\n            robot.place_block("stone")\n        robot.turn("right")\n\nbuat_tangga(farm.cols)' },
          { rung: 4, headline: { id: 'Contoh Solusi', en: 'Worked Solution' }, body: { id: 'BIT membangun tangga 3, 4, dan 5 tingkat hingga mencapai altar!', en: 'BIT constructs stairs of 3, 4, and 5 steps up to the altar!' }, codeSnippet: 'def buat_tangga(n):\n    for tingkat in range(1, n + 1):\n        robot.move(1)\n        robot.turn("left")\n        for b in range(tingkat):\n            robot.place_block("stone")\n        robot.turn("right")\n\nbuat_tangga(farm.cols)' },
        ],
        referenceSolution: 'def buat_tangga(n):\n    for tingkat in range(1, n + 1):\n        robot.move(1)\n        robot.turn("left")\n        for b in range(tingkat):\n            robot.place_block("stone")\n        robot.turn("right")\n\nbuat_tangga(farm.cols)',
      },
      {
        stepId: 'final_c',
        missionId: 'final_core_shard',
        order: 3,
        title: { id: 'Tahap C: Aktivasi Inti', en: 'Stage C: Core Activation' },
        goal: {
          id: 'Simpan jumlah_sel = 3, aktifkan altar dengan altar.activate(jumlah_sel), lalu cetak f"INTI AKTIF: {jumlah_sel} sel".',
          en: 'Set jumlah_sel = 3, call altar.activate(jumlah_sel), and print f"INTI AKTIF: {jumlah_sel} sel".',
        },
        targetKCs: ['F2', 'V1'],
        capabilities: ['print', 'altar.activate'],
        requirementChips: { id: ['Aktifkan altar (3 sel)', 'Cetak INTI AKTIF: 3 sel'], en: ['Activate altar (3 cells)', 'Print INTI AKTIF: 3 sel'] },
        xp: 100,
        unlocksCosmeticId: 'bit_paint_sky',
        lessonSlides: [
          {
            title: { id: 'Menyatukan Serpihan Inti', en: 'Awakening the Core Shard' },
            body: {
              id: 'Simpan `jumlah_sel = 3`, kirim ke altar menggunakan `altar.activate(jumlah_sel)`, lalu cetak konfirmasi dengan f-string `print(f"INTI AKTIF: {jumlah_sel} sel")` untuk menyalakan Jembatan Langit pertama Aetheria.',
              en: 'Store `jumlah_sel = 3`, feed the altar with `altar.activate(jumlah_sel)`, and print `print(f"INTI AKTIF: {jumlah_sel} sel")` to relight Aetheria’s first Skybridge.',
            },
            exampleCode: 'jumlah_sel = 3\naltar.activate(jumlah_sel)\nprint(f"INTI AKTIF: {jumlah_sel} sel")',
          },
        ],
        starters: {
          guided: 'jumlah_sel = ___\naltar.activate(jumlah_sel)\nprint(f"INTI AKTIF: {jumlah_sel} sel")',
          assisted: 'jumlah_sel = 3\n# TODO: panggil altar.activate(jumlah_sel) dan cetak INTI AKTIF: 3 sel\n',
          independent: '# Aktifkan altar dengan 3 sel dan cetak INTI AKTIF: 3 sel\n',
          mastery: '',
        },
        scenarios: [
          {
            id: 'final_c_main',
            label: 'Altar Puncak Inti',
            initialState: emptyGrid(3, 1, {
              robot: { x: 1, y: 0, facing: 'east', cargo: { cell: 3 } },
              altar: { requiredCells: 3, activatedCells: 0, active: false },
            }),
            predicates: [
              { type: 'altar_active', expected: true, cells: 3 },
              { type: 'stdout_matches_regex', pattern: 'INTI AKTIF:\\s*3\\s*sel' },
            ],
          },
        ],
        hintLadder: [
          { rung: 1, headline: { id: 'Berapa Sel yang Terkumpul?', en: 'How Many Cells?' }, body: { id: 'Tiga sel energi ada di kargo BIT.', en: 'Three energy cells are in BIT’s cargo.' } },
          { rung: 2, headline: { id: 'Aktifkan dan Umumkan', en: 'Activate & Announce' }, body: { id: 'Panggil altar.activate(jumlah_sel) lalu print(...).', en: 'Call altar.activate(jumlah_sel) then print(...).' }, highlightLines: [1, 2, 3] },
          { rung: 3, headline: { id: 'Kerangka Aktivasi', en: 'Activation Scaffold' }, body: { id: 'Isi 3 pada jumlah_sel.', en: 'Set jumlah_sel = 3.' }, codeSnippet: 'jumlah_sel = 3\naltar.activate(jumlah_sel)\nprint(f"INTI AKTIF: {jumlah_sel} sel")' },
          { rung: 4, headline: { id: 'Contoh Solusi', en: 'Worked Solution' }, body: { id: 'Serpihan Inti menyala dan Jembatan Langit menuju Lembah Data muncul di cakrawala!', en: 'The Core Shard awakens and the Skybridge toward Data Valley shimmers on the horizon!' }, codeSnippet: 'jumlah_sel = 3\naltar.activate(jumlah_sel)\nprint(f"INTI AKTIF: {jumlah_sel} sel")' },
        ],
        referenceSolution: 'jumlah_sel = 3\naltar.activate(jumlah_sel)\nprint(f"INTI AKTIF: {jumlah_sel} sel")',
      },
    ],
  },
];

export const ALL_AWAKENING_STEPS: readonly MissionStepManifest[] = AWAKENING_MISSIONS.flatMap(
  (m) => m.steps
);

export function getMissionById(missionId: string): MissionManifest | undefined {
  return AWAKENING_MISSIONS.find((m) => m.missionId === missionId);
}

export function getStepById(stepId: string): MissionStepManifest | undefined {
  return ALL_AWAKENING_STEPS.find((s) => s.stepId === stepId);
}

export function getStepDisplayTitle(step: MissionStepManifest, locale: Locale): string {
  return step.title[locale];
}
