import type { DialogueTree } from '../../game/dialogue/types';

export const AWAKENING_DIALOGUES: Record<string, DialogueTree> = {
  prologue_neo_reboot: {
    id: 'prologue_neo_reboot',
    startNodeId: 'n1',
    nodes: {
      n1: {
        id: 'n1',
        speaker: 'NEO',
        speakerTitle: { id: 'Drone Pendamping', en: 'Companion Drone' },
        visorMood: 'sleepy',
        cameraFocus: { targetId: 'neo_pedestal', preset: 'speaker' },
        text: {
          id: 'Bzzt… Ar-si-tek? Modul s-suaraku r-rusak saat Kesunyian terjadi…',
          en: 'Bzzt… Ar-chi-tect? My v-voice module f-fractured during the Silence…',
        },
        nextNodeId: 'n2',
      },
      n2: {
        id: 'n2',
        speaker: 'NEO',
        visorMood: 'concerned',
        text: {
          id: 'Memoriku tentang bahasa lama juga kosong. Tapi Terminal Suar di pulau sebelah masih merespons!',
          en: 'My memory of the old language is empty too. Yet the Beacon Terminal ahead still responds!',
        },
        choices: [
          {
            id: 'c1',
            label: { id: 'Ayo kita periksa Suar itu.', en: "Let's check the Beacon." },
            nextNodeId: 'n3',
          },
          {
            id: 'c2',
            label: { id: 'Apa yang harus kutulis nanti?', en: 'What will I need to write?' },
            nextNodeId: 'n3',
          },
        ],
      },
      n3: {
        id: 'n3',
        speaker: 'NEO',
        visorMood: 'happy',
        cameraFocus: { targetId: 'beacon_terminal', preset: 'device' },
        text: {
          id: 'Kita pelajari Python bersama dari awal. Jalan ke Titik Suar dan periksa terminalnya!',
          en: 'We will relearn Python together from scratch. Head to Beacon Point and inspect the terminal!',
        },
        onEnter: [{ type: 'complete_objective', objectiveId: 'pro_2_neo' }],
        nextNodeId: null,
      },
    },
  },

  m1_beacon_intro: {
    id: 'm1_beacon_intro',
    startNodeId: 'n1',
    nodes: {
      n1: {
        id: 'n1',
        speaker: 'NEO',
        visorMood: 'focused',
        cameraFocus: { targetId: 'beacon_terminal', preset: 'device' },
        text: {
          id: 'Lihat layar Suar itu! Perintah `print("...")` menampilkan teks dan memulihkan modul suaraku.',
          en: 'Look at that Beacon screen! `print("...")` displays text and restores my voice module.',
        },
        nextNodeId: 'n2',
      },
      n2: {
        id: 'n2',
        speaker: 'NEO',
        visorMood: 'happy',
        text: {
          id: 'Coba cetak pesan pertamamu di editor untuk menyalakan segmen lampu pertama!',
          en: 'Try printing your first message in the editor to light up the first lamp segment!',
        },
        onEnter: [{ type: 'open_mission', missionId: 'm1_hello_architect', stepId: 'm1_s1' }],
        nextNodeId: null,
      },
    },
  },

  interlude_bit_wake: {
    id: 'interlude_bit_wake',
    startNodeId: 'n1',
    nodes: {
      n1: {
        id: 'n1',
        speaker: 'Sistem',
        speakerTitle: { id: 'Catatan BOLT', en: "BOLT's Note" },
        visorMood: 'surprised',
        cameraFocus: { targetId: 'bit_robot', preset: 'speaker' },
        text: {
          id: 'Catatan di badan BIT: "Baterai BIT habis. Cari 3 kristal biru di hutan untuk membangunkannya. — BOLT"',
          en: 'Note attached to BIT: "BIT is out of power. Find 3 blue crystals in the grove to wake it. — BOLT"',
        },
        nextNodeId: 'n2',
      },
      n2: {
        id: 'n2',
        speaker: 'NEO',
        visorMood: 'proud',
        text: {
          id: 'Kristal terpasang! BIT kembali menyala. Sekarang kita bisa memprogram BIT untuk membangun jembatan!',
          en: 'Crystals installed! BIT is online. Now we can program BIT to build the bridge!',
        },
        onEnter: [{ type: 'open_mission', missionId: 'm2_data_collector', stepId: 'm2_s1' }],
        nextNodeId: null,
      },
    },
  },

  m3_tamo_intro: {
    id: 'm3_tamo_intro',
    startNodeId: 'n1',
    nodes: {
      n1: {
        id: 'n1',
        speaker: 'Kakek Tamo',
        speakerTitle: { id: 'Penjaga Gerbang', en: 'Gatekeeper' },
        visorMood: 'neutral',
        cameraFocus: { targetId: 'old_tamo', preset: 'speaker' },
        text: {
          id: 'Pelan-pelan, Arsitek muda. Gerbang ini tidak menuruti perintah buta — ia hanya mematuhi kebenaran rune.',
          en: 'Slowly, young Architect. This gate obeys no blind command — only rune truths.',
        },
        nextNodeId: 'n2',
      },
      n2: {
        id: 'n2',
        speaker: 'Kakek Tamo',
        visorMood: 'thinking',
        cameraFocus: { targetId: 'gatehouse_pillars', preset: 'device' },
        text: {
          id: 'Di Python, sebuah perbandingan hanya dijawab `True` atau `False`. Mari uji empat teka-teki rune dahulu.',
          en: 'In Python, every comparison yields `True` or `False`. Test the four rune riddles first.',
        },
        choices: [
          {
            id: 'c1',
            label: { id: 'Aku siap menguji pilar rune.', en: 'I am ready to test the rune pillars.' },
            nextNodeId: 'n3',
          },
        ],
      },
      n3: {
        id: 'n3',
        speaker: 'NEO',
        visorMood: 'focused',
        text: {
          id: 'Ingat nasihat Kakek Tamo: gunakan `==` untuk membandingkan, bukan `=`. Ayo mulai!',
          en: "Remember Tamo's advice: use `==` to compare, not `=`. Let's begin!",
        },
        onEnter: [{ type: 'open_mission', missionId: 'm3_locked_gate', stepId: 'm3_s1' }],
        nextNodeId: null,
      },
    },
  },

  m4_mira_intro: {
    id: 'm4_mira_intro',
    startNodeId: 'n1',
    nodes: {
      n1: {
        id: 'n1',
        speaker: 'Mira',
        speakerTitle: { id: 'Petani Terasering', en: 'Terrace Farmer' },
        visorMood: 'neutral',
        cameraFocus: { targetId: 'mira', preset: 'speaker' },
        text: {
          id: 'Air terjun berhenti sejak Kesunyian. Tiga teras ladangku kering dan kincir air tidak berputar.',
          en: 'The waterfall stalled during the Silence. All three terraces are dry and the water wheel is still.',
        },
        nextNodeId: 'n2',
      },
      n2: {
        id: 'n2',
        speaker: 'BOLT',
        speakerTitle: { id: 'Radio Bengkel', en: 'Workshop Radio' },
        visorMood: 'happy',
        text: {
          id: 'Krrt— Mira! Jangan suruh Arsitek menanam satu per satu dengan tangan! Untuk apa ada loop `for` dan `while`?',
          en: 'Krrt— Mira! Do not let the Architect plant by hand! What are `for` and `while` loops for?',
        },
        nextNodeId: 'n3',
      },
      n3: {
        id: 'n3',
        speaker: 'NEO',
        visorMood: 'focused',
        cameraFocus: { targetId: 'terrace_farm_grid', preset: 'device' },
        text: {
          id: 'Ayo rasakan dulu menanam 3 petak manual, lalu kita otomatiskan seluruh ladang bersama BIT!',
          en: "Let's plant 3 tiles manually first, then automate the whole farm with BIT!",
        },
        onEnter: [{ type: 'open_mission', missionId: 'm4_automated_farm', stepId: 'm4_s1' }],
        nextNodeId: null,
      },
    },
  },

  m5_bolt_intro: {
    id: 'm5_bolt_intro',
    startNodeId: 'n1',
    nodes: {
      n1: {
        id: 'n1',
        speaker: 'BOLT',
        speakerTitle: { id: 'Kepala Insinyur', en: 'Master Engineer' },
        visorMood: 'happy',
        cameraFocus: { targetId: 'bolt', preset: 'speaker' },
        text: {
          id: 'Akhirnya kamu sampai! Menara pengawas menuju Puncak Inti belum punya tiang maupun tangga.',
          en: 'You made it! The watchtower to the Core Shard Spire is missing its pillars and stairs.',
        },
        nextNodeId: 'n2',
      },
      n2: {
        id: 'n2',
        speaker: 'BOLT',
        visorMood: 'focused',
        cameraFocus: { targetId: 'watchtower_site', preset: 'device' },
        text: {
          id: 'Kenapa ulangi resep yang sama 4 kali kalau bisa simpan di dalam fungsi `def`? Ayo buat cetak biru pertamamu!',
          en: 'Why repeat the same recipe 4 times when you can save it inside a `def` function? Let us build!',
        },
        onEnter: [{ type: 'open_mission', missionId: 'm5_blueprint', stepId: 'm5_s1' }],
        nextNodeId: null,
      },
    },
  },

  final_guardian_epilogue: {
    id: 'final_guardian_epilogue',
    startNodeId: 'g1',
    nodes: {
      g1: {
        id: 'g1',
        speaker: 'Sang Penjaga',
        speakerTitle: { id: 'Penjaga Code Core', en: 'Keeper of the Code Core' },
        visorMood: 'surprised',
        cameraFocus: { targetId: 'guardian_silhouette', preset: 'overview' },
        text: {
          id: 'Serpihan pertama telah bangun. Suaramu kembali diingat oleh batu dan aliran air Aetheria.',
          en: 'The first Shard awakens. Stone and water remember your Architect voice once more.',
        },
        nextNodeId: 'g2',
      },
      g2: {
        id: 'g2',
        speaker: 'Sang Penjaga',
        visorMood: 'focused',
        text: {
          id: 'Tujuh serpihan lain masih tertidur di balik Jembatan Langit. Setiap wilayah menuntut nalar yang lebih dalam.',
          en: 'Seven shards still slumber beyond the Skybridges. Each region calls for deeper craft.',
        },
        nextNodeId: 'g3',
      },
      g3: {
        id: 'g3',
        speaker: 'Sang Penjaga',
        visorMood: 'proud',
        text: {
          id: 'Langkahmu baru dimulai, Arsitek. Teruslah menulis, menguji, dan memulihkan dunia ini.',
          en: 'Your journey has only begun, Architect. Keep writing, testing, and restoring this world.',
        },
        nextNodeId: 'e1',
      },
      e1: {
        id: 'e1',
        speaker: 'NEO',
        visorMood: 'happy',
        cameraFocus: { targetId: 'skybridge_silhouette', preset: 'overview' },
        text: {
          id: 'Lihat ke cakrawala! Jembatan Langit menuju Lembah Data sudah terlihat. Lembah Data menunggu di pembaruan berikutnya!',
          en: 'Look at the horizon! The Skybridge toward Data Valley is visible. Data Valley awaits in the next update!',
        },
        nextNodeId: null,
      },
    },
  },
};
