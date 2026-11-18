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
          id: 'Bzzt… Ar-si-tek? Akhirnya kapsul stasismu terbuka! Saat Menara Inti runtuh dan Kesunyian Besar melanda, modul suaraku ikut retak…',
          en: 'Bzzt… Ar-chi-tect? Your stasis pod finally opened! When the Core Spire fell and the Great Silence swept across Aetheria, my voice module fractured…',
        },
        nextNodeId: 'n2',
      },
      n2: {
        id: 'n2',
        speaker: 'NEO',
        visorMood: 'concerned',
        text: {
          id: 'Seluruh pulau terputus dan memoriku tentang bahasa kuno ikut terhapus. Namun lihat ke seberang jembatan—Terminal Suar masih berkedip lemah menunggumu!',
          en: 'Every island was severed and my memory of the ancient language wiped clean. Yet across the bridge, the Beacon Terminal still flickers faintly, waiting for you!',
        },
        choices: [
          {
            id: 'c1',
            label: { id: 'Ayo kita nyalakan kembali Suar itu.', en: "Let's relight that Beacon together." },
            nextNodeId: 'n3',
          },
          {
            id: 'c2',
            label: { id: 'Bahasa apa yang bisa membangunkan dunia ini?', en: 'What language can awaken this world?' },
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
          id: 'Bahasa Python—bahasa para Arsitek! Setiap perintah yang kita tulis akan memulihkan cahaya Aetheria selangkah demi selangkah. Ayo menuju Titik Suar!',
          en: 'Python—the tongue of the Architects! Every line we write will restore Aetheria’s light step by step. Let us head to Beacon Point!',
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
          id: 'Ini dia Terminal Suar! Sejak Kesunyian Besar, suar ini membisu. Di Python, perintah `print("...")` adalah suara pertamamu—ia memancarkan pesan ke dunia dan menambal modul suaraku.',
          en: 'Here is the Beacon Terminal! Since the Great Silence, this spire has stood mute. In Python, `print("...")` is your first voice—it broadcasts into the world and repairs my vocal core.',
        },
        nextNodeId: 'n2',
      },
      n2: {
        id: 'n2',
        speaker: 'NEO',
        visorMood: 'happy',
        text: {
          id: 'Dari satu sapaan hingga membaca namamu dengan `input()`, mari nyalakan kembali segmen cahaya Suar Utama satu per satu!',
          en: 'From a first greeting to reading your name with `input()`, let us rekindle the Beacon’s light segments one by one!',
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
          id: 'Sebuah catatan terikat di sasis BIT: "Jembatan ke Batu Gerbang putus saat Menara Inti jatuh, dan baterai BIT habis total. Beri ia 3 kristal biru agar bisa mengukur celah dan membangun jembatan lagi. — BOLT"',
          en: 'A weathered note clings to BIT’s chassis: "The bridge to Gatehouse Rock snapped when the Core Spire fell, and BIT’s cells drained dry. Feed it 3 blue crystals so it can measure the gap and rebuild. — BOLT"',
        },
        nextNodeId: 'n2',
      },
      n2: {
        id: 'n2',
        speaker: 'NEO',
        visorMood: 'proud',
        text: {
          id: 'Ketiga kristal beresonansi! Mata BIT kembali menyala! Sekarang kita bisa memprogram ingatannya dengan variabel dan angka untuk menyambung jembatan kayu.',
          en: 'All three crystals resonate! BIT’s optics are glowing again! Now we can program its memory with variables and numbers to span the wooden bridge.',
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
          id: 'Pelan-pelan, Arsitek muda. Sejak Kesunyian Besar menutup gerbang ini, banyak yang memaksanya terbuka tanpa hasil. Batu ini hanya tunduk pada kebenaran logika.',
          en: 'Slowly, young Architect. Since the Great Silence sealed this gate, many tried to force it open in vain. These stones bow only to logical truth.',
        },
        nextNodeId: 'n2',
      },
      n2: {
        id: 'n2',
        speaker: 'Kakek Tamo',
        visorMood: 'thinking',
        cameraFocus: { targetId: 'gatehouse_pillars', preset: 'device' },
        text: {
          id: 'Di Python, setiap perbandingan hanya menjawab `True` atau `False`, lalu `if`, `elif`, `else`, dan `and` menentukan siapa yang boleh lewat. Uji keempat pilar rune dulu.',
          en: 'In Python, every comparison answers `True` or `False`, and `if`, `elif`, `else`, and `and` decide who may pass. Test the four rune pillars first.',
        },
        choices: [
          {
            id: 'c1',
            label: { id: 'Aku siap menguji kebenaran pilar rune.', en: 'I am ready to test the rune pillars.' },
            nextNodeId: 'n3',
          },
        ],
      },
      n3: {
        id: 'n3',
        speaker: 'NEO',
        visorMood: 'focused',
        text: {
          id: 'Dengarkan kebijaksanaan Kakek Tamo: gunakan `==` untuk menguji kesamaan, bukan `=`. Ayo buka gerbang menuju Ladang Terasering!',
          en: "Heed Old Tamo's wisdom: use `==` to test equality, not `=`. Let us unlock the way to Terrace Farm!",
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
          id: 'Syukurlah gerbangnya terbuka… Sejak Kesunyian Besar memutus aliran air terjun, ketiga teras ladangku mengering dan kincir air terdiam tanpa panen.',
          en: 'Thank goodness the gate opened… Since the Great Silence stilled the waterfall, all three of my terraces have parched and the water wheel stands motionless.',
        },
        nextNodeId: 'n2',
      },
      n2: {
        id: 'n2',
        speaker: 'BOLT',
        speakerTitle: { id: 'Radio Bengkel', en: 'Workshop Radio' },
        visorMood: 'happy',
        text: {
          id: 'Krrt— Mira! Jangan biarkan Arsitek menanam petak demi petak dengan tangan! Saat ladang kembali hidup dengan irama perulangan `for` dan `while`, kincir air juga akan berputar lagi!',
          en: 'Krrt— Mira! Do not let the Architect sow tile by tile by hand! Once the terraces hum with `for` and `while` loops, the waterfall and wheel will roar back to life!',
        },
        nextNodeId: 'n3',
      },
      n3: {
        id: 'n3',
        speaker: 'NEO',
        visorMood: 'focused',
        cameraFocus: { targetId: 'terrace_farm_grid', preset: 'device' },
        text: {
          id: 'Mari kita rasakan dulu menanam 3 petak manual agar tahu betapa berharganya perulangan, lalu kita hijaukan seluruh terasering bersama BIT!',
          en: "Let's plant 3 tiles manually first to feel why loops matter, then bring green life back to every terrace with BIT!",
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
          id: 'Akhirnya kita bertemu langsung, Arsitek! Aku melihat cahayamu sejak Suar Utama menyala. Lihat ke atas—Menara Pengawas menuju Puncak Inti runtuh tanpa tiang penyangga.',
          en: 'We finally meet face to face, Architect! I have watched your light since the Beacon flared. Look up—the Watchtower to the Core Spire lies stripped of its pillars.',
        },
        nextNodeId: 'n2',
      },
      n2: {
        id: 'n2',
        speaker: 'BOLT',
        visorMood: 'focused',
        cameraFocus: { targetId: 'watchtower_site', preset: 'device' },
        text: {
          id: 'Insinyur sejati tidak menulis ulang resep yang sama empat kali! Simpan pola bangunanmu di dalam fungsi `def` dengan parameter dan `return`, lalu dirikan menara menuju Serpihan Inti!',
          en: 'A true engineer never rewrites the same blueprint four times! Seal your design inside a `def` function with parameters and `return`, and raise the tower to the Core Shard!',
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
          id: 'Serpihan Inti pertama telah bangun dari tidur panjangnya! Suara `print`, ingatan variabel, logika gerbang, irama loop, dan cetak biru fungsi yang kau tulis kini berdenyut kembali di batu dan air Aetheria.',
          en: 'The first Core Shard awakens from its long slumber! The `print` voice, variable memory, gate logic, loop rhythm, and function blueprints you forged now pulse once more through Aetheria’s stone and water.',
        },
        nextNodeId: 'g2',
      },
      g2: {
        id: 'g2',
        speaker: 'Sang Penjaga',
        visorMood: 'focused',
        text: {
          id: 'Namun Kesunyian Besar memecah Code Core menjadi delapan. Tujuh serpihan lain masih tertidur di balik Jembatan Langit, dan tiap wilayah menuntut nalar Python yang lebih dalam.',
          en: 'Yet the Great Silence shattered the Code Core into eight. Seven shards still slumber beyond the Skybridges, each calling for deeper Python craft.',
        },
        nextNodeId: 'g3',
      },
      g3: {
        id: 'g3',
        speaker: 'Sang Penjaga',
        visorMood: 'proud',
        text: {
          id: 'Langkahmu baru dimulai, Arsitek. Teruslah menulis, menguji, dan memulihkan dunia yang menunggumu.',
          en: 'Your journey has only begun, Architect. Keep writing, testing, and restoring the world that awaits you.',
        },
        nextNodeId: 'e1',
      },
      e1: {
        id: 'e1',
        speaker: 'NEO',
        visorMood: 'happy',
        cameraFocus: { targetId: 'skybridge_silhouette', preset: 'overview' },
        text: {
          id: 'Lihat ke cakrawala, Arsitek! Jembatan Langit menuju Lembah Data berkilau lagi—seluruh pulau Kebangkitan bersinar berkat kodemu!',
          en: 'Look at the horizon, Architect! The Skybridge toward Data Valley shimmers anew—all of Awakening shines because of your code!',
        },
        nextNodeId: null,
      },
    },
  },
};
