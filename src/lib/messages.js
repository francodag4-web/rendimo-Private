// Mensajes de WhatsApp con varias versiones por situación, para que no suenen a plantilla.
// Estilo cercano: sin signos de apertura (¿ ¡), con tildes y sin emojis (WhatsApp los pierde al abrir el enlace).
// Huecos: {nombre} {coach} {web} {email} {mes} {importe} {plan} {meses} {marca} {dolor}

export const MESSAGES = {
  invitar: {
    label: 'Enviar acceso a la app',
    list: [
      'Buenas {nombre}! Ya tienes tu acceso a {coach}. Entra en {web} con este correo: {email}. Te llega un enlace al mail y listo, ahí vas a ver tus entrenos de cada día y el check-in. Cualquier cosa me dices',
      'Hola {nombre}, todo listo para empezar. Entra en {web} con {email} y te llegará un enlace para acceder. Te recomiendo añadirla a la pantalla de inicio del móvil, así la tienes como una app más',
      '{nombre}, ya tienes tu alta hecha! Abre {web}, pon tu correo ({email}) y pulsa el enlace que te llega. Lo primero que vas a ver es el check-in: son 20 segundos y me ayudan un montón a ajustarte las sesiones',
      'Qué tal {nombre}? Te paso el acceso a la app: {web} con tu correo {email}. Échale un ojo cuando puedas y si algo no te cuadra me escribes y lo vemos',
      'Hola {nombre}! Te doy la bienvenida a {coach}. Tu acceso: {web} con el correo {email}. A partir de ahora todo el plan, los vídeos y tu progreso los tienes ahí. Vamos a por ello',
    ],
  },
  checkin: {
    label: 'Recordar el check-in',
    list: [
      'Hola {nombre}, llevo unos días sin ver tu check-in. Todo bien? Son 20 segundos y con eso te ajusto la carga de la semana',
      'Buenas {nombre}! Te echo de menos en el check-in jaja. Cuando puedas lo rellenas, que me sirve para saber cómo llegas a cada sesión',
      '{nombre}, qué tal vas? No me ha llegado tu check-in estos días. Si vas con lío lo entiendo, pero intenta hacerlo antes de entrenar aunque sea rápido',
      'Hola {nombre}, cómo andas? Acuérdate del check-in de hoy, que sin esos datos voy un poco a ciegas con tu planificación',
      'Ey {nombre}, todo en orden? Hace unos días que no haces el check-in. Si ha pasado algo o necesitas cambiar algo del plan, cuéntame sin problema',
    ],
  },
  bienestar: {
    label: 'Bienestar bajo',
    list: [
      'Hola {nombre}, he visto que hoy marcaste el bienestar bastante bajo. Cómo estás? Si quieres hoy bajamos un poco la sesión y no pasa nada',
      '{nombre}, qué tal? Tu check-in de hoy viene flojito. Es cansancio, sueño, estrés...? Cuéntame y lo ajustamos',
      'Buenas {nombre}, te noto con menos energía estos días por el check-in. Todo bien fuera del entreno? Prefiero adaptar el plan antes que te pases',
      'Hola {nombre}, hoy te veo con el ánimo y la energía bajos en el check-in. Escúchate: si no estás para la sesión completa, haz solo la parte principal y me cuentas',
      'Ey {nombre}, el bienestar de hoy está bajo. No te preocupes, son rachas. Duerme bien esta noche y mañana vemos cómo amaneces',
    ],
  },
  dolor: {
    label: 'Dolor o molestia',
    list: [
      'Hola {nombre}, vi que marcaste dolor {dolor}. Dónde lo notas exactamente y desde cuándo? Antes de entrenar lo hablamos y ajusto la sesión',
      '{nombre}, me ha saltado que tienes molestias ({dolor}). Cómo lo notas hoy? Mejor que me cuentes y cambiamos lo que haga falta, que no quiero que vaya a más',
      'Buenas {nombre}, qué tal esa molestia? Si te duele al hacer algún ejercicio concreto dime cuál y te paso una alternativa',
      'Hola {nombre}, he visto el dolor que marcaste. Te pasó en algún gesto concreto, en el partido o entrenando? Cuéntame un poco y vemos cómo seguir',
      'Ey {nombre}, ojo con ese dolor {dolor}. Hoy no fuerces: si molesta en algo, lo quitamos. Me escribes y lo valoramos juntos',
    ],
  },
  carga: {
    label: 'Subida de carga',
    list: [
      'Hola {nombre}, la semana pasada subiste bastante la carga entre club y entrenos. Cómo te notas? Si notas las piernas cargadas, esta semana lo regulamos',
      '{nombre}, qué tal las piernas? Vi que la carga de la semana pasada fue alta. Esta semana voy a cuidar un poco el volumen, pero dime cómo lo sientes',
      'Buenas {nombre}! Semana pasada muy cargada. Prioriza dormir bien y comer bien estos días, y si notas fatiga me avisas',
      'Hola {nombre}, la carga subió bastante respecto a la anterior. Nada grave, pero quiero saber cómo vas antes de meter más intensidad',
      'Ey {nombre}, menuda semana la pasada. Cómo has recuperado? Dímelo con sinceridad y ajusto lo que toca',
    ],
  },
  revision: {
    label: 'Revisión',
    list: [
      'Hola {nombre}, toca revisión! Cómo han ido estas semanas? Cuéntame sensaciones, cargas y si ha habido alguna molestia, y con eso te ajusto el plan',
      'Buenas {nombre}, vamos con la revisión. Qué tal te has sentido con el plan? Hay algo que te cueste más o que quieras cambiar?',
      '{nombre}, ya toca revisar cómo vamos. Me cuentas qué tal los entrenos, el club y el descanso? Así preparo el siguiente bloque',
      'Hola {nombre}! Revisión de estas semanas. Lo más importante: cómo te notas en el campo? Más rápido, más fuerte, más fresco? Cuéntame',
      'Qué tal {nombre}? Te escribo para la revisión. Si te viene mejor, hacemos una llamada corta de 10 minutos y lo vemos todo. Dime cuándo te va bien',
    ],
  },
  marca: {
    label: 'Felicitar una marca',
    list: [
      'Enhorabuena {nombre}! Nueva marca: {marca}. El trabajo se está notando, a seguir así',
      'Pedazo de marca {nombre}! {marca}. Esto es lo que pasa cuando eres constante',
      '{nombre}, vaya mejora! {marca}. Guárdate este dato que el próximo test lo volvemos a superar',
      'Muy bien {nombre}! {marca}, tu mejor registro hasta ahora. Se nota que estás cumpliendo con el plan',
      'Hola {nombre}, tenía que escribirte: {marca}. Así da gusto trabajar. Seguimos!',
    ],
  },
  pago: {
    label: 'Recordar pago',
    list: [
      'Hola {nombre}, te recuerdo el pago de {mes} ({importe}). Cuando lo hagas me avisas y lo marco. Gracias!',
      'Buenas {nombre}, para cuando puedas: queda pendiente {mes} ({importe}). Cualquier cosa me dices',
      '{nombre}, qué tal? Te escribo solo para recordarte la cuota de {mes}, {importe}. Sin prisa, pero que no se nos pase',
      'Hola {nombre}, todavía no me figura el pago de {mes} ({importe}). Si ya lo hiciste, pásame el justificante y lo reviso',
      'Ey {nombre}, un recordatorio rápido de la cuota de {mes} ({importe}). Si te viene mal este mes, háblame y lo vemos',
    ],
  },
  renov: {
    label: 'Fin del compromiso',
    list: [
      'Hola {nombre}, en unos días se cumplen los {meses} meses de compromiso. Cómo lo has vivido? Me gustaría que hablemos de cómo seguir y de tus próximos objetivos',
      '{nombre}, ya casi {meses} meses trabajando juntos! Quieres que hagamos una revisión completa con tests para ver todo lo que has mejorado y plantear lo siguiente?',
      'Buenas {nombre}, se acerca el final del compromiso. A partir de ahora sigues mes a mes si quieres. Te cuento lo que tengo pensado para el próximo bloque?',
      'Hola {nombre}! Estamos cerrando estos {meses} meses. Qué objetivo te pondrías para la siguiente etapa? Lo hablamos y te preparo el plan',
      'Qué tal {nombre}? Te escribo porque terminamos el compromiso de {meses} meses. Si quieres seguir, genial; si prefieres otro plan, también lo vemos. Dime qué te apetece',
    ],
  },
  sesiones: {
    label: 'Sin registrar sesiones',
    list: [
      'Hola {nombre}, llevo unos días sin ver sesiones registradas. Estás pudiendo entrenar? Si el horario no te cuadra, lo reorganizamos',
      '{nombre}, qué tal? No me aparecen tus últimas sesiones. Si las has hecho, acuérdate de marcar el RPE al terminar, que así controlo la carga',
      'Buenas {nombre}, cómo va la semana? Te veo con pocas sesiones. Si necesitas una versión más corta del entreno, te la preparo',
      'Hola {nombre}, todo bien? Hace unos días que no registras nada. Sin agobios, pero cuéntame cómo estás para adaptar el plan',
      'Ey {nombre}, te echo en falta en la app jaja. Si estás con lío de trabajo o estudios dímelo y buscamos la manera de que encaje',
    ],
  },
  partido: {
    label: 'Después del partido',
    list: [
      'Hola {nombre}, qué tal el partido? Acuérdate de apuntar el RPE y los minutos en la app, y cuéntame si has terminado con algún golpe',
      '{nombre}! Cómo fue ayer? Si acabaste con las piernas cargadas, hoy toca recuperar: movilidad suave, buena hidratación y a dormir pronto',
      'Buenas {nombre}, qué tal se dio el partido? Me interesa saber cómo te sentiste físicamente en la segunda parte',
      'Hola {nombre}, espero que bien el partido. Algún golpe o molestia? Si es así me lo dices y ajusto la semana',
      'Qué tal {nombre}? Cuéntame del partido y de cómo has amanecido hoy. Con eso decido la carga de los próximos días',
    ],
  },
  solicitud: {
    label: 'Responder una solicitud',
    list: [
      'Hola {nombre}, soy {coach}. He visto tu solicitud{plan}, gracias por escribir! Te viene bien una videollamada de 15 minutos para conocerte y ver tu caso?',
      'Buenas {nombre}! Te escribe {coach}. Me ha llegado tu solicitud{plan}. Para preparártelo bien, me gustaría hablar 15 minutos contigo por videollamada. Qué día te va mejor?',
      '{nombre}, qué tal? Soy {coach}, gracias por interesarte{plan}. Antes de nada, quiero conocer tu situación: posición, calendario del club y lesiones. Hacemos una llamada corta esta semana?',
      'Hola {nombre}! Recibí tu solicitud{plan}. Te cuento cómo trabajo en una videollamada de 15 minutos y vemos si encaja contigo. Dime un par de horarios que te vengan bien',
      'Buenas {nombre}, soy {coach}. Gracias por tu solicitud! Lo primero es una valoración rápida para ver de dónde partimos. Te va bien hablar mañana o pasado?',
    ],
  },
  solicitud_seguimiento: {
    label: 'Solicitud sin respuesta',
    list: [
      'Hola {nombre}, te escribí hace unos días por tu solicitud. Te sigue interesando? Sin compromiso, si quieres lo hablamos cuando te venga bien',
      'Buenas {nombre}! Te recuerdo lo de la videollamada. Si ahora no es buen momento, no pasa nada, me avisas y lo dejamos para más adelante',
      '{nombre}, qué tal? No sé si te llegó mi mensaje. Si te surgen dudas sobre los planes o los precios, pregúntame lo que quieras',
      'Hola {nombre}, sigo teniendo un hueco para ti esta semana. Te apetece que lo hablemos?',
      'Ey {nombre}, por si se te pasó: estoy disponible para la videollamada cuando quieras. Solo dime día y hora',
    ],
  },
  libre: { label: 'Mensaje libre', list: ['Hola {nombre}, '] },
};

// Rellena los huecos; si falta un dato, quita la frase sobrante de forma limpia
export function fill(text, vars) {
  return text.replace(/\{(\w+)\}/g, (_, k) => (vars[k] != null && vars[k] !== '' ? vars[k] : '')).replace(/ \(\)/g, '').replace(/\s{2,}/g, ' ').replace(/ ([.,:!?])/g, '$1').trim();
}

// Versión según el jugador y el día: cambia de un mensaje a otro sin repetir siempre el mismo
export function pick(kind, seed = '', offset = 0) {
  const list = (MESSAGES[kind] || MESSAGES.libre).list;
  let h = 0; const s = `${seed}|${new Date().toISOString().slice(0, 10)}`;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return list[(h + offset) % list.length];
}
export const variants = (kind) => (MESSAGES[kind] || MESSAGES.libre).list.length;
