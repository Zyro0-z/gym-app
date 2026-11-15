// Conjunto de datos SINTÉTICO en el formato antiguo (el de seed.json y las copias versión 1).
// No contiene datos personales: se publica en el repo. Cubre los casos que los datos reales
// aún no tienen: estancado, retroceso, inactivo, lb, calentamiento/drop/fallo, duración y
// temporizador, unilaterales con suma de lados, erratas, sin categorizar, duraciones raras,
// bloques que se solapan, fases de peso bulk/cut/mantener y líneas de configuración erróneas.
// Determinista: dos ejecuciones dan exactamente lo mismo.

function rng(semilla) {
  let a = semilla >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const DIA = 864e5;
const iso = (ms) => new Date(ms).toISOString().slice(0, 10);
const ms = (s) => Date.parse(s + "T00:00:00Z");
const hhmm = (min) => String(Math.floor(min / 60) % 24).padStart(2, "0") + ":" + String(min % 60).padStart(2, "0");

const PLANTILLAS = {
  "Torso A": [["Press banca barra", 4], ["Remo con barra", 3], ["Curl mancuernas", 3], ["Elevaciones laterales polea", 3], ["Dominadas", 3]],
  "Pierna A": [["Sentadilla barra", 4], ["Prensa inclinada", 3], ["Plancha", 2], ["Remo ergómetro", 1]],
  "Torso B": [["Press militar mancuernas", 3], ["Extensión tríceps polea", 3], ["Press banca barra", 3], ["Jalón al pecho", 3]],
};

export function fixture() {
  const r = rng(20260515);
  const sesiones = [];
  const inicio = ms("2026-05-04"); // lunes
  const fin = ms("2026-11-13");
  const ciclo = ["Torso A", "Pierna A", "Torso B"];
  let n = 0;
  // estado de cada ejercicio: peso base y reps
  const base = {
    "Press banca barra": 60, "Remo con barra": 55, "Curl mancuernas": 12, "Elevaciones laterales polea": 6,
    "Sentadilla barra": 80, "Prensa inclinada": 140, "Press militar mancuernas": 40, "Extensión tríceps polea": 20,
    "Jalón al pecho": 50,
  };
  for (let t = inicio; t <= fin; t += DIA) {
    const d = new Date(t);
    const wd = ((d.getUTCDay() + 6) % 7) + 1; // 1 = lunes
    if (![1, 3, 5].includes(wd)) continue;
    const f = iso(t);
    if (f >= "2026-07-13" && f <= "2026-07-19") continue; // semana sin entrenar: corta la racha
    const plantilla = ciclo[n % 3];
    n++;
    const semana = Math.floor((t - inicio) / (7 * DIA));
    const ejercicios = [];
    for (const [nombre, objetivo] of PLANTILLAS[plantilla]) {
      // «Fondos lastrados» deja de hacerse: inactivo. Se cuelan en Torso B hasta agosto.
      const sets = [];
      const unit = nombre === "Press militar mancuernas" && f < "2026-08-01" ? "lb" : "kg";
      let peso = base[nombre] || 0;
      if (nombre === "Press banca barra") peso = 60 + 2.5 * Math.floor(semana / 2);            // progresa
      if (nombre === "Sentadilla barra") peso = f < "2026-08-20" ? 80 + 2.5 * Math.floor(semana / 3) : 100; // se estanca
      if (nombre === "Remo con barra") peso = f < "2026-10-15" ? 55 + 2.5 * Math.floor(semana / 3) : 50;  // retrocede
      if (nombre === "Dominadas" || nombre === "Plancha" || nombre === "Remo ergómetro") peso = 0;
      if (unit === "lb") peso = Math.round(peso / 0.45359237);
      if (nombre === "Sentadilla barra" || nombre === "Press banca barra") sets.push({ weight: Math.round(peso / 2), reps: 10, unit, setType: "warmup" });
      for (let i = 0; i < objetivo; i++) {
        let reps = 8 + Math.floor(r() * 4) - (i > 1 ? 1 : 0);
        if (nombre === "Elevaciones laterales polea") reps = 14 + Math.floor(r() * 7);
        if (nombre === "Curl mancuernas") reps = 10 + Math.floor(r() * 4);
        if (nombre === "Sentadilla barra" && f >= "2026-08-20") reps = 6;
        if (nombre === "Prensa inclinada" && f >= "2026-11-01") reps = 12;                 // ⬆ sube carga
        const s = { weight: peso, reps, unit };
        if (nombre === "Plancha") { delete s.weight; s.reps = 0; s.durationSeconds = 45 + 15 * i; }
        if (nombre === "Remo ergómetro") { s.reps = 0; s.durationSeconds = 600; }
        if (i === objetivo - 1 && nombre === "Press banca barra" && semana % 4 === 3) s.setType = "failure";
        // pirámide descendente ocasional
        if (nombre === "Jalón al pecho" && i === 2 && semana % 2) s.weight = peso - 5;
        sets.push(s);
      }
      if (nombre === "Remo con barra" && semana % 5 === 0) sets.push({ weight: peso - 15, reps: 12, unit, setType: "drop" });
      if (nombre === "Curl mancuernas" && f === "2026-06-05") sets[0].reps = 44; // ¿suma de los dos lados?
      if (nombre === "Curl mancuernas" && f >= "2026-11-09") sets.pop();         // ⚠ pocas series
      const ex = { name: nombre, sets };
      if (nombre === "Plancha") ex.exerciseType = "duration";
      if (nombre === "Remo ergómetro") ex.exerciseType = "timer";
      ejercicios.push(ex);
    }
    if (plantilla === "Torso B" && f < "2026-08-01")
      ejercicios.push({ name: "Fondos lastrados", sets: f >= "2026-07-24" ? [{ weight: 15, reps: 5, unit: "kg" }, { weight: 15, reps: 4, unit: "kg" }] // ⚠ por debajo
        : [{ weight: 10, reps: 8, unit: "kg" }, { weight: 10, reps: 8, unit: "kg" }, { weight: 12.5, reps: 7, unit: "kg" }] });
    if (f === "2026-06-17") ejercicios.push({ name: "Prensa inclinda", sets: [{ weight: 150, reps: 10, unit: "kg" }] }); // errata a distancia 1
    if (f === "2026-09-04") ejercicios.push({ name: "Face pull", sets: [{ weight: 20, reps: 15, unit: "kg" }] });           // sin categorizar
    if (f === "2026-10-02") ejercicios.push({ name: "PRESS-BANCA barra", sets: [{ weight: 85, reps: 3, unit: "kg" }] });    // misma clave canónica
    const nSeries = ejercicios.reduce((a, e) => a + e.sets.length, 0);
    let ini = 17 * 60 + Math.floor(r() * 90);
    let dur = Math.round(nSeries * (2.6 + r()));
    let finMin = ini + dur;
    const fm = { type: "workout", template: plantilla, date: f, start: hhmm(ini), end: hhmm(finMin), duration: dur, exercises: ejercicios };
    if (f === "2026-05-15") fm.duration = 220;                      // irreal
    if (f === "2026-06-10") fm.duration = dur + 30;                 // inconsistente con start→end
    if (f === "2026-07-01") { fm.start = "23:30"; fm.end = hhmm(23 * 60 + 30 + dur); } // cruza medianoche
    if (f === "2026-07-22") delete fm.duration;                     // sin duración
    if (f === "2026-08-05") fm.template = "Rutina vieja";           // plantilla que ya no existe
    if (f === "2026-08-12") delete fm.template;                     // sin plantilla
    if (f === "2026-09-09") { fm.duration = 170; fm.start = "10:00"; fm.end = "12:50"; } // sospechosa: min/serie
    sesiones.push({ path: "Workouts/" + f + " " + (fm.template || "Libre") + ".md", fm });
  }
  // dos sesiones el mismo día (cuentan las dos)
  sesiones.push({ path: "Workouts/2026-11-13 Extra.md", fm: { type: "workout", template: "Extra", date: "2026-11-13", start: "20:00", end: "20:20", duration: 20,
    exercises: [{ name: "Dominadas", sets: [{ weight: 0, reps: 10, unit: "kg" }, { weight: 0, reps: 9, unit: "kg" }] }] } });

  const templates = Object.entries(PLANTILLAS).map(([name, ej]) => ({
    path: "Workout Templates/" + name + ".md",
    fm: { type: "workout-template", name, exercises: ej.map(([n, s], i) => (i === 1 && name === "Pierna A" ? { name: n } : { name: n, targetSets: s })) },
  }));

  // pesajes: cut en mayo-julio, mantener en agosto-septiembre, bulk desde octubre
  const pesos = [];
  let kg = 84;
  for (let t = ms("2026-05-01"); t <= ms("2026-10-30"); t += DIA * (1 + Math.floor(r() * 3))) {
    const f = iso(t);
    kg += f < "2026-08-01" ? -0.09 : f < "2026-10-01" ? 0.005 : 0.08;
    kg += (r() - 0.5) * 0.6;
    pesos.push(f + ":: " + (Math.round(kg * 10) / 10).toFixed(1).replace(".", ",") + " kg");
  }
  pesos.splice(10, 0, "2026-05-20:: 81,4");                      // sin unidad: error
  pesos.splice(20, 0, pesos[19].replace(/:: .*/, ":: 82,0 kg"));  // fecha repetida: gana la última

  const configs = {
    "Gym/Config/grupos-musculares.md": [
      "# Grupos musculares", "",
      "Press banca barra:: Pecho", "Remo con barra:: Espalda", "Dominadas:: Espalda", "Jalón al pecho:: Espalda",
      "Curl mancuernas:: Bíceps", "Elevaciones laterales polea:: Hombro", "Press militar mancuernas:: hombro",
      "Sentadilla barra:: Pierna", "Prensa inclinada:: Pierna", "Plancha:: Core", "Remo ergómetro:: Cardio",
      "Extensión tríceps polea:: Tríceps", "Fondos lastrados:: Tríceps",
      "mapa:: Press (agarre cerrado) | Tríceps",
    ].join("\n"),
    "Gym/Config/unilaterales.md": ["unilateral:: Curl mancuernas", "unilateral:: Elevaciones laterales polea", "unilateral:: Curl concentrado", "unilateral:: Curl mancuernas", "unilateral:: "].join("\n"),
    "Gym/Config/objetivos.md": [
      "incremento:: máquina | +2,5", "incremento:: polea | +2,5", "incremento:: mancuerna | +2", "incremento:: barra | +2,5", "incremento:: cosa",
      "Press banca barra:: 6-10", "Sentadilla barra:: 6-8 | top", "Remo con barra:: 8-12 | +5", "Curl mancuernas:: 10-14",
      "Elevaciones laterales polea:: 14-20 | +1", "Press militar mancuernas:: 8-12 | mancuerna", "Extensión tríceps polea:: 10-15 | polea | top",
      "Jalón al pecho:: 8-12 | máquina", "Prensa inclinada:: 10-12", "Fondos lastrados:: 6-10", "Curl concentrado:: 10-12",
      "Remo T:: 12-8", "Pullover:: 8-12 | rara",
    ].join("\n"),
    "Gym/Config/volumen-objetivo.md": ["Pecho:: 10-14", "Espalda:: 12-18", "Pierna:: 10-16", "Hombro:: 8-12", "Bíceps:: 6-10", "Tríceps:: 6-10", "Core:: 2-6", "Glúteo:: 4-8", "Antebrazo:: x"].join("\n"),
    "Gym/Config/colores-grupos.md": ["Pecho:: `#F2727F` | `#C73A50`", "Espalda:: `#5AA9F0`", "Pierna:: `#5CC98A` | `#2E9E62`", "Hombro:: verde"].join("\n"),
    "Gym/Config/horario-semanal.md": [
      "Lunes:: Torso A", "Martes:: Descanso", "Miércoles:: Pierna A", "Jueves:: Descanso", "Viernes:: Torso B", "Sábado:: Libre", "Domingo:: Off",
      "umbral:: Pierna A | duración 150 | por serie 20", "umbral:: Inexistente | duración 90",
      "bloque:: 2026-10-26 | 2026-11-01 | deload",
      "bloque:: 2026-09-01 | 2026-09-28 | especialización tren superior | Pecho, Espalda, Hombro",
      "bloque:: 2026-06-22 | 2026-06-28 | deload | Pierna",
      "bloque:: 2026-06-25 | 2026-06-30 | deload | Espalda",
      "bloque:: 2026-08-10 | 2026-08-01 | deload",
    ].join("\n"),
    "Gym/Config/peso-corporal.md": ["sexo:: hombre", "objetivo:: cut | desde 2026-05-01", "objetivo:: mantener | desde 2026-08-01", "objetivo:: bulk | desde 2026-10-01", ...pesos].join("\n"),
    "Gym/Config/ligas.md": [
      "puntos-sobre-elite:: 5", "margen-descenso:: 1", "semanas-carga:: 8", "semanas-series:: 4",
      "liga:: Madera | p 0-5 | divisiones", "liga:: Cobre | p 5-12,5 | divisiones", "liga:: Hierro | p 12,5-20 | divisiones",
      "liga:: Bronce | p 20-30 | divisiones", "liga:: Plata | p 30-40 | divisiones", "liga:: Oro | p 40-50 | divisiones",
      "liga:: Platino | p 50-60 | divisiones", "liga:: Zafiro | p 60-70 | divisiones", "liga:: Esmeralda | p 70-80 | divisiones",
      "liga:: Rubí | p 80-85 | divisiones", "liga:: Diamante | p 85-90 | divisiones", "liga:: Maestro | p 90-95 | divisiones",
      "liga:: Gran Maestro | elite 1,00-1,10 | divisiones", "liga:: Élite | elite 1,10-1,20 | divisiones", "liga:: Leyenda | elite 1,20+ | sin divisiones",
    ].join("\n"),
    "Gym/Config/estandares.md": [
      "correccion-polea:: factor 1,4",
      "Press banca barra:: bench-press | factor 1",
      "Sentadilla barra:: squat | factor 1",
      "Remo con barra:: bent-over-row",
      "Curl mancuernas:: dumbbell-curl | factor 2 | aproximado",
      "Elevaciones laterales polea:: cable-lateral-raise | factor 1 | polea",
      "Extensión tríceps polea:: tricep-pushdown | factor 1 | polea",
      "Press militar mancuernas:: dumbbell-shoulder-press | factor 1",
      "Jalón al pecho:: lat-pulldown | factor 0,8",
      "Prensa inclinada:: sin estándar",
      "Fondos lastrados:: weighted-dips | factor 1",
      "bench-press:: 60 | 30 | 45 | 65 | 90 | 115", "bench-press:: 80 | 40 | 57 | 80 | 108 | 138", "bench-press:: 100 | 48 | 67 | 93 | 123 | 155",
      "squat:: 60 | 40 | 60 | 85 | 115 | 150", "squat:: 80 | 52 | 75 | 105 | 140 | 178", "squat:: 100 | 62 | 88 | 120 | 158 | 198",
      "bent-over-row:: 60 | 25 | 38 | 55 | 77 | 100", "bent-over-row:: 80 | 33 | 48 | 68 | 93 | 120", "bent-over-row:: 100 | 40 | 57 | 79 | 106 | 136",
      "dumbbell-curl:: 60 | 5 | 9 | 14 | 21 | 28", "dumbbell-curl:: 100 | 8 | 13 | 19 | 27 | 35",
      "cable-lateral-raise:: 60 | 2 | 5 | 9 | 14 | 20", "cable-lateral-raise:: 100 | 3 | 7 | 12 | 18 | 25",
      "tricep-pushdown:: 60 | 12 | 20 | 30 | 43 | 57", "tricep-pushdown:: 100 | 17 | 27 | 40 | 55 | 72",
      "dumbbell-shoulder-press:: 60 | 7 | 12 | 19 | 27 | 36", "dumbbell-shoulder-press:: 100 | 10 | 16 | 25 | 34 | 45",
      "lat-pulldown:: 60 | 25 | 38 | 55 | 76 | 100", "lat-pulldown:: 100 | 37 | 53 | 74 | 99 | 127",
      "squat:: 120 | 50 | 60 | 70 | 80 | 90 | 100",
      "front-squat:: 80 | 50 | 40 | 60 | 80 | 100",
    ].join("\n"),
    "Gym/Config/regiones-svg.md": ["Pecho:: chest-*", "Espalda:: lats-* traps-* spine lower-back-*", "Hombro:: shoulder-front-* shoulder-side-* deltoid-rear-*",
      "Bíceps:: biceps-*", "Tríceps:: triceps-*", "Core:: abs-* obliques-*", "Pierna:: quads-* hamstrings-* calves-* gluteus-*"].join("\n"),
  };

  const library = Array.from(new Set(Object.values(PLANTILLAS).flat().map((x) => x[0]))).map((name) => ({ name, exerciseType: name === "Plancha" ? "duration" : name === "Remo ergómetro" ? "timer" : "weight" }));
  const settings = { restTimerPresets: [30, 60, 90, 120], defaultRestDuration: 90, weightUnit: "kg", keepScreenAwake: true };
  return { sessions: sesiones, templates, configs, settings, library };
}
