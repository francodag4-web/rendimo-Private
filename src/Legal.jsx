import React, { useEffect } from 'react';
import { AppVersion } from './ui/SettingsKit.jsx';

// Datos del titular de la plataforma (LSSI art. 10). Lo que esté vacío sale como «pendiente».
export const LEGAL = {
  titular: 'Franco David Alderete Goñi',
  nif: '',
  domicilio: '',
  email: '',
  web: 'rendimo.app',
  actualizado: '20 de octubre de 2026',
};
const F = ({ v }) => (v ? <b>{v}</b> : <mark className="pend">pendiente de completar</mark>);

const PAGES = {
  privacidad: ['Política de privacidad', Privacy],
  condiciones: ['Condiciones de uso', Terms],
  aviso: ['Aviso legal', Notice],
};

export default function Legal({ page }) {
  const [title, Body] = PAGES[page] || PAGES.privacidad;
  useEffect(() => { document.title = `${title} · Rendimo`; window.scrollTo(0, 0); return () => { document.title = 'Rendimo'; }; }, [title]);
  const back = () => (window.history.length > 1 ? window.history.back() : (window.location.hash = '#/'));
  return (
    <div className="legal">
      <div className="between"><b className="legal-brand">Rendimo</b><button className="btn sm" onClick={back}>Volver</button></div>
      <nav className="row small" aria-label="Documentos legales">
        {Object.entries(PAGES).map(([k, [t]]) => <a key={k} href={`#/legal/${k}`} aria-current={k === page ? 'page' : undefined}>{t}</a>)}
      </nav>
      <article className="panel stack">
        <h1>{title}</h1>
        <p className="muted small">Última actualización: {LEGAL.actualizado}</p>
        <Body />
      </article>
      <AppVersion />
    </div>
  );
}

function Privacy() {
  return (
    <>
      <h3>1. Quién trata tus datos</h3>
      <p>Rendimo ({LEGAL.web}) es una aplicación que usan entrenadores y readaptadores para programar y seguir el entrenamiento de sus clientes.</p>
      <ul>
        <li><b>Si eres cliente de un entrenador</b>, el responsable de tus datos es tu entrenador: decide qué se registra y para qué. Rendimo trata esos datos por cuenta de tu entrenador, como encargado del tratamiento (art. 28 RGPD).</li>
        <li><b>Si eres entrenador</b>, el responsable de los datos de tu cuenta es el titular de Rendimo: <F v={LEGAL.titular} />, NIF <F v={LEGAL.nif} />, <F v={LEGAL.domicilio} />. Contacto: <F v={LEGAL.email} />.</li>
      </ul>
      <h3>2. Qué datos se guardan</h3>
      <ul>
        <li>Identificación y contacto: nombre, correo, teléfono, posición o deporte.</li>
        <li>Servicio: plan, importe, fechas, pagos marcados por el entrenador (la app no cobra ni guarda tarjetas).</li>
        <li>Entrenamiento: programas, sesiones realizadas, cargas, RPE, duración, tests y marcas.</li>
        <li>Bienestar diario: sueño, energía, agujetas, estrés, ánimo y dolor.</li>
        <li>Datos de salud: lesiones, antecedentes, restricciones e informes que compartas con tu entrenador.</li>
        <li>Datos técnicos mínimos para mantener la sesión iniciada (no usamos cookies publicitarias ni de análisis).</li>
      </ul>
      <h3>3. Para qué y con qué base legal</h3>
      <ul>
        <li>Prestar el servicio de entrenamiento y su seguimiento: ejecución del contrato con tu entrenador (art. 6.1.b RGPD).</li>
        <li>Datos de salud y bienestar: tu consentimiento explícito, que das al entrar por primera vez y puedes retirar cuando quieras (art. 9.2.a RGPD).</li>
        <li>Comunicaciones del servicio (enlaces de acceso, avisos): ejecución del contrato.</li>
      </ul>
      <h3>4. Quién más accede</h3>
      <p>Solo tu entrenador ve tus datos. No se venden ni se ceden a terceros. Para que la app funcione usamos estos proveedores, con contrato de encargo y garantías del RGPD:</p>
      <ul>
        <li>Supabase: base de datos y acceso, con servidores en la Unión Europea.</li>
        <li>Cloudflare: alojamiento y entrega de la web.</li>
        <li>Resend: envío de los correos de acceso.</li>
      </ul>
      <p>Si alguno trata datos fuera del Espacio Económico Europeo, lo hace con las cláusulas contractuales tipo de la Comisión Europea o el Marco de Privacidad de Datos UE-EE. UU.</p>
      <h3>5. Cuánto tiempo</h3>
      <p>Mientras tengas cuenta o tu entrenador mantenga tu ficha. Si borras tu cuenta desde Ajustes, se eliminan tu acceso y todos tus datos de forma inmediata e irreversible, salvo lo que la ley obligue a conservar.</p>
      <h3>6. Tus derechos</h3>
      <p>Puedes pedir acceso, rectificación, supresión, oposición, limitación y portabilidad de tus datos, y retirar tu consentimiento. Como cliente, pídeselo a tu entrenador; también puedes borrar tu cuenta tú mismo en Ajustes → Borrar mi cuenta. Para cualquier otra cuestión escribe a <F v={LEGAL.email} />. Si crees que no se respetan tus derechos, puedes reclamar ante la Agencia Española de Protección de Datos (aepd.es).</p>
      <h3>7. Menores</h3>
      <p>Los menores de 14 años necesitan el consentimiento de su madre, padre o tutor para usar la app (art. 7 LOPDGDD). El entrenador debe recabarlo antes de darlos de alta.</p>
      <h3>8. Seguridad</h3>
      <p>Las comunicaciones van cifradas (HTTPS) y cada cuenta solo puede leer lo suyo: los clientes ven sus datos y cada entrenador, los de sus clientes.</p>
    </>
  );
}

function Terms() {
  return (
    <>
      <h3>1. Qué es Rendimo</h3>
      <p>Una herramienta para que entrenadores programen, sigan y comuniquen el entrenamiento de sus clientes, y para que los clientes vean su plan y registren cómo entrenan. Titular: <F v={LEGAL.titular} />.</p>
      <h3>2. Cuentas</h3>
      <p>Para entrar necesitas un correo válido. Eres responsable de no compartir tu acceso. El entrenador da de alta a sus clientes y puede darlos de baja.</p>
      <h3>3. El servicio de entrenamiento</h3>
      <p>Cada entrenador es el único responsable de los planes, indicaciones y servicios que presta a sus clientes, de sus precios y de cobrarlos. Rendimo no presta servicios de entrenamiento ni de salud y no interviene en los pagos entre entrenador y cliente.</p>
      <h3>4. No es consejo médico</h3>
      <p>La información de la app no sustituye el diagnóstico ni el tratamiento de un profesional sanitario. Si tienes dolor intenso, una lesión o dudas sobre tu salud, consulta a un médico o fisioterapeuta.</p>
      <h3>5. Uso correcto</h3>
      <p>No está permitido usar la app para fines ilícitos, intentar acceder a datos de otras personas, subir contenido que no te pertenezca o interferir en su funcionamiento.</p>
      <h3>6. Contenido</h3>
      <p>Los programas, ejercicios, vídeos y textos que sube cada entrenador son suyos. Tus registros son tuyos y puedes pedir una copia.</p>
      <h3>7. Disponibilidad y cambios</h3>
      <p>Trabajamos para que la app funcione siempre, pero puede haber interrupciones por mantenimiento o causas ajenas. Podemos mejorar o cambiar funciones; si cambian estas condiciones de forma importante, te avisaremos en la app.</p>
      <h3>8. Baja</h3>
      <p>Puedes dejar de usar la app y borrar tu cuenta cuando quieras desde Ajustes → Borrar mi cuenta.</p>
      <h3>9. Responsabilidad</h3>
      <p>Rendimo responde de los daños causados por dolo o negligencia grave. No responde del contenido de los planes del entrenador ni de cómo se ejecutan los ejercicios. Nada de esto limita tus derechos como consumidor.</p>
      <h3>10. Ley aplicable</h3>
      <p>Se aplica la ley española. Si eres consumidor, serán competentes los juzgados de tu domicilio.</p>
    </>
  );
}

function Notice() {
  return (
    <>
      <h3>Titular</h3>
      <ul>
        <li>Nombre: <F v={LEGAL.titular} /></li>
        <li>NIF: <F v={LEGAL.nif} /></li>
        <li>Domicilio: <F v={LEGAL.domicilio} /></li>
        <li>Correo: <F v={LEGAL.email} /></li>
        <li>Sitio web: {LEGAL.web}</li>
      </ul>
      <p>En cumplimiento del artículo 10 de la Ley 34/2002 de Servicios de la Sociedad de la Información y de Comercio Electrónico (LSSI-CE).</p>
      <h3>Actividad</h3>
      <p>Aplicación web para la gestión y el seguimiento del entrenamiento entre entrenadores y sus clientes.</p>
      <h3>Propiedad intelectual</h3>
      <p>El diseño, el código y la marca Rendimo pertenecen a su titular. El contenido que publica cada entrenador es de su autoría o tiene derechos para usarlo.</p>
      <h3>Enlaces</h3>
      <p>La app puede enlazar a WhatsApp, Instagram u otros servicios externos. Rendimo no es responsable de su contenido ni de sus políticas.</p>
      <h3>Privacidad y condiciones</h3>
      <p>Consulta la <a href="#/legal/privacidad">política de privacidad</a> y las <a href="#/legal/condiciones">condiciones de uso</a>.</p>
    </>
  );
}
