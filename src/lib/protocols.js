// Protocolos de readaptación por fases. Cada fase trae una SEMANA MODELO: se repite (Duplicar semana)
// hasta cumplir los criterios de la fase. Progresar por criterios, no por calendario.
// Ejercicio: 'Nombre exacto de la biblioteca|series|reps|carga|descanso|indicaciones'
// Fuentes principales en `refs` de cada protocolo.

const S = (day, name, packs) => ({ day, name, packs });
const B = (type, notes, items, rounds = '') => ({ type, notes, rounds, items });

export const PROTOCOLS = [
  // ───────────────────────────── LCA ─────────────────────────────
  {
    key: 'lca', name: 'Readaptación LCA (plastia)', short: 'LCA',
    desc: 'Reconstrucción de ligamento cruzado anterior. 6 fases, de la prequirúrgica al test de vuelta al juego (≥9 meses).',
    refs: [
      'Morales F. Lesiones de rodilla. Máster IPTC, Fidias (bloque 5): fases prequirúrgica, aguda (0-6 sem), transición (6-12 sem), deportiva (3-6 m), RTS y test RTS (≥9 meses, >90 % simetría).',
      'Kotsifaki R, et al. Aspetar clinical practice guideline on rehabilitation after ACL reconstruction. Br J Sports Med. 2023;57:500-14.',
      'van Melick N, et al. Evidence-based clinical practice update: practice guidelines for ACL rehabilitation. Br J Sports Med. 2016;50:1506-15.',
      'Grindem H, et al. Simple decision rules can reduce reinjury risk by 84% after ACL reconstruction (Delaware-Oslo cohort). Br J Sports Med. 2016;50:804-8.',
      'Kyritsis P, et al. Likelihood of ACL graft rupture: not meeting six clinical discharge criteria before return to sport is associated with a four times greater risk of rupture. Br J Sports Med. 2016;50:946-51.',
      'Ardern CL, et al. 2016 Consensus statement on return to sport from the First World Congress in Sports Physical Therapy, Bern. Br J Sports Med. 2016;50:853-64.',
    ],
    phases: [
      { name: 'Fase 0 · Prequirúrgica', notes: 'Duración: hasta la cirugía (idealmente 3-6 semanas).\nObjetivos: rodilla «tranquila» antes de operar: extensión completa (0º), flexión ≥120º, sin derrame, marcha normal y cuádriceps lo más fuerte posible. Educación sobre la lesión, el proceso y los tiempos.\nCriterios para operar en buenas condiciones: ROM completo, derrame mínimo, SLR sin retraso de extensión, fuerza de cuádriceps ≥80-90 % del lado sano.\nEvitar: pivotes, cambios de dirección y deportes con contacto.',
        sessions: [
          S(1, 'Prehab A · movilidad y cuádriceps', [
            B('Movilidad', 'Recuperar y mantener la extensión completa es la prioridad.', ['Extensión de rodilla iso CCC|3|10|Peso corporal|30 s|5 s de mantenimiento en extensión completa', 'Flexión de rodilla|2|12||30 s|Hasta donde no haya dolor', 'Assault o bici|1|10 min|Suave|—|Cadencia cómoda']),
            B('Activación', '', ['Straight leg raise|3|12||45 s|Sin retraso de extensión (que la rodilla no se doble al subir)', 'Leg extensión unilateral|3|10|RIR 3|90 s|Rango 90-45º', 'Puente de glúteo|3|12||45 s|']),
            B('Fuerza', '', ['Squat a 60º|3|8|Goblet ligero · RIR 3|90 s|Sin dolor ni derrame al día siguiente', 'Equilibrio monopodal. 3 dificultades|3|30 s||30 s|Cada pierna']),
          ]),
          S(4, 'Prehab B · fuerza y control', [
            B('Activación', '', ['Precisión neural CCA Steadiness|3|8||60 s|Movimiento lento y controlado', 'Isométrico de isquiosurales|3|30 s|70 % esfuerzo|45 s|']),
            B('Fuerza', '', ['Goblet squat|3|8|RIR 3|90 s|Rango sin dolor', 'Subida a cajón o silla|3|8|Cada pierna|90 s|', 'Peso muerto rumano con mancuernas|3|8|RIR 3|90 s|']),
            B('Neurocognitivo', 'Educación: qué es la lesión, opciones de tratamiento y tiempos.', ['Educación. Tratamiento conservador vs operar. No al reposo|1|1||—|', 'Educación mayor tiempo en volver menos recaer|1|1||—|']),
          ]),
        ] },
      { name: 'Fase 1 · Aguda (0-6 semanas)', notes: 'Duración orientativa: semanas 0-6 tras la cirugía.\nObjetivos: controlar dolor e inflamación, extensión completa en las 2 primeras semanas, flexión progresiva (≥120º hacia la sem. 6), reactivar el cuádriceps y normalizar la marcha.\nCarga: fuerza en cadena cerrada (CCC) de isométricos a dinámicos; cadena abierta (CCA) en rango 90-45º sin carga externa alta.\nCriterios para pasar de fase: extensión completa, flexión ≥120º, derrame ≤ grado 1 (stroke test), SLR sin retraso de extensión, marcha sin muletas y sin cojera, dolor ≤3/10.\nEvitar: anteriorización de la tibia, saltos, giros y pivotes. Si la plastia es de isquiotibiales, nada de carga aislada de isquios hasta la sem. 6-8.',
        sessions: [
          S(1, 'Aguda A · extensión y activación', [
            B('Movilidad', 'Dolor ≤3/10 durante y que no aumente al día siguiente.', ['Extensión de rodilla ISO en dif. alturas en pared OP|3|10|5 s|30 s|Llevar la rodilla a 0º', 'Flexión de rodilla sentado post OP|3|10||30 s|Ganar grados poco a poco', 'Sentido de la posición extensión de rodilla|2|8||30 s|']),
            B('Activación', 'Inhibición del cuádriceps: si no se activa, priorizar estos ejercicios.', ['Straight leg raise|3|10||45 s|Solo si no hay retraso de extensión', 'Leg extensión con mini-banda 45-90 grados 1-5semana|3|12|Banda suave|45 s|Rango 90-45º', 'Disociación retro-anteversión|2|10||30 s|']),
            B('Readaptación', '', ['Aprendizaje marcha transicion a andar|1|5 min||—|Apoyo según indique el cirujano', 'Propiocepción - equilibrio semitándem|3|30 s||30 s|']),
          ]),
          S(4, 'Aguda B · cadena cerrada', [
            B('Activación', '', ['Extensión de rodilla Smootheness OP|3|10||45 s|', 'Puente de glúteo|3|12||45 s|']),
            B('Fuerza', 'Isométricos en CCC; pasar a dinámicos cuando no aumente el derrame.', ['Sentadilla isometrica en pared asimétrica Post-OP|4|30 s|70 % esfuerzo|60 s|Rango 0-60º', 'ISO hold split squat levantando talón|3|20 s||60 s|', 'Extensión de rodilla con banda. CCC|3|12|Banda media|45 s|']),
            B('Acondicionamiento', 'Mantener la condición del resto del cuerpo.', ['Assault o bici|1|10-15 min|Suave|—|Cuando la flexión llegue a ~110º', 'Adaptación ejercicios tracción pierna lesionada|3|10|RIR 2|60 s|Tren superior sin cargar la rodilla']),
          ]),
        ] },
      { name: 'Fase 2 · Transición (6-12 semanas)', notes: 'Duración orientativa: semanas 6-12.\nObjetivos: ROM completo, fuerza en CCC con carga y CCA en rango completo progresivo, reeducar patrones básicos (sentadilla, bisagra, zancada) y control en apoyo monopodal.\nCriterios para pasar de fase (vuelta a la carrera): sin derrame, ROM completo, fuerza de cuádriceps ≥70-80 % del lado sano, 10 saltitos a una pierna sin dolor, sentadilla a una pierna con buen control, ≥12 semanas desde la cirugía.\nEvitar: saltos, giros y pivotes; carga alta en CCA en los últimos grados de extensión hasta la sem. 12.',
        sessions: [
          S(1, 'Transición A · fuerza bilateral', [
            B('Activación', '', ['Extensión de rodilla iso CCC|2|10|5 s|30 s|', 'Spanish squat CCC|3|30 s||45 s|']),
            B('Fuerza', 'RIR 2-3. Sin aumento de derrame al día siguiente.', ['Goblet squat|4|8|RIR 2-3|2 min|', 'Leg extensión unilateral|3|10|RIR 2|90 s|Rango 90-30º', 'Peso muerto rumano con mancuernas|3|8|RIR 2|2 min|', 'Puente unilateral|3|10||60 s|']),
            B('Readaptación', '', ['Equilibrio monopodal. 3 dificultades|3|30 s||30 s|', 'Andar en piscina post OP|1|10 min||—|Si está disponible']),
          ]),
          S(4, 'Transición B · unilateral y control', [
            B('Fuerza', '', ['Subida a cajón o silla|3|8|Cada pierna · RIR 2|90 s|', 'Step down|3|8||60 s|Rodilla alineada, sin valgo', 'Excéntrico prensa unilateral|3|8|3 s bajando|90 s|', 'OLRD Regresión|3|8||60 s|']),
            B('Prevención', '', ['Clamshell|2|15||30 s|', 'Plancha lateral|3|25 s||30 s|']),
            B('Pliometría', 'Solo aprendizaje del aterrizaje, sin saltar todavía.', ['Aprendiendo a aterrizar bilateral|3|5||60 s|Caer suave y con rodillas alineadas']),
          ]),
        ] },
      { name: 'Fase 3 · Deportiva (3-6 meses)', notes: 'Duración orientativa: meses 3-6.\nObjetivos: fuerza máxima en CCC y CCA (incluida RFD), vuelta progresiva a la carrera, frenadas y saltos; carreras en línea y luego en otros planos de baja demanda.\nCriterios para pasar de fase: fuerza de cuádriceps e isquios ≥80-90 % del lado sano, hop tests ≥80 %, carrera continua y deceleraciones sin dolor ni derrame.\nEvitar: cambios de dirección agresivos y contacto.',
        sessions: [
          S(1, 'Deportiva A · fuerza + carrera', [
            B('Activación', '', ['Técnica de carrera|3|20 m||60 s|', 'Skip lineal|3|20 m||60 s|']),
            B('Velocidad', 'Progresión: trote → carreras en línea al 60-70 % → frenadas.', ['Trote adelante atrás|4|30 m|60-70 %|90 s|', 'Aprender a frenar en carrera|4|20 m||90 s|']),
            B('Fuerza', 'RIR 1-2.', ['Back squat|4|5|RIR 2|2-3 min|', 'Sentadilla búlgara goblet|3|8|RIR 2|2 min|', 'Leg extensión unilateral|3|8|RIR 1-2|2 min|Rango completo']),
          ]),
          S(4, 'Deportiva B · saltos y cadena posterior', [
            B('Pliometría', 'De bilateral a unilateral; aterrizajes estables antes de aumentar intensidad.', ['Landing bilateral|3|5||60 s|', 'Aprendiendo los landings|3|5||60 s|', 'HOP a STEP (dos variantes)|3|5|Cada pierna|90 s|']),
            B('Fuerza', '', ['Peso muerto rumano|4|6|RIR 2|2 min|', 'Curl Nórdico fase excéntrica asistida|3|5||2 min|Si la plastia es de isquios, solo tras la sem. 12 y sin dolor', 'Copenhague|3|20 s||60 s|']),
            B('Core', '', ['Pallof de pie|3|10||45 s|']),
          ]),
        ] },
      { name: 'Fase 4 · RTS: vuelta al entrenamiento (6-9 meses)', notes: 'Duración orientativa: meses 6-9.\nObjetivos: cambios de dirección, pliometría unilateral, sprint, incertidumbre (carga cognitiva) y vuelta gradual al entrenamiento con el equipo, primero sin contacto y luego con contacto progresivo.\nCriterios para pasar al test RTS: completar entrenamientos con el equipo sin dolor ni derrame y fuerza y hops ≥90 %.\nControla la carga semanal (RPE × minutos) en la app.',
        sessions: [
          S(1, 'RTS A · cambios de dirección', [
            B('Cambio de dirección', 'De anticipado a reactivo.', ['Shuffle (hold)|3|3||60 s|', 'Cross over|3|4||90 s|', 'COD 45º|4|3||90 s|', 'Cutting con carga cognitiva|4|3||2 min|']),
            B('Pliometría', '', ['Bound lateral|3|5|Cada lado|90 s|', 'Triple crossover hop|3|3|Cada pierna|2 min|']),
            B('Fuerza', '', ['Back squat|3|4|RIR 1-2 · rápido|3 min|', 'Búlgara con salto|3|5||2 min|']),
          ]),
          S(4, 'RTS B · sprint y reactividad', [
            B('Velocidad', '', ['Aceleración|5|20 m|95 %|2-3 min|', 'Sprint curvo|4|30 m||3 min|']),
            B('Pliometría', '', ['Drop jump|3|5||2 min|', 'Hops laterales y frontal con carga cognitiva|3|6||2 min|']),
            B('Neurocognitivo', '', ['Drop jumps con toma de decisión|3|4||2 min|']),
          ]),
        ] },
      { name: 'Fase 5 · Test RTS y vuelta a competir (≥9 meses)', notes: 'Cuándo: no antes de 9 meses (cada mes de espera hasta los 9 reduce ~51 % el riesgo de nueva lesión; Grindem 2016).\nCriterios de alta (todos): fuerza de cuádriceps e isquios ≥90 % del lado sano; hop tests (simple, triple, crossover y 6 m cronometrado) ≥90 %; sin derrame ni dolor; ROM completo; confianza psicológica alta (ACL-RSI); completar entrenamiento con contacto.\nNo cumplir los criterios multiplica por 4 el riesgo de rotura (Kyritsis 2016).\nVuelta a competir modificada: primeros partidos con minutos limitados (return to performance).',
        sessions: [
          S(1, 'Batería de tests RTS', [
            B('Valoración', 'Registra cada test en la ficha (pestaña Tests) con ambos lados para ver la asimetría.', ['CMJ a una pierna test|3|1|Cada pierna|60 s|LSI ≥90 %', 'Hop horizontal|3|1|Cada pierna|60 s|Single hop · LSI ≥90 %', 'Tripe hop test|3|1|Cada pierna|90 s|LSI ≥90 %', 'Triple crossover hop|3|1|Cada pierna|90 s|LSI ≥90 %', 'Drop hop test|3|1|Cada pierna|90 s|', 'Hop rotacional a 90|2|1|Cada lado|60 s|']),
            B('Valoración', 'Pruebas con pre-fatiga e incertidumbre.', ['T-test 90º|3|1||3 min|', 'Illionis test|2|1||3 min|', 'Sprint lineal|3|1|20 m|3 min|']),
          ]),
          S(4, 'Mantenimiento preventivo', [
            B('Prevención', 'Seguir 1-2 veces por semana durante toda la temporada.', ['Curl nórdico|3|5||2 min|', 'Copenhague|3|20 s||60 s|', 'Deceleración a una pierna|3|4||90 s|', 'Skater squat|3|6||90 s|']),
          ]),
        ] },
    ],
  },
  // ─────────────────────────── MENISCO ───────────────────────────
  {
    key: 'menisco', name: 'Readaptación menisco (sutura)', short: 'Menisco',
    desc: 'Reparación (sutura) meniscal aislada. Restricciones de carga y flexión según el tipo de rotura. Incluye nota para meniscectomía.',
    refs: [
      'Morales F. Lesiones de rodilla: operación de menisco. Máster IPTC, Fidias (bloque 5): 4 fases, 3-6 meses.',
      'Calanna F, Duthon V, Menetrey J. Rehabilitation and return to sports after isolated meniscal repairs: a new evidence-based protocol. J Exp Orthop. 2022;9:80: roturas estables carga parcial ≤20 kg 0-4 sem, flexión ≤90º 0-6 sem, sin carga en flexión profunda hasta ~4 meses, RTS 4-6 meses; raíz/radial sin carga 0-6 sem y RTS hasta 9 meses.',
      'Spang RC, et al. Rehabilitation following meniscal repair: a systematic review. BMJ Open Sport Exerc Med. 2018;4:e000212.',
      'Logerstedt DS, et al. Knee pain and mobility impairments: meniscal and articular cartilage lesions. JOSPT Clinical Practice Guideline. 2018.',
    ],
    phases: [
      { name: 'Fase 0 · Prequirúrgica', notes: 'Objetivos: ROM completo o el máximo posible sin bloqueo, sin derrame, cuádriceps activo, educación.\nSi hay bloqueo mecánico (rodilla que no extiende), no forzar: derivar al médico.\nMeniscectomía parcial: sin restricciones de carga; se progresa solo por síntomas y criterios, y la vuelta suele ser en semanas, no meses.',
        sessions: [
          S(1, 'Prehab menisco', [
            B('Movilidad', '', ['Extensión de rodilla iso CCC|3|10|5 s|30 s|', 'Flexión de rodilla|2|12||30 s|Sin dolor', 'Assault o bici|1|10 min|Suave|—|']),
            B('Fuerza', '', ['Straight leg raise|3|12||45 s|', 'Squat a 60º|3|8|RIR 3|90 s|', 'Puente de glúteo|3|12||45 s|', 'Equilibrio monopodal. 3 dificultades|3|30 s||30 s|']),
          ]),
        ] },
      { name: 'Fase 1 · Protección (0-6 semanas)', notes: 'Duración: semanas 0-6.\nCarga: roturas estables (longitudinal, rampa): carga parcial hasta 20 kg las semanas 0-4 y luego según tolerancia. Raíz o radial: sin apoyo 0-6 semanas.\nFlexión: limitada a 90º (con ortesis si la pauta el cirujano) hasta la semana 6.\nObjetivos: extensión completa, flexión hasta 90º, activar cuádriceps, controlar derrame.\nCriterios para pasar de fase: extensión completa, flexión 90º sin dolor, derrame mínimo, SLR sin retraso de extensión y alta del cirujano para cargar.\nEvitar: sentadilla profunda, giros con pie apoyado y cualquier carga en flexión >90º.',
        sessions: [
          S(1, 'Protección A', [
            B('Movilidad', 'Flexión máxima 90º.', ['Extensión de rodilla ISO en dif. alturas en pared OP|3|10|5 s|30 s|', 'Flexión de rodilla sentado post OP|3|10|Hasta 90º|30 s|']),
            B('Activación', '', ['Straight leg raise|3|10||45 s|', 'Extensión de rodilla Smootheness OP|3|10||45 s|', 'Abducción de cadera decubito lateral OP|3|12||30 s|', 'Extension de cadera decubito prono OP|3|12||30 s|']),
            B('Acondicionamiento', '', ['Adaptación ejercicios tracción pierna lesionada|3|10|RIR 2|60 s|Tren superior sentado', 'Adaptaciones ejercicios empuje pierna lesionada|3|10|RIR 2|60 s|']),
          ]),
          S(4, 'Protección B', [
            B('Activación', '', ['Sentido de la posición extensión de rodilla|2|8||30 s|', 'Leg extensión con mini-banda 45-90 grados 1-5semana|3|12|Banda suave|45 s|Solo 90-45º, sin pasar de 90º']),
            B('Readaptación', 'Según la carga permitida por el cirujano.', ['Aprendizaje marcha transicion a andar|1|5 min||—|Carga parcial', 'Propiocepción - equilibrio semitándem|3|30 s||30 s|Solo si puede cargar']),
            B('Core', '', ['Dead bug|3|10||45 s|', 'Plancha|3|20 s||45 s|']),
          ]),
        ] },
      { name: 'Fase 2 · Carga progresiva (6-12 semanas)', notes: 'Duración: semanas 6-12.\nObjetivos: carga completa, marcha normal, flexión >90º progresiva, fuerza en CCC en rango medio (0-60/70º), control monopodal.\nCriterios para pasar de fase: ROM completo, sin derrame, fuerza de cuádriceps ≥70 % del lado sano, marcha y escaleras sin dolor.\nEvitar: carga en flexión profunda (>90º) hasta ~4 meses; pivotes.',
        sessions: [
          S(1, 'Carga A', [
            B('Fuerza', 'Rango 0-60/70º con carga.', ['Squat a 60º|4|10|RIR 3|90 s|', 'Sentadilla isometrica en pared asimétrica con peso|3|30 s||60 s|', 'Leg extensión unilateral|3|10|RIR 3|90 s|Rango 90-30º', 'Puente unilateral|3|10||60 s|']),
            B('Readaptación', '', ['Equilibrio monopodal. 3 dificultades|3|30 s||30 s|', 'Marcha en piscina post OP|1|10 min||—|Si está disponible']),
          ]),
          S(4, 'Carga B', [
            B('Fuerza', '', ['Subida a cajón o silla|3|10|Cajón bajo|60 s|', 'Step down|3|8||60 s|', 'Peso muerto rumano con mancuernas|3|10|RIR 3|90 s|']),
            B('Acondicionamiento', '', ['Assault o bici|1|15-20 min|Moderado|—|']),
            B('Prevención', '', ['Clamshell|2|15||30 s|', 'Monster Walk direccional|2|10 m||30 s|']),
          ]),
        ] },
      { name: 'Fase 3 · Fuerza y carrera (3-4/5 meses)', notes: 'Duración: meses 3-4 (estables) o 4-5 (raíz/radial: un mes más).\nObjetivos: fuerza con carga externa, flexión profunda con carga desde ~4 meses, vuelta a la carrera en línea, aterrizajes bilaterales.\nCriterios para pasar de fase: fuerza ≥80-90 % del lado sano, carrera continua sin dolor ni derrame, hops sin dolor.\nEvitar: pivotes y contacto.',
        sessions: [
          S(1, 'Fuerza A', [
            B('Fuerza', '', ['Goblet squat|4|8|RIR 2|2 min|Profundidad completa solo desde el mes 4', 'Sentadilla búlgara goblet|3|8|RIR 2|2 min|', 'Leg extensión unilateral|3|10|RIR 2|90 s|']),
            B('Velocidad', 'Vuelta a correr: series cortas, superficie regular.', ['Técnica de carrera|3|20 m||60 s|', 'Trote adelante atrás|4|40 m|60 %|90 s|']),
          ]),
          S(4, 'Fuerza B', [
            B('Pliometría', '', ['Aprendiendo a aterrizar bilateral|3|5||60 s|', 'Landing bilateral|3|5||60 s|']),
            B('Fuerza', '', ['Peso muerto rumano|4|6|RIR 2|2 min|', 'Curl Nórdico fase excéntrica asistida|3|5||2 min|Isquios aislados desde el mes 4', 'Copenhague|3|20 s||60 s|']),
          ]),
        ] },
      { name: 'Fase 4 · RTS (4-6 meses; raíz/radial hasta 9)', notes: 'Cuándo: roturas estables 4-6 meses; raíz o radial en deporte de contacto y pivote, hasta 9 meses.\nObjetivos: cambios de dirección, pliometría unilateral, sprint y vuelta gradual al equipo.\nCriterios de alta: fuerza de cuádriceps e isquios ≥90 %, hop tests ≥90 %, sin derrame ni dolor con pivotes, completar entrenamiento con contacto.\nVolver demasiado rápido a alta actividad es factor de riesgo de fallo de la sutura, sobre todo en jóvenes.',
        sessions: [
          S(1, 'RTS A', [
            B('Cambio de dirección', '', ['Shuffle (hold)|3|3||60 s|', 'Cross over|3|4||90 s|', 'COD 45º|4|3||90 s|']),
            B('Pliometría', '', ['HOP a STEP (dos variantes)|3|5||90 s|', 'Bound lateral|3|5||90 s|']),
            B('Fuerza', '', ['Back squat|4|5|RIR 2|3 min|']),
          ]),
          S(4, 'Tests RTS', [
            B('Valoración', 'Registra los resultados en la pestaña Tests.', ['Hop horizontal|3|1|Cada pierna|60 s|LSI ≥90 %', 'Tripe hop test|3|1|Cada pierna|90 s|', 'Triple crossover hop|3|1|Cada pierna|90 s|', 'CMJ a una pierna test|3|1|Cada pierna|60 s|']),
          ]),
        ] },
    ],
  },
  // ─────────────────────────── LCA + MENISCO ───────────────────────────
  {
    key: 'lca-menisco', name: 'Readaptación LCA + menisco (lesión compleja)', short: 'LCA+menisco',
    desc: 'Plastia de LCA con sutura meniscal: las fases del LCA con las restricciones del menisco en las primeras 6 semanas.',
    refs: [
      'Morales F. Lesión compleja (LCA + menisco ± LLI). Máster IPTC, Fidias (bloque 5): fase aguda con ROM 0-90º, CCA <90º sin carga y apoyo restringido.',
      'Kotsifaki R, et al. Aspetar ACLR guideline. Br J Sports Med. 2023.',
      'Calanna F, Duthon V, Menetrey J. J Exp Orthop. 2022;9:80.',
      'Grindem H, et al. Br J Sports Med. 2016;50:804-8.',
    ],
    phases: [
      { name: 'Fase 0 · Prequirúrgica', notes: 'Igual que LCA aislado: extensión completa, sin derrame, cuádriceps activo. Si hay bloqueo meniscal, no forzar la extensión: lo resuelve la cirugía.',
        sessions: [
          S(1, 'Prehab', [
            B('Movilidad', '', ['Extensión de rodilla iso CCC|3|10|5 s|30 s|', 'Assault o bici|1|10 min|Suave|—|']),
            B('Fuerza', '', ['Straight leg raise|3|12||45 s|', 'Leg extensión unilateral|3|10|RIR 3|90 s|90-45º', 'Squat a 60º|3|8|RIR 3|90 s|', 'Equilibrio monopodal. 3 dificultades|3|30 s||30 s|']),
          ]),
        ] },
      { name: 'Fase 1 · Aguda con restricción meniscal (0-6 semanas)', notes: 'Duración: semanas 0-6.\nRestricciones (las del menisco mandan): flexión 0-90º; apoyo sin carga o parcial según el tipo de sutura y el cirujano; CCA <90º sin carga externa.\nObjetivos: extensión completa, flexión hasta 90º, activar cuádriceps, controlar derrame.\nCriterios para pasar de fase: extensión completa, flexión 90º, derrame mínimo, SLR sin retraso y alta para cargar.\nEvitar: flexión >90º, apoyo completo antes de tiempo, anteriorización de la tibia, giros.',
        sessions: [
          S(1, 'Aguda A', [
            B('Movilidad', 'Máximo 90º de flexión.', ['Extensión de rodilla ISO en dif. alturas en pared OP|3|10|5 s|30 s|', 'Flexión de rodilla sentado post OP|3|10|Hasta 90º|30 s|']),
            B('Activación', '', ['Straight leg raise|3|10||45 s|', 'Leg extensión con mini-banda 45-90 grados 1-5semana|3|12|Banda suave|45 s|Sin pasar de 90º', 'Abducción de cadera decubito lateral OP|3|12||30 s|']),
          ]),
          S(4, 'Aguda B', [
            B('Activación', '', ['Extensión de rodilla Smootheness OP|3|10||45 s|', 'Sentido de la posición extensión de rodilla|2|8||30 s|', 'Extension de cadera decubito prono OP|3|12||30 s|']),
            B('Acondicionamiento', '', ['Adaptación ejercicios tracción pierna lesionada|3|10|RIR 2|60 s|', 'Adaptaciones ejercicios empuje pierna lesionada|3|10|RIR 2|60 s|']),
          ]),
        ] },
      { name: 'Fase 2 · Transición (6-12 semanas)', notes: 'Duración: semanas 6-12 (puede alargarse 2-4 semanas respecto al LCA aislado).\nObjetivos: carga completa, flexión >90º progresiva, fuerza en CCC (0-60/70º), CCA en rango completo progresivo, control monopodal.\nCriterios para pasar de fase: ROM completo, sin derrame, fuerza de cuádriceps ≥70-80 %, marcha y escaleras sin dolor.\nEvitar: carga en flexión profunda hasta ~4 meses; saltos y pivotes.',
        sessions: [
          S(1, 'Transición A', [
            B('Fuerza', '', ['Squat a 60º|4|10|RIR 3|90 s|', 'Leg extensión unilateral|3|10|RIR 3|90 s|90-30º', 'Puente unilateral|3|10||60 s|']),
            B('Readaptación', '', ['Equilibrio monopodal. 3 dificultades|3|30 s||30 s|', 'Marcha en piscina post OP|1|10 min||—|']),
          ]),
          S(4, 'Transición B', [
            B('Fuerza', '', ['Subida a cajón o silla|3|8|Cajón bajo|60 s|', 'Step down|3|8||60 s|', 'Peso muerto rumano con mancuernas|3|8|RIR 3|90 s|']),
            B('Acondicionamiento', '', ['Assault o bici|1|15-20 min|Moderado|—|']),
          ]),
        ] },
      { name: 'Fase 3 · Deportiva (3-6 meses)', notes: 'Duración: meses 3-6 (carrera desde ~3-4 meses si cumple criterios).\nObjetivos: fuerza máxima, flexión profunda con carga desde ~4 meses, carrera, frenadas y saltos.\nCriterios para pasar de fase: fuerza y hops ≥80-90 %, carrera y deceleraciones sin dolor ni derrame.',
        sessions: [
          S(1, 'Deportiva A', [
            B('Velocidad', '', ['Técnica de carrera|3|20 m||60 s|', 'Trote adelante atrás|4|30 m|60-70 %|90 s|', 'Aprender a frenar en carrera|3|20 m||90 s|']),
            B('Fuerza', '', ['Back squat|4|5|RIR 2|3 min|Profundidad completa desde el mes 4', 'Sentadilla búlgara goblet|3|8|RIR 2|2 min|']),
          ]),
          S(4, 'Deportiva B', [
            B('Pliometría', '', ['Landing bilateral|3|5||60 s|', 'HOP a STEP (dos variantes)|3|5||90 s|']),
            B('Fuerza', '', ['Peso muerto rumano|4|6|RIR 2|2 min|', 'Leg extensión unilateral|3|8|RIR 2|2 min|', 'Copenhague|3|20 s||60 s|']),
          ]),
        ] },
      { name: 'Fase 4 · RTS y test (≥9 meses)', notes: 'Cuándo: no antes de 9 meses.\nCriterios de alta: los del LCA (fuerza y hops ≥90 %, sin derrame, confianza psicológica, entrenamiento con contacto completado) y sin dolor en la interlínea con pivotes y flexión profunda.',
        sessions: [
          S(1, 'RTS', [
            B('Cambio de dirección', '', ['Cross over|3|4||90 s|', 'COD 45º|4|3||90 s|', 'Cutting con carga cognitiva|4|3||2 min|']),
            B('Pliometría', '', ['Triple crossover hop|3|3||2 min|', 'Drop jump|3|5||2 min|']),
          ]),
          S(4, 'Tests RTS', [
            B('Valoración', '', ['CMJ a una pierna test|3|1|Cada pierna|60 s|', 'Hop horizontal|3|1|Cada pierna|60 s|', 'Tripe hop test|3|1|Cada pierna|90 s|', 'Triple crossover hop|3|1|Cada pierna|90 s|', 'T-test 90º|3|1||3 min|']),
          ]),
        ] },
    ],
  },
  // ─────────────────────────── HOMBRO ───────────────────────────
  {
    key: 'hombro', name: 'Readaptación hombro: luxación anterior / inestabilidad', short: 'Hombro',
    desc: 'Luxación glenohumeral anterior, tratamiento conservador o tras estabilización (Bankart artroscópico o Latarjet). El placaje es la exigencia final.',
    refs: [
      'Montoro J. El complejo del hombro: inestabilidad, luxación anterior (Hill-Sachs), discinesia escapular y ejercicios. Máster IPTC, Fidias.',
      'Return to play tras estabilización en deportistas (PMC7645762): tras Bankart artroscópico, RE pasiva ≤30º 0-4 sem, fuerza desde sem. 7, actividad sin restricciones ~3,5-4 meses; Latarjet, RE <30º 0-3 sem, fuerza desde sem. 6, vuelta ~3,5-4 meses (PMC7645762). Vuelta en temporada tras tratamiento conservador: 73 % de recidiva.',
      'Kibler WB, et al. Clinical implications of scapular dyskinesis in shoulder injury: the 2013 consensus statement from the «Scapular Summit». Br J Sports Med. 2013;47:877-85.',
      'Tucci HT, et al. Closed Kinetic Chain Upper Extremity Stability test (CKCUEST): reliability and normative data. BMC Musculoskelet Disord. 2014.',
    ],
    phases: [
      { name: 'Fase 1 · Protección (0-3/4 semanas)', notes: 'Duración: 0-3 semanas (conservador o Latarjet) / 0-4 semanas (Bankart).\nObjetivos: proteger, controlar el dolor, mantener movilidad de codo, muñeca y columna dorsal, activar la escápula y el manguito sin estrés en la cápsula anterior.\nPost-cirugía: cabestrillo según pauta; rotación externa limitada a 30º.\nCriterios para pasar de fase: dolor ≤3/10, movilidad pasiva progresando sin aprehensión, alta del médico para movilidad activa.\nEvitar: abducción + rotación externa (posición de luxación), apoyos sobre la mano, cargas.',
        sessions: [
          S(1, 'Protección A', [
            B('Movilidad', 'Sin pasar de 30º de rotación externa.', ['Cat-camel|2|10||30 s|Movilidad dorsal', 'Flexión de muñeca|2|15||30 s|', 'Extensión de muñeca|2|15||30 s|']),
            B('Activación', 'Isometrías submáximas (30-50 %) sin dolor.', ['Isométrico rotadores|3|5 × 10 s|30-50 %|45 s|Brazo pegado al cuerpo', 'Aprendizaje retracción escapular|3|10||30 s|', 'Activación trapecio inferior|3|10||30 s|']),
            B('Acondicionamiento', 'Mantener tren inferior y condición.', ['Assault o bici|1|15 min|Moderado|—|Sin apoyar el brazo lesionado', 'Goblet squat|3|10|Carga en el brazo sano o chaleco|90 s|']),
          ]),
          S(4, 'Protección B', [
            B('Activación', '', ['Protracción- retracción|3|10||30 s|', 'Respiración diafragmática|2|8||—|']),
            B('Fuerza', 'Tren inferior y core sin cargar el hombro.', ['Peso muerto a una pierna con mancuerna tocando atrás|3|8|Mancuerna en mano sana|90 s|', 'Dead bug modificado|3|10||45 s|', 'Puente de glúteo|3|12||45 s|']),
          ]),
        ] },
      { name: 'Fase 2 · Movilidad y control (3-6 semanas)', notes: 'Duración: semanas 3/4-6.\nObjetivos: movilidad activa completa progresiva (la RE de forma gradual), control escapular, manguito con banda en rangos medios.\nCriterios para pasar de fase: ROM activo casi completo, RE en 90º de abducción sin aprehensión, sin dolor nocturno.\nEvitar: cargas pesadas y apoyos con impacto.',
        sessions: [
          S(1, 'Movilidad A', [
            B('Movilidad', '', ['Wall slide|3|10||30 s|', 'Movilidad con pica|3|10||30 s|Flexión y rotación externa asistidas', 'Floor Slide|2|10||30 s|']),
            B('Activación', '', ['RE con banda|3|15|Banda suave|45 s|Codo pegado, de 0 a 45º de abducción', 'Rotación externa e interna con goma|3|12||45 s|', 'Serrato anterior|3|12||45 s|']),
          ]),
          S(4, 'Movilidad B', [
            B('Activación', '', ['W - T con banda|3|10||45 s|', 'Band pull apart y W con goma|3|12||45 s|', 'Activación plano escapular|3|10||45 s|']),
            B('Fuerza', '', ['Remo con goma de pie|3|12||60 s|', 'Flexiones inclinadas|3|8|Pared o banco alto|60 s|Sin dolor ni aprehensión']),
          ]),
        ] },
      { name: 'Fase 3 · Fuerza (6-12 semanas)', notes: 'Duración: semanas 6-12.\nObjetivos: fuerza del manguito en 90º de abducción, escápula, cadena cerrada con carga progresiva, empujes y tracciones.\nCriterios para pasar de fase: ROM completo y simétrico, fuerza de RE y RI ≥80 % del lado sano, CKCUEST sin dolor.\nEvitar: press por detrás de la nuca y fondos profundos.',
        sessions: [
          S(1, 'Fuerza A · empuje', [
            B('Activación', '', ['Re 90º abd|3|12|Banda media|45 s|', 'Iso hold ri 90ª abd|3|20 s||45 s|']),
            B('Fuerza', 'RIR 2-3.', ['Flexiones|4|8|RIR 2|90 s|', 'Press landmine posición caballero|3|8|RIR 2|90 s|', 'Press con mancuernas|3|8|RIR 2|90 s|Recorrido sin pasar de la línea del cuerpo']),
            B('Prevención', '', ['Estabilidad gleno-humeral en bosu (3 variantes)|3|20 s||45 s|']),
          ]),
          S(4, 'Fuerza B · tracción', [
            B('Fuerza', '', ['Remo con mancuerna|4|8|RIR 2|90 s|', 'Jalón al pecho|3|10|RIR 2|90 s|', 'Facepull en dos alturas|3|12||60 s|']),
            B('Prevención', '', ['Turkish get up primera parte|3|3|Cada lado|60 s|', 'Bottom up + abd/re|3|8||60 s|']),
            B('Core', '', ['Plancha tocando hombro|3|10||45 s|']),
          ]),
        ] },
      { name: 'Fase 4 · Potencia y específico (3-4 meses)', notes: 'Duración: meses 3-4 (conservador puede ir antes si cumple criterios).\nObjetivos: pliometría de tren superior, rotadores con perturbación y reacción, press por encima de la cabeza, preparación al contacto (caídas, placaje progresivo con escudo).\nCriterios para pasar al RTS: fuerza RE y RI ≥90 % del lado sano, ratio RE:RI ≥66-75 %, CKCUEST simétrico y en valores normales, sin aprehensión en abducción + RE.',
        sessions: [
          S(1, 'Potencia A', [
            B('Potencia', '', ['Pase de pecho|4|6||90 s|', 'Flexiones pliométricas|3|5||2 min|', 'Lanzamientos desde RE|3|8||90 s|']),
            B('Prevención', 'Respuesta rápida a perturbaciones.', ['Re con perturbación|3|20 s||45 s|', 'Lanzamiento con perturbación|3|8||60 s|']),
            B('Fuerza', '', ['Press militar con mancuerna|3|6|RIR 2|2 min|']),
          ]),
          S(4, 'Específico contacto', [
            B('Readaptación', 'Progresión: caída controlada → escudo → placaje lento → placaje real.', ['Flexiones en bosu|3|8||60 s|', 'Bear crawl + tracción o add|3|10 m||60 s|', 'Estabilidad gleno humeral cambio de plano|3|20 s||45 s|']),
            B('Fuerza', '', ['Dominada|4|5|RIR 2|2 min|', 'Flexiones lastradas|3|6|RIR 2|2 min|']),
          ]),
        ] },
      { name: 'Fase 5 · RTS (≥3,5-4 meses tras cirugía)', notes: 'Cuándo: tras estabilización ~3,5-4 meses (media 4,5 en deportistas de contacto); conservador, cuando cumpla criterios: volver en plena temporada sin ellos tiene recidivas muy altas.\nCriterios de alta: ROM completo, fuerza ≥90 % y ratio RE:RI adecuado, CKCUEST normal, sin aprehensión, confianza (SIRSI/WOSI) y placaje completo en entrenamiento sin síntomas.\nMantener 2 sesiones/semana de manguito y escápula toda la temporada.',
        sessions: [
          S(1, 'Valoración RTS', [
            B('Valoración', 'Registra la fuerza de RE/RI de ambos lados en Tests.', ['Rotación externa|3|1|Cada lado|60 s|Dinamómetro si lo tienes', 'Re-ri de hombro|1|1||—|ROM de ambos lados', 'Empuje horizontal|1|1||—|']),
          ]),
          S(4, 'Mantenimiento hombro', [
            B('Prevención', '', ['Re 90º abd|3|12||45 s|', 'Subescapular (lanzamiento con énfasis excéntrico)|3|8||60 s|', 'W - T con banda|2|12||45 s|']),
          ]),
        ] },
    ],
  },
  // ─────────────────────────── CONMOCIÓN ───────────────────────────
  {
    key: 'conmocion', name: 'Conmoción cerebral: retorno gradual al juego', short: 'Conmoción',
    desc: 'Retorno gradual al deporte en 6 etapas (FER / World Rugby / consenso de Ámsterdam). Cada etapa ≥24 h y sin síntomas.',
    refs: [
      'Federación Española de Rugby. Guía de conmoción cerebral (2023): etapas 1-6, mínimos ≥19 años 7+1+1+1+1+1 días (12 días) y <19 años 14+2+2+2+2+2 (24 días); alta médica tras etapa 1, alta deportiva tras etapa 4 y competicional tras etapa 5.',
      'World Rugby. Regulation 10 (conmoción): en rugby comunitario, mínimo 21 días hasta volver a jugar, tras programa de rehabilitación individual, sin síntomas y con autorización de un médico antes del contacto.',
      'Patricios JS, et al. Consensus statement on concussion in sport: the 6th International Conference on Concussion in Sport, Amsterdam 2022. Br J Sports Med. 2023;57:695-711.',
    ],
    phases: [
      { name: 'Etapa 1 · Reposo relativo', notes: 'Duración mínima: 7 días (≥19 años) / 14 días (<19 años) según la guía FER. Los primeros 24-48 h, reposo relativo: actividad diaria y caminar suave, menos pantallas. No reposo absoluto.\nAntes de pasar: sin síntomas en reposo y alta médica (no deportiva).\nSi algún síntoma aparece o empeora: volver a la etapa anterior. Si los síntomas duran >4 semanas, derivar a un equipo especializado.',
        sessions: [
          S(1, 'Actividad diaria', [
            B('Readaptación', 'Caminar suave; parar si los síntomas suben más de 2 puntos (0-10).', ['Andar con metrónomo 60 120 bpm|1|10-15 min|Muy suave|—|Solo si no aumenta síntomas', 'Respiración diafragmática|3|8||—|']),
            B('Neurocognitivo', '', ['Educación. Entendiendo tu dolor|1|1||—|Explicar el proceso y los tiempos']),
          ]),
        ] },
      { name: 'Etapa 2 · Aeróbico ligero', notes: 'Duración mínima: 24 h (≥19) / 48 h (<19).\nActividad: caminar, nadar o bici estática por debajo del 70 % de la FC máxima. Sin fuerza máxima ni potencia.\nPasar si: sin síntomas durante y después.',
        sessions: [
          S(1, 'Aeróbico ligero', [
            B('Acondicionamiento', 'FC <70 % de la máxima.', ['Assault o bici|1|15-20 min|<70 % FC máx|—|']),
            B('Movilidad', '', ['Cat-camel|2|10||—|', 'Movilidad completa dinámica (Flex-OLRD- WORLD BEST STRETCH…)|2|5||—|']),
          ]),
        ] },
      { name: 'Etapa 3 · Ejercicio específico sin impactos', notes: 'Duración mínima: 24 h (≥19) / 48 h (<19).\nActividad: carrera y técnica de carrera, sin riesgo de golpe en la cabeza.\nPasar si: sin síntomas. Antes de la etapa 4 deben haber desaparecido todos los síntomas, también tras esfuerzo.',
        sessions: [
          S(1, 'Carrera y técnica', [
            B('Velocidad', '', ['Técnica de carrera|3|20 m||60 s|', 'Skip lineal|3|20 m||60 s|', 'Trote adelante atrás|4|40 m|60-70 %|90 s|']),
            B('Neurocognitivo', 'Sistema vestibular y fijación visual, sin provocar síntomas.', ['Andar en S fijación visual|3|20 m||45 s|', 'Equilibrio a una pierna + sistema vestibular|3|20 s||30 s|']),
          ]),
        ] },
      { name: 'Etapa 4 · Entrenamiento sin contacto', notes: 'Duración mínima: 24 h (≥19) / 48 h (<19).\nRequisito: sin síntomas ni hallazgos clínicos, también tras esfuerzo.\nActividad: entrenamiento del deporte sin contacto, cambios de dirección, fuerza y potencia progresivas.\nAl terminar: alta deportiva (no competicional).',
        sessions: [
          S(1, 'Sin contacto', [
            B('Cambio de dirección', '', ['Shuffle + cross-over sprint|3|3||90 s|', 'COD 45º|4|3||90 s|']),
            B('Fuerza', 'Fuerza y potencia progresivas.', ['Goblet squat|3|8|RIR 3|90 s|', 'Remo con mancuerna|3|8|RIR 3|90 s|']),
            B('Prevención', 'Fuerza cervical: base para tolerar el contacto.', ['Flexores profundos iso|3|10 s × 5||45 s|', 'Flexión lateral ISO|3|10 s × 5|Cada lado|45 s|', 'Extensores + rotación lateral|3|8||45 s|']),
          ]),
        ] },
      { name: 'Etapa 5 · Contacto completo', notes: 'Duración mínima: 24 h (≥19) / 48 h (<19).\nRequisito: autorización médica antes del contacto.\nActividad: entrenamiento normal con contacto completo.\nAl terminar: alta competicional.',
        sessions: [
          S(1, 'Entrenamiento con contacto', [
            B('Readaptación', 'Entrenamiento normal con el equipo, contacto progresivo.', ['Cutting con carga cognitiva|3|4||2 min|', 'Hops laterales y frontal con carga cognitiva|3|6||90 s|']),
            B('Prevención', '', ['Flexores profundos con banda|3|10||45 s|', 'Flexión lateral + movimiento|3|8||45 s|']),
          ]),
        ] },
      { name: 'Etapa 6 · Vuelta a competir', notes: 'Mínimo total desde la conmoción: 12 días (≥19 años) y 24 días (<19) según la guía FER 2023. World Rugby (Regulación 10) fija en rugby comunitario un mínimo de 21 días: aplica el criterio más exigente que pida tu federación o el médico.\nUna segunda conmoción en menos de 12 meses, conmociones repetidas o síntomas prolongados requieren valoración de un equipo médico especializado.',
        sessions: [
          S(1, 'Mantenimiento cervical', [
            B('Prevención', 'Seguir 2 veces por semana.', ['Flexores profundos iso|3|10 s × 5||45 s|', 'Flexores con banda|3|10||45 s|', 'Extensores + rotación lateral|3|8||45 s|']),
          ]),
        ] },
    ],
  },
  // ─────────────────────────── CODO ───────────────────────────
  {
    key: 'codo', name: 'Readaptación codo: luxación simple / esguince ligamentoso', short: 'Codo',
    desc: 'Luxación simple de codo o esguince de ligamentos colaterales sin fractura. Movilización activa precoz.',
    refs: [
      'Iordens GIT, et al. Early mobilisation versus plaster immobilisation of simple elbow dislocations: results of the FuncSiE multicentre randomised clinical trial. Br J Sports Med. 2017;51:531-8 (movilización precoz: menos discapacidad a las 6 semanas, mejor arco de movimiento y vuelta al trabajo en ~10 frente a ~18 días, sin más recidivas).',
      'Montoro J. El complejo del hombro y cadena del miembro superior. Máster IPTC, Fidias (ejercicios de agarre, codo y estabilidad glenohumeral).',
    ],
    phases: [
      { name: 'Fase 1 · Movilización precoz (0-1 semana)', notes: 'Duración: primera semana (tras descartar fractura e inestabilidad por el médico).\nObjetivos: movilidad activa precoz dentro del dolor, controlar inflamación, agarre.\nCriterios para pasar de fase: dolor ≤3/10 y arco de movimiento que mejora cada día, sin sensación de inestabilidad.\nEvitar: extensión forzada, valgo o varo con carga, apoyos sobre la mano y cargas.',
        sessions: [
          S(1, 'Movilidad precoz', [
            B('Movilidad', 'Activo, sin forzar al final del recorrido.', ['Transición flexo-extensión|3|15||30 s|', 'Flexión de muñeca|2|15||30 s|', 'Extensión de muñeca|2|15||30 s|']),
            B('Activación', '', ['Iso agarre|4|10 s||30 s|Pelota blanda', 'Isométrico rotadores|3|5 × 10 s|30 %|45 s|Hombro']),
            B('Acondicionamiento', '', ['Assault o bici|1|15 min|Moderado|—|Sin apoyar el brazo']),
          ]),
        ] },
      { name: 'Fase 2 · Movilidad completa y fuerza ligera (1-3 semanas)', notes: 'Duración: semanas 1-3.\nObjetivos: arco de movimiento completo (o déficit de extensión <10º), fuerza ligera de flexores, extensores y antebrazo, escápula.\nCriterios para pasar de fase: ROM completo o casi, sin dolor en las actividades diarias, fuerza de agarre ≥70 %.',
        sessions: [
          S(1, 'Movilidad y fuerza A', [
            B('Fuerza', 'Cargas ligeras, sin dolor.', ['Curl bíceps con bandas|3|15||45 s|', 'Tríceps con goma|3|15||45 s|', 'Extensión de muñeca ISOS|3|30 s||45 s|']),
            B('Activación', '', ['Aprendizaje retracción escapular|3|10||30 s|', 'RE con banda|3|15||45 s|']),
          ]),
          S(4, 'Movilidad y fuerza B', [
            B('Fuerza', '', ['Iso flex codo a flex hombro|3|10||45 s|', 'Remo con goma de pie|3|12||60 s|', 'Agarre en dinámico|3|20 s||45 s|']),
          ]),
        ] },
      { name: 'Fase 3 · Fuerza y cadena cerrada (3-6 semanas)', notes: 'Duración: semanas 3-6.\nObjetivos: fuerza progresiva con carga, apoyos en cadena cerrada (de pared a suelo), estabilidad del miembro superior.\nCriterios para pasar de fase: fuerza ≥80-90 % del lado sano, flexiones completas sin dolor, sin inestabilidad.',
        sessions: [
          S(1, 'Fuerza A', [
            B('Fuerza', 'RIR 2-3.', ['Flexiones inclinadas|3|10||60 s|', 'Flexiones de rodillas|3|8||60 s|Cuando las inclinadas no molesten', 'Curl bíceps con mancuernas|3|10|RIR 2|60 s|', 'Press francés con mancuerna|3|10|RIR 2|60 s|']),
            B('Prevención', '', ['Estabilidad gleno-humeral en bosu (3 variantes)|3|20 s||45 s|', 'Bottom up + abd/re|3|8||60 s|']),
          ]),
          S(4, 'Fuerza B', [
            B('Fuerza', '', ['Remo con mancuerna|3|10|RIR 2|90 s|', 'Press landmine posición caballero|3|8|RIR 2|90 s|', 'Farmer en 3 posiciones|3|20 m||60 s|']),
          ]),
        ] },
      { name: 'Fase 4 · Potencia y RTS (6+ semanas)', notes: 'Cuándo: orientativo desde la semana 6, según estabilidad y alta médica.\nObjetivos: potencia, caídas y apoyos con impacto, placaje progresivo.\nCriterios de alta: ROM completo (déficit de extensión <5º), fuerza ≥90 %, CKCUEST sin dolor, sin inestabilidad ni aprehensión al apoyar y placar. Valorar protección (vendaje) las primeras semanas.',
        sessions: [
          S(1, 'Potencia y contacto', [
            B('Potencia', '', ['Pase de pecho|4|6||90 s|', 'Flexiones pliométricas|3|5||2 min|']),
            B('Readaptación', 'Progresión de apoyos y contacto.', ['Bear crawl + tracción o add|3|10 m||60 s|', 'Flexiones en bosu|3|8||60 s|']),
            B('Fuerza', '', ['Dominada|3|5|RIR 2|2 min|', 'Flexiones lastradas|3|6|RIR 2|2 min|']),
          ]),
        ] },
    ],
  },
  // ─────────────────────────── TOBILLO ───────────────────────────
  {
    key: 'tobillo', name: 'Readaptación esguince lateral de tobillo', short: 'Tobillo',
    desc: 'Esguince lateral agudo. Carga precoz con soporte funcional y ejercicio; programa neuromuscular para no recaer.',
    refs: [
      'Vuurberg G, et al. Diagnosis, treatment and prevention of ankle sprains: update of an evidence-based clinical guideline. Br J Sports Med. 2018;52:956 (inmovilización solo si es grave y ≤10 días; soporte funcional; ejercicio; prevención de recidivas con entrenamiento neuromuscular y ortesis).',
      'Caño M. Lesiones del miembro inferior, tobillo y pie: esguince de tobillo, reglas de Ottawa, criterios y tests de RTP. Máster IPTC, Fidias (bloque 4).',
      'Delahunt E, et al. Clinical assessment of acute lateral ankle sprain injuries (ROAST): 2019 consensus statement. Br J Sports Med. 2018;52:1304-10.',
    ],
    phases: [
      { name: 'Fase 1 · Aguda (0-7 días)', notes: 'Duración: primera semana. Si hay dolor óseo en maléolos, base del 5º metatarsiano o escafoides, o no puede dar 4 pasos: radiografía (reglas de Ottawa).\nObjetivos: proteger con soporte funcional (ortesis o vendaje), carga precoz según tolerancia, controlar el edema, recuperar dorsiflexión.\nCriterios para pasar de fase: marcha sin cojera o casi, dorsiflexión mejorando, dolor ≤3/10.\nEvitar: inversión forzada y saltos.',
        sessions: [
          S(1, 'Aguda', [
            B('Movilidad', '', ['Flexion dorsal con mb|3|12||30 s|', 'Movilidad dedos del pie junto a dorsiflexión|2|10||30 s|']),
            B('Activación', 'Isometrías sin dolor.', ['Iso push flexión plantar bi|3|30 s||45 s|', 'Peroneos|3|10 s × 5|Isométrico|45 s|Eversión contra la mano o la pared', 'Foot core|3|10||30 s|']),
            B('Acondicionamiento', '', ['Assault o bici|1|15 min|Moderado|—|Con el soporte puesto']),
          ]),
        ] },
      { name: 'Fase 2 · Movilidad y fuerza (1-3 semanas)', notes: 'Duración: semanas 1-3.\nObjetivos: dorsiflexión simétrica, fuerza de flexores plantares, peroneos y tibiales, equilibrio monopodal.\nCriterios para pasar de fase: lunge test con diferencia <2 cm, 20+ elevaciones de talón a una pierna sin dolor, equilibrio monopodal 30 s estable.',
        sessions: [
          S(1, 'Fuerza A', [
            B('Movilidad', '', ['Dorsiflexión con banda|3|10||30 s|', 'Squat movilidad tobillo|2|10||30 s|']),
            B('Fuerza', '', ['Tríceps sural gemelo a una pierna en step|3|12||60 s|', 'Sóleo con carga|3|12|RIR 3|60 s|', 'Peroneos|3|15|Banda|45 s|', 'Tibial posterior|3|15|Banda|45 s|']),
            B('Prevención', '', ['Equilibrio monopodal. 3 dificultades|3|30 s||30 s|']),
          ]),
          S(4, 'Fuerza B', [
            B('Fuerza', '', ['Iso push flexión plantar unilat|4|30 s||45 s|', 'Excéntrico gemelos|3|10|3 s bajando|60 s|', 'Goblet squat|3|10|RIR 3|90 s|']),
            B('Prevención', '', ['Estabilidad monopodal|3|30 s||30 s|', 'Y test|2|3|Cada dirección|30 s|']),
          ]),
        ] },
      { name: 'Fase 3 · Control dinámico y saltos (3-6 semanas)', notes: 'Duración: semanas 3-6 (grado I puede llegar antes).\nObjetivos: propiocepción dinámica, saltos de bilateral a unilateral, carrera y cambios de dirección suaves.\nCriterios para pasar de fase: Y-balance anterior con diferencia <4 cm, hops sin dolor, carrera sin cojera.',
        sessions: [
          S(1, 'Dinámico A', [
            B('Pliometría', '', ['Saltos de tobillo|3|15||60 s|', 'Salto a la comba alterno de pies|3|30 s||60 s|', 'Hop lateral|3|8|Cada pierna|90 s|']),
            B('Prevención', '', ['Y test|3|3||30 s|', 'Estabilidad control multiplano|3|20 s||30 s|']),
          ]),
          S(4, 'Dinámico B', [
            B('Velocidad', '', ['Técnica de carrera|3|20 m||60 s|', 'Trote adelante atrás|4|40 m|70 %|90 s|']),
            B('Cambio de dirección', '', ['Shuffle (hold)|3|3||60 s|', 'Desplazamiento lateral shuffle|3|10 m||60 s|']),
            B('Fuerza', '', ['Tríceps sural gemelo a una pierna en step|3|15|Con carga|60 s|']),
          ]),
        ] },
      { name: 'Fase 4 · RTS y prevención', notes: 'Cuándo (orientativo): grado I 1-2 semanas, grado II 3-6, grado III 6-12. Progresa por criterios.\nCriterios de alta: dorsiflexión simétrica, fuerza de flexores plantares ≥90 %, Y-balance <4 cm de diferencia, hop tests ≥90 %, cortes y sprint sin dolor ni miedo.\nPrevención: seguir el programa neuromuscular 2-3 veces por semana y usar ortesis o vendaje en la vuelta (reduce las recidivas).',
        sessions: [
          S(1, 'RTS', [
            B('Cambio de dirección', '', ['Cross over|3|4||90 s|', 'COD 45º|4|3||90 s|', 'Cutting con carga cognitiva|4|3||2 min|']),
            B('Pliometría', '', ['Hops extensivos en Z|3|6||90 s|', 'Bound lateral|3|5||90 s|']),
            B('Valoración', 'Registra en Tests.', ['Lunge test|1|1|Cada lado|—|', 'Y test|1|3|Cada lado|—|', 'Tripe hop lateral test|2|1|Cada pierna|90 s|']),
          ]),
        ] },
    ],
  },
  // ─────────────────────────── CADERA / INGLE ───────────────────────────
  {
    key: 'cadera', name: 'Readaptación cadera e ingle (aductores)', short: 'Cadera/ingle',
    desc: 'Dolor inguinal relacionado con los aductores o lesión aguda de aductores (clasificación de Doha). Fuerza progresiva de aductores y core.',
    refs: [
      'Weir A, et al. Doha agreement meeting on terminology and definitions in groin pain in athletes. Br J Sports Med. 2015;49:768-74.',
      'Hölmich P, et al. Effectiveness of active physical training as treatment for long-standing adductor-related groin pain in athletes: randomised trial. Lancet. 1999;353:439-43 (programa de 8-12 semanas).',
      'Harøy J, et al. The Adductor Strengthening Programme prevents groin problems among male football players. Br J Sports Med. 2019;53:150-7 (Copenhague).',
      'Criterios de progresión por fases (squeeze test <3/10, plancha y Copenhague por tiempo): Physiotutors, Groin pain & adductor injuries (resumen de evidencia).',
    ],
    phases: [
      { name: 'Fase 1 · Calmar y cargar (0-2 semanas)', notes: 'Duración orientativa: 1-2 semanas (aguda leve) o más en dolor de larga evolución.\nObjetivos: educación, gestión de la carga, isometrías de aductores sin dolor, core bajo, mantener condición con bici o piscina.\nCriterios para pasar de fase: dormir, caminar y estar sentado 30 min sin dolor; plancha 30 s; squeeze test a 0º y 45º con dolor <3/10.\nEvitar: estiramientos agresivos de aductores, golpeos y cambios de dirección.',
        sessions: [
          S(1, 'Fase 1 A', [
            B('Activación', 'Isometría submáxima, dolor ≤3/10.', ['Isométrico aductores|5|30 s|50-70 %|45 s|Balón entre rodillas', 'Squat iso + aductores|3|30 s||45 s|']),
            B('Core', '', ['Dead bug|3|10||45 s|', 'Plancha|3|30 s||45 s|']),
            B('Acondicionamiento', '', ['Assault o bici|1|20 min|Moderado|—|']),
          ]),
          S(4, 'Fase 1 B', [
            B('Activación', '', ['Puente glúteo + act. Aductores (Menor TFL)|3|12||45 s|', 'Clamshell|2|15||30 s|']),
            B('Movilidad', '', ['90/90|2|8||30 s|', 'Rotación interna de cadera|2|10||30 s|']),
            B('Core', '', ['Bird-dog|3|10||45 s|', 'Pallof posic. Caballero|3|10||45 s|']),
          ]),
        ] },
      { name: 'Fase 2 · Fuerza (2-6 semanas)', notes: 'Duración orientativa: semanas 2-6.\nObjetivos: fuerza de aductores en rango largo (Copenhague), cadena cinética, glúteo y core lateral.\nCriterios para pasar de fase: actividades diarias y 30 min de cardio sin dolor; plancha 60 s; plancha lateral 30 s por lado; Copenhague 30 s por lado; todo con dolor <3/10.',
        sessions: [
          S(1, 'Fuerza A', [
            B('Fuerza', 'Progresión Copenhague: rodilla apoyada → pierna estirada → con movimiento.', ['Copenhague. Dos variantes|3|20-30 s|Cada lado|60 s|', 'Zancada lateral aprendizaje goblet sq|3|8|Cada lado|60 s|', 'Peso muerto sumo KB|3|10|RIR 2|90 s|']),
            B('Core', '', ['Plancha lateral|3|30 s||45 s|', 'Pallof de pie|3|10||45 s|']),
          ]),
          S(4, 'Fuerza B', [
            B('Fuerza', '', ['Sentadilla lateral landmine|3|8|RIR 2|90 s|', 'Puente unilateral|3|10||60 s|', 'Curl Nórdico fase excéntrica asistida|3|5||2 min|']),
            B('Prevención', '', ['Monster Walk direccional|3|10 m||30 s|', 'Estabilidad monopodal|3|30 s||30 s|']),
          ]),
        ] },
      { name: 'Fase 3 · Potencia y vuelta a correr (6-10 semanas)', notes: 'Duración orientativa: semanas 6-10.\nObjetivos: potencia y pliometría lateral, sprint, cambios de dirección y golpeo o pase progresivo.\nCriterios para pasar al RTS: squeeze test sin dolor, fuerza de aductores ≥90 % del lado sano, sprint y cambios de dirección sin dolor.',
        sessions: [
          S(1, 'Potencia A', [
            B('Fuerza', '', ['Zancada lateral con sobrecarga excéntrica|3|6|Cada lado|90 s|', 'Copenhague|3|30 s|Con movimiento|60 s|']),
            B('Pliometría', '', ['Skater jump|3|6||90 s|', 'Bound lateral|3|5||90 s|']),
            B('Velocidad', '', ['Técnica de carrera|3|20 m||60 s|', 'Aceleración|4|20 m|80-90 %|2 min|']),
          ]),
          S(4, 'Potencia B', [
            B('Cambio de dirección', '', ['Shuffle (hold)|3|3||60 s|', 'Cross over|3|4||90 s|', 'COD 45º|3|3||90 s|']),
            B('Core', '', ['Lanzamiento rotacional posic. De pie|3|6|Cada lado|60 s|']),
          ]),
        ] },
      { name: 'Fase 4 · RTS', notes: 'Cuándo: lesiones agudas leves-moderadas, orientativo 4-8 semanas; dolor de larga evolución, el programa de Hölmich dura 8-12 semanas.\nCriterios de alta: squeeze test sin dolor, fuerza de aductores ≥90 %, sprint, cambios de dirección, golpeo y contacto sin dolor el día siguiente.\nPrevención: Copenhague 1-2 veces por semana toda la temporada.',
        sessions: [
          S(1, 'RTS', [
            B('Cambio de dirección', '', ['Cutting con carga cognitiva|4|3||2 min|', 'Sprint + cutting|4|2||2 min|']),
            B('Prevención', '', ['Copenhague|3|30 s||60 s|', 'Zancada lateral atacando suelo|3|6||60 s|']),
          ]),
        ] },
    ],
  },
  // ─────────────────────────── ESPALDA ───────────────────────────
  {
    key: 'espalda', name: 'Readaptación lumbalgia del deportista', short: 'Espalda',
    desc: 'Dolor lumbar inespecífico en deportistas. Educación, mantenerse activo y ejercicio progresivo hasta tolerar carga y contacto.',
    refs: [
      'Thornton JS, et al. Treating low back pain in athletes: a systematic review with meta-analysis. Br J Sports Med. 2021;55:656-62 (el ejercicio reduce dolor y mejora función; evidencia escasa; seguir las guías de población general).',
      'NICE NG59. Low back pain and sciatica in over 16s: assessment and management (2016, actualizada 2020): ejercicio y educación; no reposo.',
      'Foster NE, et al. Prevention and treatment of low back pain: evidence, challenges, and promising directions. Lancet. 2018;391:2368-83.',
      'Moseley GL / Bloque 2 IPTC, Fidias: neurociencia del dolor y educación.',
    ],
    phases: [
      { name: 'Fase 1 · Calmar y moverse (0-1/2 semanas)', notes: 'Antes de empezar: descartar señales de alarma (pérdida de fuerza o sensibilidad, alteración de esfínteres, fiebre, dolor nocturno que no cede, traumatismo) y, en jóvenes con dolor al extender, espondilólisis. Si las hay: derivar.\nObjetivos: entender el dolor, mantenerse activo (nada de reposo en cama), movilidad y control sin miedo.\nCriterios para pasar de fase: dolor ≤3/10 en el día a día, se mueve con confianza.',
        sessions: [
          S(1, 'Calmar A', [
            B('Neurocognitivo', 'Mensaje clave: dolor no es igual a daño; moverse ayuda.', ['Educación. Entendiendo tu dolor|1|1||—|', '¿Sentir molestias en trapecio o lumbar debe preocuparme mucho?|1|1||—|']),
            B('Movilidad', '', ['Respiración diafragmática|3|8||—|', 'Cat-camel|2|10||30 s|', 'Rotación torácica 4pedia|2|8||30 s|']),
            B('Acondicionamiento', '', ['Assault o bici|1|15-20 min|Moderado|—|O caminar']),
          ]),
          S(4, 'Calmar B', [
            B('Core', 'Control sin dolor.', ['Dead bug|3|10||45 s|', 'Bird-dog|3|10||45 s|', 'Puente de glúteo|3|12||45 s|']),
            B('Movilidad', '', ['Bisagra de cadera|3|10||30 s|Aprender a flexionar desde la cadera']),
          ]),
        ] },
      { name: 'Fase 2 · Control y fuerza (1-4 semanas)', notes: 'Duración orientativa: semanas 1-4.\nObjetivos: fuerza de tronco en todos los planos (anti-extensión, anti-rotación, anti-inclinación), bisagra y sentadilla con carga ligera.\nCriterios para pasar de fase: dolor ≤3/10 durante y a las 24 h, plancha 60 s, plancha lateral 45 s.',
        sessions: [
          S(1, 'Control A', [
            B('Core', '', ['Plancha|3|45 s||45 s|', 'Pallof de pie|3|10||45 s|', 'Plancha lateral|3|30 s||45 s|']),
            B('Fuerza', 'RIR 3.', ['Peso muerto con KB regresión|3|10|RIR 3|90 s|', 'Goblet squat|3|10|RIR 3|90 s|']),
          ]),
          S(4, 'Control B', [
            B('Core', '', ['Farmer en 3 posiciones|3|20 m||60 s|', 'Bear crawl dos posciones|3|10 m||45 s|']),
            B('Fuerza', '', ['Puente unilateral|3|10||60 s|', 'Remo con mancuerna|3|10|RIR 3|60 s|', 'Extensiones lumbares en suelo|3|10||45 s|']),
          ]),
        ] },
      { name: 'Fase 3 · Fuerza con carga y potencia (4-8 semanas)', notes: 'Duración orientativa: semanas 4-8.\nObjetivos: tolerar carga axial (peso muerto, sentadilla), potencia (swing, lanzamientos rotacionales) y carrera.\nCriterios para pasar al RTS: cargas de antes de la lesión sin dolor, carrera y lanzamientos sin dolor a las 24 h.',
        sessions: [
          S(1, 'Fuerza A', [
            B('Fuerza', 'RIR 2.', ['Peso muerto hexagonal|4|6|RIR 2|2 min|', 'Front squat|3|6|RIR 2|2 min|']),
            B('Potencia', '', ['KB Swing|3|12||90 s|', 'Lanzamiento rotacional posic. De pie|3|6|Cada lado|60 s|']),
          ]),
          S(4, 'Fuerza B', [
            B('Core', '', ['Rueda abdominal|3|8||60 s|', 'Leñador|3|10|Cada lado|45 s|', 'Levantamiento turco|2|3|Cada lado|60 s|']),
            B('Velocidad', '', ['Técnica de carrera|3|20 m||60 s|', 'Aceleración|4|20 m|80 %|2 min|']),
          ]),
        ] },
      { name: 'Fase 4 · RTS: contacto y scrum', notes: 'Objetivos: exposición progresiva a contacto, placaje, ruck y melé (si es delantero).\nCriterios de alta: entrenamiento completo con contacto sin aumento de dolor a las 24 h y confianza para volver.\nMantener 2 sesiones/semana de fuerza de tronco y cadera.',
        sessions: [
          S(1, 'RTS', [
            B('Fuerza', '', ['Peso muerto|4|5|RIR 2|3 min|', 'Push pull (3 posiciones)|3|8||60 s|']),
            B('Potencia', '', ['Patrón rotacional con cadera, explosivo|3|6||60 s|', 'Lanzamiento al suelo posic.de pie + giro de cadera|3|6||60 s|']),
            B('Core', '', ['Bear crawl + tracción o add|3|10 m||60 s|']),
          ]),
        ] },
    ],
  },
];

// Convierte un protocolo en el modelo de programa de la app (con ids nuevos)
export function protocolToProgram(p, uidFn) {
  const id = uidFn;
  return {
    phases: p.phases.map((ph) => ({
      id: id(), name: ph.name, notes: ph.notes,
      weeks: [{ id: id(), name: 'semana modelo', sessions: ph.sessions.map((s) => ({
        id: id(), day: s.day, name: s.name,
        packs: s.packs.map((b) => ({ id: id(), type: b.type, rounds: b.rounds || '', notes: b.notes || '', items: b.items.map((t) => {
          const [exercise, sets = '', reps = '', load = '', rest = '', notes = ''] = t.split('|');
          return { id: id(), exercise, sets, reps, load, rest: rest === '—' ? '' : rest, notes };
        }) })),
      })) }],
    })),
    refs: p.refs,
  };
}
