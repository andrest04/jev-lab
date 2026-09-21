// Spanish dictionary (neutral, professional register). Must mirror en.mjs: same keys,
// same {placeholders}. Glossary terms (Jev, noul, choice, score, ...) stay in English.

/** @type {Record<string, string>} */
export default {
  // App shell
  "nav.aria": "Principal",
  "nav.examples": "Ejemplos",
  "nav.playground": "Playground",
  "nav.learn": "Aprender",
  "pill.live": "Live · Jev",
  "pill.live.title": "Las solicitudes van a api.typesafe.ai a través de este servidor.",
  "pill.demo": "Modo demo · sin key",
  "pill.demo.title":
    "No se encontró TYPESAFE_API_KEY. Los ejemplos reproducen samples escritos a mano; el Playground usa una heurística de palabras clave, no Jev.",
  "theme.dark": "Oscuro",
  "theme.light": "Claro",
  "theme.switchToDark": "Cambiar al tema oscuro",
  "theme.switchToLight": "Cambiar al tema claro",
  "lang.label": "Idioma",
  // Document
  "title.home": "Jev Lab",
  "title.playground": "Playground · Jev Lab",
  "title.learn": "Aprender · Jev Lab",
  "title.example": "{title} · Jev Lab",
  "meta.description": "Un laboratorio local para aprender y probar el modelo Jev de TypeSafe.",

  // Home
  "home.hero.title": "Juicios sobre los que puedes ramificar tu lógica",
  "home.hero.lede":
    "Jev lee texto o JSON y responde questions tipadas con probabilities. No hay prosa que parsear y tu código mantiene el control. Aprende ejecutándolo.",
  "home.hero.ctaTicketDesk": "Prueba el ticket desk",
  "home.hero.ctaPlayground": "Abre el Playground",
  "home.answerTypes.aria": "Los tres tipos de respuesta",
  "home.answerTypes.note":
    "Noul, Choice y Score, dibujados a partir de una respuesta sample escrita a mano para mostrar su forma. No es salida del modelo.",
  "home.examples.title": "Ejemplos resueltos",
  "home.examples.note.live": "Live: las ejecuciones llaman a Jev",
  "home.examples.note.demo": "Sin API key: los presets reproducen samples escritos a mano",
  "home.steps.read.title": "Lee las questions",
  "home.steps.read.text": "Cada ejemplo muestra las questions tipadas exactas y la solicitud JSON que producen.",
  "home.steps.run.title": "Ejecútalo",
  "home.steps.run.text.live":
    "Las ejecuciones llegan a Jev a través de este servidor. La key nunca llega al navegador.",
  "home.steps.run.text.demo":
    "Sin key, los presets reproducen samples claramente etiquetados. Define TYPESAFE_API_KEY para ejecutar Jev con cualquier entrada.",
  "home.steps.policy.title": "Cambia la policy",
  "home.steps.policy.text":
    "Los thresholds y weights viven en el código. Mueve los deslizadores y la decisión se actualiza sin otra llamada al modelo.",

  // Learn
  "learn.eyebrow": "Aprender",
  "learn.title": "Cómo funciona Jev",
  "learn.lede":
    "Jev es el primer modelo System One de TypeSafe. Lee un state y responde questions tipadas con probabilities. No escribe prosa, así que no hay nada que parsear.",
  "learn.loop.title": "El ciclo",
  "learn.loop.send.title": "Tú envías",
  "learn.loop.send.text": "Un state (texto o JSON) y un mapa de questions tipadas.",
  "learn.loop.returns.title": "Jev devuelve",
  "learn.loop.returns.text":
    "Una respuesta tipada por cada question: probabilities y, para choices y scores, también confidence.",
  "learn.loop.decide.title": "El código decide",
  "learn.loop.decide.text": "Los thresholds, weights, el routing y los efectos secundarios se quedan en código común.",
  "learn.primitives.title": "Tres primitivas",
  "learn.primitives.col.name": "Primitiva",
  "learn.primitives.col.use": "Úsala para",
  "learn.primitives.col.returns": "Devuelve",
  "learn.primitives.col.watch": "Cuidado con",
  "learn.primitives.noul.use":
    "Saber si se cumple una condición. Un noul por etiqueta cuando varias pueden ser ciertas a la vez.",
  "learn.primitives.noul.returns": "Una probabilidad de sí, de 0 a 1. Sin confidence aparte.",
  "learn.primitives.noul.watch": "0.5 significa que sí y no son igual de probables, no “medio”.",
  "learn.primitives.choice.use": "Una opción de un conjunto definido, hasta 255 opciones.",
  "learn.primitives.choice.returns":
    "La opción elegida, una probabilidad por cada opción y el valor de confidence.",
  "learn.primitives.choice.watch": "Agrega una opción “other” cuando la lista pueda estar incompleta.",
  "learn.primitives.score.use": "Un grado a lo largo de niveles ordenados que tú describes, de 2 a 10 niveles.",
  "learn.primitives.score.returns":
    "Una posición que puede caer entre niveles, la legend, las probabilities y el valor de confidence.",
  "learn.primitives.score.watch": "Los niveles deben describir situaciones concretas que se entiendan por sí solas.",
  "learn.confidence.title": "Confidence en la práctica",
  "learn.confidence.intro":
    "Para choices y scores, confidence resume qué tan concentradas están las probabilities: todo en una opción indica seguridad; repartido, incertidumbre. Arrastra el deslizador y observa cómo cambia el nivel. Los thresholds de cada nivel son tuyos, no del modelo.",
  "learn.confidence.sliderLabel": "Probabilidad de la opción principal",
  "learn.confidence.math": "tres opciones: (3 × {p} − 1) / 2 = {confidence}",
  "learn.confidence.note":
    "La fórmula mostrada es el ejemplo de tres opciones de la documentación. La API devuelve su propio confidence: úsalo y nunca lo recalcules.",
  "learn.habits.title": "Cinco hábitos",
  "learn.habits.decompose.title": "Descompón",
  "learn.habits.decompose.text":
    "Reemplaza “¿Es spam?” por questions acotadas: ¿pide credenciales?, ¿el remitente no coincide con el dominio?, ¿anuncia un premio inesperado?",
  "learn.habits.structure.title": "Estructura el state",
  "learn.habits.structure.text":
    "Envía solo lo que necesita cada decisión, como campos JSON con nombre. Señala los valores con rutas entre backticks, como `ticket.message`.",
  "learn.habits.parallel.title": "Pregunta en paralelo",
  "learn.habits.parallel.text":
    "Las questions independientes sobre el mismo state se ejecutan juntas en una sola solicitud. Cada question adicional solo cuesta tokens adicionales.",
  "learn.habits.route.title": "Haz routing según confidence",
  "learn.habits.route.text":
    "Actúa con las respuestas seguras, pide confirmación en las intermedias y envía las inciertas a una persona.",
  "learn.habits.compose.title": "Compón en código",
  "learn.habits.compose.text":
    "Los weights, thresholds y efectos secundarios pertenecen a tu código. Cambiar un weight nunca debería requerir una nueva llamada al modelo.",
  "learn.pitfalls.title": "Dónde Jev es irregular (1.13)",
  "learn.pitfalls.intro":
    "Límites conocidos, cada uno con el diseño que permite sortearlo. Prueba con tus propios datos.",
  "learn.pitfalls.instead": "En su lugar: {fix}",
  "learn.pitfalls.literal.title": "Lee de forma literal",
  "learn.pitfalls.literal.problem":
    "Jev no infiere la intención. Si las respuestas parecen erróneas, es probable que las instructions omitan algún detalle.",
  "learn.pitfalls.literal.fix": "Indica la condición exacta.",
  "learn.pitfalls.arithmetic.title": "Aritmética y conteo",
  "learn.pitfalls.arithmetic.problem": "No puede contar, sumar ni juzgar la cercanía numérica de forma fiable.",
  "learn.pitfalls.arithmetic.fix":
    "Calcula en código y envía el significado, por ejemplo el nombre de un color en lugar de su hex.",
  "learn.pitfalls.dates.title": "Fechas",
  "learn.pitfalls.dates.problem": "Las fechas se comportan como texto, así que las comparaciones y las duraciones fallan.",
  "learn.pitfalls.dates.fix": "Extrae día, mes y año como choices y haz los cálculos en código.",
  "learn.pitfalls.indirection.title": "Indirección",
  "learn.pitfalls.indirection.problem":
    "El razonamiento de varios saltos y las dobles negaciones reducen la precisión.",
  "learn.pitfalls.indirection.fix": "Nombra directamente el campo relevante y formula la question en positivo.",
  "learn.pitfalls.bloat.title": "Exceso de contexto",
  "learn.pitfalls.bloat.problem": "Las entradas grandes, llenas de detalles irrelevantes, lo distraen.",
  "learn.pitfalls.bloat.fix": "Filtra el state en código antes de enviarlo.",
  "learn.pitfalls.hostile.title": "Texto hostil",
  "learn.pitfalls.hostile.problem":
    "El state no se trata como adversarial: las instrucciones inyectadas pueden influir en una respuesta.",
  "learn.pitfalls.hostile.fix":
    "Usa criteria explícitos, prueba con entradas hostiles y agrega una question de guardrail.",
  "learn.pitfalls.contradictory.title": "Criteria contradictorios",
  "learn.pitfalls.contradictory.problem": "Si las instructions y los criteria no coinciden, la calidad baja.",
  "learn.pitfalls.contradictory.fix": "Mantén la redacción alineada. Nunca asocies “true” con “no”.",
  "learn.pitfalls.writing.title": "Escribir texto",
  "learn.pitfalls.writing.problem": "Genera texto mal y con lentitud.",
  "learn.pitfalls.writing.fix": "Usa choices acotadas o extracción, y deja que un modelo generativo escriba la prosa.",
  "learn.limits.title": "Límites y precio",
  "learn.limits.models.label": "Modelos",
  "learn.limits.models.value": "jev-latest (alias) o jev-1.13.0 (fijo)",
  "learn.limits.context.label": "Contexto",
  "learn.limits.context.value": "{tokens} tokens por solicitud",
  "learn.limits.price.label": "Precio",
  "learn.limits.price.value":
    "{price} por cada mil millones de input tokens. Los output tokens son gratuitos. Una solicitud de {sampleTokens} tokens cuesta aproximadamente {sampleCost}.",
  "learn.limits.rate.label": "Rate limits",
  "learn.limits.rate.value":
    "{requests} solicitudes por minuto, {tokens} tokens por segundo. Se ajustan según la demanda.",
  "learn.limits.input.label": "Entrada",
  "learn.limits.input.value": "Solo texto: strings, objetos JSON o arrays. Funciona mejor en inglés.",
  "learn.limits.shape.label": "Límites de forma",
  "learn.limits.shape.value": "Choice: hasta 255 opciones. Score: de 2 a 10 niveles.",
  "learn.limits.errors.label": "Errores",
  "learn.limits.errors.value":
    "401 key inválida, 422 solicitud mal formada, 429 rate limited, 529 sobrecargado. Espera y reintenta ante 429 y 529.",
  "learn.ship.title": "Llévalo a producción con seguridad",
  "learn.ship.guarantee":
    "La salida tipada garantiza la interfaz, no la verdad. Mantén la API key en un servidor, evalúa los thresholds con tus propios datos y el costo de equivocarte, y trata los números del cookbook como ejemplos por verificar, no como reglas.",
  "learn.ship.more": "Más información: {build}, {confidence}, {jaggedness} y el {docs}.",
  "learn.ship.link.build": "cómo construir con TypeSafe",
  "learn.ship.link.confidence": "confidence",
  "learn.ship.link.jaggedness": "irregularidad de Jev 1.13",
  "learn.ship.link.docs": "índice de la documentación",
  "learn.foot":
    "Resumido de docs.typesafe.ai el 2026-09-20. La documentación en línea es la fuente de verdad. Jev Lab es una herramienta de aprendizaje, no un producto oficial de TypeSafe.",

  // Results (run banner, decision panel, policy controls)
  "results.live.title": "Respuesta live de {model}",
  "results.live.detail": "{ms} ms · {input} input tokens · aproximadamente {cost} (los output tokens son gratuitos)",
  "results.sample.title": "Sample escrito a mano, no salida del modelo",
  "results.sample.detail":
    "Estas respuestas ilustran la forma de la respuesta de este preset. Agrega TYPESAFE_API_KEY y reinicia el servidor para ejecutar Jev con cualquier entrada.",
  "results.demo.title": "Demo engine, no Jev",
  "results.demo.detail":
    "Una heurística de palabras clave imita la forma de la respuesta. Sus respuestas no dicen nada sobre cómo se comporta Jev.",
  "results.decision.aria": "Lo que decide tu código",
  "results.policy.title": "Tu policy: código, no modelo",
  "results.policy.act": "Act a partir de",
  "results.policy.human": "Humano por debajo de",
  "results.policy.note":
    "Arrastra los deslizadores: los niveles y la decisión se actualizan al instante. No se vuelve a llamar al modelo.",

  // Visualization (instruments)
  "viz.tier.act": "Automático",
  "viz.tier.confirm": "Requiere revisión",
  "viz.tier.escalate": "Decide una persona",
  "viz.confidence.title": "Confidence {value}",
  "viz.confidence.label": "confidence {value}",
  "viz.noul.yes": "Sí",
  "viz.noul.no": "No",
  "viz.noul.torn": "Indeciso",
  "viz.noul.aria": "Probabilidad de sí: {value}",
  "viz.noul.tick0": "0 no",
  "viz.noul.tick05": "0.5 indeciso",
  "viz.noul.tick1": "1 sí",
  "viz.noul.note":
    "Un noul no tiene campo confidence. Lee la probabilidad directamente: cerca de 0.5 significa que sí y no son casi igual de probables, no “medio”.",
  "viz.choice.more.one": "+ {n} opción más con menor probabilidad",
  "viz.choice.more.other": "+ {n} opciones más con menor probabilidad",
  "viz.score.range": "de 0 a {max}, más cercano: {legend}",

  // Example extras (phish check, semantic find)
  "extras.phish.verdict.phishing": "Probable phishing: poner en cuarentena",
  "extras.phish.verdict.suspicious": "Sospechoso: advertir al lector",
  "extras.phish.verdict.safe": "Parece legítimo: entregar",
  "extras.phish.composite": "Composite score {value} frente a threshold {threshold}",
  "extras.phish.compositeAria": "Composite {value}",
  "extras.phish.counter":
    "Llamadas al modelo: 1. Cambios de policy desde entonces: {changes}. Todos los cambios fueron gratis.",
  "extras.phish.fact": "{p} × weight {weight} = {product}",
  "extras.phish.policy": "Tu policy: weights y threshold",
  "extras.find.raw": "Mostrar las {n} respuestas score sin procesar",
};
