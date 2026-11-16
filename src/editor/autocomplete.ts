import {
  autocompletion,
  snippetCompletion,
  type Completion,
  type CompletionContext,
  type CompletionResult,
} from '@codemirror/autocomplete';
import type { Extension } from '@codemirror/state';

export interface ApiCompletionSpec {
  id: string;
  label: string;
  template: string;
  detail: string;
  infoId: string;
  infoEn: string;
  type: 'function' | 'property' | 'keyword';
}

export interface SnippetChip {
  id: string;
  label: string;
  /** String to insert; `#` cursor placeholder uses `|` */
  insertText: string;
  cursorOffset: number;
  requiredCapability?: string;
  requiredKcPrefix?: string;
}

const API_CATALOG: ApiCompletionSpec[] = [
  {
    id: 'print',
    label: 'print',
    template: 'print("${}")',
    detail: '(*values) -> None',
    infoId: 'Menampilkan teks atau nilai ke konsol & terminal.',
    infoEn: 'Prints text or values to the console and terminal.',
    type: 'function',
  },
  {
    id: 'input',
    label: 'input',
    template: 'input("${}")',
    detail: '(prompt="") -> str',
    infoId: 'Meminta masukan teks dari pengguna.',
    infoEn: 'Reads a line of text input from the user.',
    type: 'function',
  },
  {
    id: 'robot.move',
    label: 'robot.move',
    template: 'robot.move(${1})',
    detail: '(steps=1) -> int',
    infoId: 'Menggerakkan BIT maju sejumlah langkah.',
    infoEn: 'Moves BIT forward by the given number of steps.',
    type: 'function',
  },
  {
    id: 'robot.turn',
    label: 'robot.turn',
    template: 'robot.turn("${left}")',
    detail: '("left"|"right"|"around") -> None',
    infoId: 'Memutar arah hadap BIT.',
    infoEn: 'Turns BIT left, right, or around.',
    type: 'function',
  },
  {
    id: 'robot.say',
    label: 'robot.say',
    template: 'robot.say(${})',
    detail: '(value) -> None',
    infoId: 'BIT menampilkan balon ucapan.',
    infoEn: 'Displays a speech bubble above BIT.',
    type: 'function',
  },
  {
    id: 'robot.scan',
    label: 'robot.scan',
    template: 'robot.scan()',
    detail: '() -> str | None',
    infoId: 'Memindai objek tepat di depan BIT.',
    infoEn: 'Scans the object directly in front of BIT.',
    type: 'function',
  },
  {
    id: 'robot.measure',
    label: 'robot.measure',
    template: 'robot.measure()',
    detail: '() -> int',
    infoId: 'Mengukur jumlah petak kosong di depan BIT.',
    infoEn: 'Measures empty cells ahead of BIT.',
    type: 'function',
  },
  {
    id: 'robot.can_move',
    label: 'robot.can_move',
    template: 'robot.can_move()',
    detail: '() -> bool',
    infoId: 'Mengembalikan True jika petak depan bisa dilewati.',
    infoEn: 'Returns True if BIT can step forward.',
    type: 'function',
  },
  {
    id: 'robot.front',
    label: 'robot.front',
    template: 'robot.front()',
    detail: '() -> str',
    infoId: 'Menyebutkan jenis petak di depan BIT ("soil", "rock", dll).',
    infoEn: 'Returns the kind of cell in front of BIT.',
    type: 'function',
  },
  {
    id: 'robot.plant',
    label: 'robot.plant',
    template: 'robot.plant("${wheat}")',
    detail: '("wheat"|"carrot") -> bool',
    infoId: 'Menanam benih di petak tanah depan BIT.',
    infoEn: 'Plants a seed on the soil cell in front of BIT.',
    type: 'function',
  },
  {
    id: 'robot.next_row',
    label: 'robot.next_row',
    template: 'robot.next_row()',
    detail: '() -> bool',
    infoId: 'Berpindah ke awal baris ladang berikutnya.',
    infoEn: 'Moves BIT to the start of the next farm row.',
    type: 'function',
  },
  {
    id: 'robot.place_block',
    label: 'robot.place_block',
    template: 'robot.place_block("${stone}")',
    detail: '("stone"|"wood") -> bool',
    infoId: 'Menempatkan balok di depan BIT.',
    infoEn: 'Places a block in front of BIT.',
    type: 'function',
  },
  {
    id: 'robot.collect',
    label: 'robot.collect',
    template: 'robot.collect("${cell}")',
    detail: '(item) -> bool',
    infoId: 'Mengambil item di depan BIT.',
    infoEn: 'Collects the item in front of BIT.',
    type: 'function',
  },
  {
    id: 'bridge.build',
    label: 'bridge.build',
    template: 'bridge.build(${})',
    detail: '(length) -> bool',
    infoId: 'Membangun jembatan papan sepanjang length petak.',
    infoEn: 'Builds a plank bridge of the given length.',
    type: 'function',
  },
  {
    id: 'sensor.read',
    label: 'sensor.read',
    template: 'sensor.read()',
    detail: '() -> str',
    infoId: 'Membaca warna kristal pada sensor gerbang.',
    infoEn: 'Reads the crystal color from the gate sensor.',
    type: 'function',
  },
  {
    id: 'scale.read',
    label: 'scale.read',
    template: 'scale.read()',
    detail: '() -> int',
    infoId: 'Membaca beban pada timbangan gerbang.',
    infoEn: 'Reads the weight on the gate scale.',
    type: 'function',
  },
  {
    id: 'gate.open',
    label: 'gate.open',
    template: 'gate.open()',
    detail: '() -> None',
    infoId: 'Membuka gerbang batu.',
    infoEn: 'Opens the stone gate.',
    type: 'function',
  },
  {
    id: 'gate.close',
    label: 'gate.close',
    template: 'gate.close()',
    detail: '() -> None',
    infoId: 'Menutup gerbang batu.',
    infoEn: 'Closes the stone gate.',
    type: 'function',
  },
  {
    id: 'gate.light',
    label: 'gate.light',
    template: 'gate.light("${green}")',
    detail: '("red"|"yellow"|"green") -> None',
    infoId: 'Menyalakan lampu indikator gerbang.',
    infoEn: 'Sets the gate indicator light color.',
    type: 'function',
  },
  {
    id: 'gate.is_open',
    label: 'gate.is_open',
    template: 'gate.is_open()',
    detail: '() -> bool',
    infoId: 'Memeriksa apakah gerbang sedang terbuka.',
    infoEn: 'Checks whether the gate is currently open.',
    type: 'function',
  },
  {
    id: 'farm.rows',
    label: 'farm.rows',
    template: 'farm.rows',
    detail: 'int',
    infoId: 'Jumlah baris ladang pada skenario saat ini.',
    infoEn: 'Total number of rows in the current farm.',
    type: 'property',
  },
  {
    id: 'farm.cols',
    label: 'farm.cols',
    template: 'farm.cols',
    detail: 'int',
    infoId: 'Jumlah petak per baris pada ladang saat ini.',
    infoEn: 'Total number of columns per row in the current farm.',
    type: 'property',
  },
  {
    id: 'depot.request',
    label: 'depot.request',
    template: 'depot.request("${stone}", ${})',
    detail: '(item, amount) -> bool',
    infoId: 'Meminta balok dari depot sesuai cetak biru.',
    infoEn: 'Requests blocks from the depot matching the blueprint.',
    type: 'function',
  },
  {
    id: 'altar.activate',
    label: 'altar.activate',
    template: 'altar.activate(${})',
    detail: '(cells) -> bool',
    infoId: 'Mengaktifkan Altar Inti dengan jumlah sel energi.',
    infoEn: 'Activates the Core Altar with the collected energy cells.',
    type: 'function',
  },
];

const PYTHON_KEYWORDS: Completion[] = [
  { label: 'if', type: 'keyword', detail: 'kondisi' },
  { label: 'elif', type: 'keyword', detail: 'kondisi lain' },
  { label: 'else', type: 'keyword', detail: 'alternatif' },
  { label: 'for', type: 'keyword', detail: 'perulangan' },
  { label: 'in', type: 'keyword' },
  { label: 'while', type: 'keyword', detail: 'perulangan kondisi' },
  { label: 'def', type: 'keyword', detail: 'fungsi' },
  { label: 'return', type: 'keyword', detail: 'nilai kembali' },
  { label: 'True', type: 'keyword' },
  { label: 'False', type: 'keyword' },
  { label: 'and', type: 'keyword' },
  { label: 'or', type: 'keyword' },
  { label: 'not', type: 'keyword' },
  { label: 'continue', type: 'keyword' },
  { label: 'break', type: 'keyword' },
  { label: 'range', type: 'function', detail: '(n) / (start, stop)' },
  { label: 'int', type: 'function', detail: '(x) -> int' },
  { label: 'str', type: 'function', detail: '(x) -> str' },
  { label: 'len', type: 'function', detail: '(seq) -> int' },
];

export function filterAllowedApiSpecs(capabilities: string[]): ApiCompletionSpec[] {
  const capSet = new Set(capabilities);
  return API_CATALOG.filter((item) => capSet.has(item.id));
}

export function createCapabilityCompletionSource(
  getCapabilities: () => string[],
  getLocale: () => 'id' | 'en'
) {
  return (context: CompletionContext): CompletionResult | null => {
    const dotted = context.matchBefore(/[a-zA-Z_][a-zA-Z0-9_]*\.[a-zA-Z0-9_]*/);
    const word = context.matchBefore(/[a-zA-Z_][a-zA-Z0-9_]*/);
    const match = dotted ?? word;
    if (!match && !context.explicit) return null;

    const caps = getCapabilities();
    const locale = getLocale();
    const allowed = filterAllowedApiSpecs(caps);

    if (dotted) {
      const prefix = dotted.text.split('.')[0] ?? '';
      const dotPos = dotted.from + prefix.length + 1;
      const options: Completion[] = allowed
        .filter((spec) => spec.label.startsWith(`${prefix}.`))
        .map((spec) => {
          const memberLabel = spec.label.slice(prefix.length + 1);
          const memberTemplate = spec.template.slice(prefix.length + 1);
          return snippetCompletion(memberTemplate, {
            label: memberLabel,
            type: spec.type,
            detail: spec.detail,
            info: locale === 'id' ? spec.infoId : spec.infoEn,
          });
        });
      if (options.length === 0) return null;
      return {
        from: dotPos,
        options,
        validFor: /^[a-zA-Z0-9_]*$/,
      };
    }

    const from = match ? match.from : context.pos;
    const objectPrefixes = Array.from(
      new Set(
        allowed
          .filter((s) => s.label.includes('.'))
          .map((s) => s.label.split('.')[0] ?? '')
          .filter(Boolean)
      )
    );

    const options: Completion[] = [
      ...allowed.map((spec) =>
        snippetCompletion(spec.template, {
          label: spec.label,
          type: spec.type,
          detail: spec.detail,
          info: locale === 'id' ? spec.infoId : spec.infoEn,
        })
      ),
      ...objectPrefixes.map((obj) => ({
        label: obj,
        type: 'variable',
        detail: 'API',
      })),
      ...PYTHON_KEYWORDS,
    ];

    return {
      from,
      options,
      validFor: /^[a-zA-Z0-9_]*$/,
    };
  };
}

export function capabilityAutocompleteExtension(
  getCapabilities: () => string[],
  getLocale: () => 'id' | 'en'
): Extension {
  return autocompletion({
    override: [createCapabilityCompletionSource(getCapabilities, getLocale)],
    activateOnTyping: true,
    maxRenderedOptions: 8,
  });
}

/**
 * Returns unlocked code snippet chips for the mobile `[Keping Kode ▾]` dropdown.
 * Each chip places the cursor inside brackets or quotes (`cursorOffset` from insertion start).
 */
export function getUnlockedSnippetChips(
  capabilities: string[],
  targetKCs: string[] = []
): SnippetChip[] {
  const capSet = new Set(capabilities);
  const kcText = targetKCs.join(',');

  const allChips: SnippetChip[] = [
    {
      id: 'print',
      label: 'print("")',
      insertText: 'print("")',
      cursorOffset: 7,
      requiredCapability: 'print',
    },
    {
      id: 'input',
      label: 'input("")',
      insertText: 'input("")',
      cursorOffset: 7,
      requiredCapability: 'input',
    },
    {
      id: 'robot.move',
      label: 'robot.move()',
      insertText: 'robot.move()',
      cursorOffset: 11,
      requiredCapability: 'robot.move',
    },
    {
      id: 'robot.turn',
      label: 'robot.turn("")',
      insertText: 'robot.turn("")',
      cursorOffset: 12,
      requiredCapability: 'robot.turn',
    },
    {
      id: 'robot.plant',
      label: 'robot.plant("")',
      insertText: 'robot.plant("")',
      cursorOffset: 13,
      requiredCapability: 'robot.plant',
    },
    {
      id: 'bridge.build',
      label: 'bridge.build()',
      insertText: 'bridge.build()',
      cursorOffset: 13,
      requiredCapability: 'bridge.build',
    },
    {
      id: 'if',
      label: 'if …:',
      insertText: 'if :\n    ',
      cursorOffset: 3,
      requiredKcPrefix: 'B',
    },
    {
      id: 'for',
      label: 'for i in range():',
      insertText: 'for i in range():\n    ',
      cursorOffset: 15,
      requiredKcPrefix: 'L',
    },
    {
      id: 'while',
      label: 'while …:',
      insertText: 'while :\n    ',
      cursorOffset: 6,
      requiredKcPrefix: 'L',
    },
    {
      id: 'def',
      label: 'def …():',
      insertText: 'def ():\n    ',
      cursorOffset: 4,
      requiredKcPrefix: 'N',
    },
  ];

  return allChips.filter((chip) => {
    if (chip.requiredCapability && !capSet.has(chip.requiredCapability)) {
      // Allow if no capabilities passed explicitly (fallback)
      if (capabilities.length > 0) return false;
    }
    if (chip.requiredKcPrefix) {
      const hasKc =
        kcText.includes(chip.requiredKcPrefix) ||
        capSet.has('sensor.read') ||
        capSet.has('robot.plant') ||
        capSet.has('depot.request');
      // Only gate control-flow chips when capabilities are restricted to M1
      if (capabilities.length > 0 && !hasKc && !capSet.has('gate.open')) {
        return false;
      }
    }
    return true;
  });
}
