// ===== MUUDETAVAD PARAMEETRID =====
// (lõuendi mõõtmeid pole vaja määrata: lõuend täidab alati terve akna)

const PAIKE_LIIGUB_KLIKIGA = true; // kas päike liigub ka kliki kohta
const PAIKESE_SUURUS = 90;         // päikese läbimõõt
const PAIKESE_SUJUVUS = 0.05;      // kui kiiresti päike kliki kohta liigub (0–1)
const KIIRTE_ARV = 16;             // päikesekiirte arv
const KIIRTE_PIKKUS = 30;          // kiirte pikkus
const KIIRTE_POORLEMINE = 0.01;    // kiirte pöörlemise kiirus

const PILVE_SUURUS_MIN = 60;       // väikseima pilve laius
const PILVE_SUURUS_MAX = 140;      // suurima pilve laius
const PILVE_KIIRUS_MIN = 0.3;      // aeglaseim triivimiskiirus
const PILVE_KIIRUS_MAX = 1.5;      // kiireim triivimiskiirus
const PILVE_MULLID = 6;            // mitmest ringist pilv koosneb
const PILVE_LABIPAISTVUS = 230;    // pilve läbipaistmatus (0–255)
const PILVEDE_MAX = 30;            // pilvede maksimaalne arv korraga

const MERE_KORGUS = 0.75;          // merepiir (0–1 lõuendi kõrgusest)
const LAINETE_KIIRUS = 0.02;       // merelainete liikumise kiirus

// --- Elav taust (kui kiri on avatud) ---
const ELAVUSE_SUJUVUS = 0.03;      // kui sujuvalt taust rahulikust elavaks muutub (0–1, väiksem = aeglasem)
const ELAVUSE_KIIRENDUS = 2.5;     // kui palju kiiremaks liikumine läheb (2.5 = kuni 3,5 korda kiirem)
const ELAVUSE_HELEDUS = 0.22;      // kui palju heledamaks värvid lähevad (0–1)

// ===== GLOBAALNE MUUTUJA, MIDA index.html MUUDAB =====
// 0 = rahulik taust (kiri suletud), 1 = elav taust (kiri avatud).
// Sketch ise liigutab näidu sujuvalt sihtväärtuse poole.
let elavus = 0;

// ===== MUUTUJAD =====
let paikeseX, paikeseY;            // päikese praegune asukoht
let sihtX, sihtY;                  // koht, kuhu päike liigub
let pilved = [];

let elavusSujuv = 0;               // elavus, mis on sujuvalt sihtväärtuse poole liikunud
let kiirteNurk = 0;                // päikesekiirte pöördenurk (koguneb kaader kaadri haaval)
let kiirtePulss = 0;               // kiirte pikkuse "hingamine"
let lainefaas = 0;                 // merelainete faas

function setup() {
  // täisekraani lõuend; paigutatakse #taust elementi (vt index.html)
  let lc = createCanvas(windowWidth, windowHeight);
  lc.parent('taust');
  // päike alustab taeva keskelt
  paikeseX = sihtX = width / 2;
  paikeseY = sihtY = height * 0.3;
}

// Brauseri akna suuruse muutudes venib lõuend kaasa
function windowResized() {
  // arvutame skaala enne suuruse muutmist, et kõik jääks samale suhtelisele kohale
  let kx = windowWidth / width;
  let ky = windowHeight / height;
  resizeCanvas(windowWidth, windowHeight);

  paikeseX *= kx; sihtX *= kx;
  paikeseY *= ky; sihtY *= ky;
  for (let p of pilved) {
    p.x *= kx;
    p.y *= ky;
  }
}

// Hiireklikk: lisab pilve ja liigutab päikese
function mousePressed(event) {
  // klõps ümbrikul, piltidel, kaardil või helinupul ei tohi taevast muuta
  if (event && event.target && event.target.closest &&
      event.target.closest('#ymbrik, .polaroid, .paber, .heli-nupp')) {
    return;
  }

  if (PAIKE_LIIGUB_KLIKIGA) {
    sihtX = mouseX;
    sihtY = mouseY;
  }
  // pilvi lisatakse ainult taevasse
  if (mouseY < height * MERE_KORGUS) {
    pilved.push(looPilv(mouseX, mouseY));
    if (pilved.length > PILVEDE_MAX) pilved.shift(); // vanim pilv kaob
  }
}

// Loob uue pilve objekti
function looPilv(x, y) {
  let laius = random(PILVE_SUURUS_MIN, PILVE_SUURUS_MAX);
  let mullid = [];
  for (let i = 0; i < PILVE_MULLID; i++) {
    mullid.push({
      dx: random(-laius / 2, laius / 2),
      dy: random(-laius / 8, laius / 10),
      r: random(laius * 0.35, laius * 0.6)
    });
  }
  return {
    x: x,
    y: y,
    laius: laius,
    mullid: mullid,
    // suund juhuslik: vasakule või paremale
    kiirus: random(PILVE_KIIRUS_MIN, PILVE_KIIRUS_MAX) * random([-1, 1])
  };
}

// Muudab värvi heledamaks vastavalt elavusele (e = 0..1)
function heleda(c, e) {
  return lerpColor(c, color(255), ELAVUSE_HELEDUS * e);
}

function draw() {
  // --- Elavus liigub sujuvalt sihtväärtuse (elavus) poole ---
  elavusSujuv = lerp(elavusSujuv, constrain(elavus, 0, 1), ELAVUSE_SUJUVUS);
  let e = elavusSujuv;
  let kiirendus = 1 + ELAVUSE_KIIRENDUS * e; // liikumise kiiruse kordaja

  // animatsioonide faasid kogutakse kaader kaadri haaval, et kiiruse muutumisel
  // ei tekiks järske hüppeid (frameCount * kiirus hüppaks)
  kiirteNurk += KIIRTE_POORLEMINE * kiirendus;
  kiirtePulss += 0.05 * kiirendus;
  lainefaas += LAINETE_KIIRUS * kiirendus;

  // --- Päike liigub sujuvalt sihtkoha poole ---
  let sujuvus = constrain(PAIKESE_SUJUVUS * kiirendus, 0, 1);
  paikeseX = lerp(paikeseX, sihtX, sujuvus);
  paikeseY = lerp(paikeseY, sihtY, sujuvus);

  // t = päikese kõrgus: 1 = taeva tipus, 0 = merepiiril või all
  let t = constrain(map(paikeseY, height * MERE_KORGUS, 0, 0, 1), 0, 1);

  // --- Taevas: värv sõltub päikese kõrgusest ja elavusest ---
  let taevasUleval = heleda(lerpColor(color(40, 30, 80), color(90, 170, 240), t), e);
  let taevasAll = heleda(lerpColor(color(250, 120, 70), color(200, 230, 255), t), e);
  push();
  strokeWeight(1);
  for (let y = 0; y < height * MERE_KORGUS; y++) {
    stroke(lerpColor(taevasUleval, taevasAll, y / (height * MERE_KORGUS)));
    line(0, y, width, y);
  }
  pop();

  // --- Päike ---
  joonistaPaike(paikeseX, paikeseY, t, e);

  // --- Pilved (päikese ees) ---
  for (let i = pilved.length - 1; i >= 0; i--) {
    let p = pilved[i];
    p.x += p.kiirus * kiirendus;
    joonistaPilv(p, t, e);
    // eemalda pilv, kui see on lõuendilt väljas
    if (p.x < -p.laius * 1.5 || p.x > width + p.laius * 1.5) {
      pilved.splice(i, 1);
    }
  }

  // --- Meri (joonistatakse viimasena, nii et päike saab "loojuda") ---
  joonistaMeri(t, e);
}

// Joonistab päikese koos pöörlevate kiirtega
function joonistaPaike(x, y, t, e) {
  push();
  translate(x, y);
  // kuma (elavana tugevam)
  noStroke();
  for (let r = PAIKESE_SUURUS * 2; r > PAIKESE_SUURUS; r -= 10) {
    fill(255, 220, 100, 15 + 12 * e);
    circle(0, 0, r);
  }
  // kiired
  rotate(kiirteNurk);
  stroke(255, 210, 80, 180 + 60 * e);
  strokeWeight(3);
  for (let i = 0; i < KIIRTE_ARV; i++) {
    let a = (TWO_PI / KIIRTE_ARV) * i;
    let r1 = PAIKESE_SUURUS / 2 + 5;
    let r2 = r1 + KIIRTE_PIKKUS + sin(kiirtePulss + i) * 8;
    line(cos(a) * r1, sin(a) * r1, cos(a) * r2, sin(a) * r2);
  }
  // ketas: madalal punakam, kõrgel kollasem
  noStroke();
  fill(heleda(lerpColor(color(255, 120, 50), color(255, 230, 90), t), e));
  circle(0, 0, PAIKESE_SUURUS);
  pop();
}

// Joonistab pilve mitmest ringist; värv sõltub päikese kõrgusest ja elavusest
function joonistaPilv(p, t, e) {
  push();
  translate(p.x, p.y);
  noStroke();
  // vari / alumine toon
  let varjuToon = heleda(lerpColor(color(150, 100, 120), color(210, 220, 235), t), e);
  fill(red(varjuToon), green(varjuToon), blue(varjuToon), PILVE_LABIPAISTVUS);
  for (let m of p.mullid) circle(m.dx, m.dy + m.r * 0.12, m.r);
  // hele pealmine osa
  let heleToon = heleda(lerpColor(color(255, 190, 170), color(255, 255, 255), t), e);
  fill(red(heleToon), green(heleToon), blue(heleToon), PILVE_LABIPAISTVUS);
  for (let m of p.mullid) circle(m.dx, m.dy, m.r * 0.9);
  pop();
}

// Joonistab laineliikumisega mere
function joonistaMeri(t, e) {
  let mereY = height * MERE_KORGUS;
  push();
  noStroke();
  fill(heleda(lerpColor(color(30, 40, 90), color(30, 110, 170), t), e));
  rect(0, mereY, width, height - mereY);

  // lainejooned (ridade arv sõltub mere kõrgusest, et täita kogu meri)
  stroke(255, 255, 255, 80 + 50 * e);
  strokeWeight(2);
  noFill();
  let ridu = ceil((height - mereY - 15) / 22);
  for (let rida = 0; rida < ridu; rida++) {
    let y0 = mereY + 15 + rida * 22;
    beginShape();
    for (let x = 0; x <= width + 10; x += 10) {
      vertex(x, y0 + sin(x * 0.03 + lainefaas + rida) * (4 + 2 * e));
    }
    endShape();
  }
  pop();
}
