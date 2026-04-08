/**
 * Riot API 선수명 → DB 선수명 매핑 테이블
 *
 * Riot API가 반환하는 선수명이 우리 DB와 다를 경우 여기서 정규화합니다.
 * 대소문자나 별칭 차이를 처리합니다.
 *
 * 키: Riot API에서 오는 이름 (소문자 정규화 후 비교)
 * 값: DB에 저장된 이름 (seed.ts 기준)
 *
 * 대부분은 동일하므로 차이가 있는 경우만 등록합니다.
 */
export const RIOT_TO_DB_PLAYER_NAME: Record<string, string> = {
  // T1
  doran: "Doran",
  haetae: "Haetae",
  guardian: "Guardian",
  oner: "Oner",
  painter: "Painter",
  faker: "Faker",
  guti: "Guti",
  peyz: "Peyz",
  cypher: "Cypher",
  keria: "Keria",
  cloud: "Cloud",

  // Gen.G
  kiin: "Kiin",
  ripple: "Ripple",
  canyon: "Canyon",
  courage: "Courage",
  chovy: "Chovy",
  kemish: "Kemish",
  ruler: "Ruler",
  mudai: "MUDAI",
  duro: "Duro",
  siriuss: "SIRIUSS",
  lumos: "Lumos",

  // HLE
  zeus: "Zeus",
  panther: "Panther",
  kanavi: "Kanavi",
  jackal: "Jackal",
  zeka: "Zeka",
  cracker: "Cracker",
  valiant: "Valiant",
  gumayusi: "Gumayusi",
  pyeonsik: "Pyeonsik",
  delight: "Delight",
  bluffing: "Bluffing",

  // DK
  siwoo: "Siwoo",
  jaehyuk: "Jaehyuk",
  nevid: "Nevid",
  lucid: "Lucid",
  sharvel: "Sharvel",
  showmaker: "ShowMaker",
  garden: "Garden",
  smash: "Smash",
  wayne: "Wayne",
  career: "Career",
  loopy: "Loopy",

  // KT
  perfect: "PerfecT",
  sero: "Sero",
  cuzz: "Cuzz",
  sylvie: "Sylvie",
  bdd: "Bdd",
  hwichan: "HwiChan",
  aiming: "Aiming",
  fenrir: "FenRir",
  ghost: "Ghost",
  pollu: "Pollu",
  effort: "Effort",

  // KRX (KIWOOM DRX)
  rich: "Rich",
  frog: "Frog",
  vincenzo: "Vincenzo",
  willer: "Willer",
  winner: "Winner",
  ucal: "Ucal",
  akaje: "AKaJe",
  jiwoo: "Jiwoo",
  lazyfeel: "LazyFeel",
  andil: "Andil",
  minous: "Minous",

  // NS
  kingen: "Kingen",
  janus: "Janus",
  sponge: "Sponge",
  mihawk: "Mihawk",
  scout: "Scout",
  calix: "Calix",
  setab: "SeTab",
  taeyoon: "Taeyoon",
  lucy: "LuCY",
  lehends: "Lehends",
  pleata: "Pleata",

  // BRO
  casting: "Casting",
  ddahyuk: "DDahyuk",
  gideon: "GIDEON",
  dinai: "Dinai",
  roamer: "Roamer",
  loki: "Loki",
  tempester: "Tempester",
  teddy: "Teddy",
  oddeye: "OddEye",
  namgung: "Namgung",
  planb: "PlanB",

  // BFX
  clear: "Clear",
  kangin: "Kangin",
  raptor: "Raptor",
  zephyr: "Zephyr",
  vicla: "VicLa",
  daystar: "Daystar",
  fiesta: "FIESTA",
  diable: "Diable",
  slayer: "Slayer",
  kellin: "Kellin",
  luon: "Luon",

  // DNS
  dudu: "DuDu",
  lancer: "Lancer",
  pyosik: "Pyosik",
  ddoiv: "DDoiV",
  clozer: "Clozer",
  flip: "Flip",
  deokdam: "deokdam",
  enosh: "Enosh",
  life: "Life",
  peter: "Peter",
  quantum: "Quantum",
};

/**
 * Riot API 선수명을 DB 선수명으로 변환합니다.
 * 매핑에 없으면 원본 이름을 반환합니다.
 */
export function normalizePlayerName(riotName: string): string {
  return RIOT_TO_DB_PLAYER_NAME[riotName.toLowerCase()] ?? riotName;
}
