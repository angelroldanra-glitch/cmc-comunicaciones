import React, { useState } from 'react';
import {
  HeartPulse,
  CheckCircle,
  AlertTriangle,
  MessageSquare,
  Send,
  Phone,
} from 'lucide-react';

export default function Triage({ user }) {
  // Base de datos de casos (Ahora incluye el teléfono del jugador)
  const [casos, setCasos] = useState([
    {
      id: 1,
      name: 'Luis Pérez',
      phone: '55551234',
      category: 'Sub-15',
      diagnostic: 'Posible esguince de tobillo',
      reason:
        'Dolor agudo en rodilla derecha post-partido. Inflamación visible.',
      priority: 'Alta',
      status: 'Pendiente',
      from: 'Cristian (Inferiores)',
      recommendation: '',
    },
  ]);

  const [showReply, setShowReply] = useState(false);
  const [activeCaso, setActiveCaso] = useState(null);
  const [replyText, setReplyText] = useState('');

  // Formulario del Fisio
  const [nuevoCaso, setNuevoCaso] = useState({
    name: '',
    phone: '',
    category: 'Sub-15',
    diagnostic: '',
    reason: '',
    priority: 'Media',
  });
  const [enviado, setEnviado] = useState(false);

  // FISIO: Enviar nuevo caso
  const enviarTriage = (e) => {
    e.preventDefault();
    setCasos([
      ...casos,
      {
        ...nuevoCaso,
        id: casos.length + 1,
        status: 'Pendiente',
        from: user.name,
        recommendation: '',
      },
    ]);
    setNuevoCaso({
      name: '',
      phone: '',
      category: 'Sub-15',
      diagnostic: '',
      reason: '',
      priority: 'Media',
    });
    setEnviado(true);
    setTimeout(() => setEnviado(false), 3000);
  };

  // DIRECTOR: Citar a Central
  const aceptarCaso = (id) => {
    setCasos(
      casos.map((c) =>
        c.id === id ? { ...c, status: 'Cita en Clínica Central' } : c
      )
    );
  };

  // DIRECTOR: Enviar Indicación Remota
  const enviarRecomendacion = (e) => {
    e.preventDefault();
    setCasos(
      casos.map((c) =>
        c.id === activeCaso.id
          ? {
              ...c,
              status: 'Indicación Remota Enviada',
              recommendation: replyText,
            }
          : c
      )
    );
    setShowReply(false);
    setReplyText('');
  };

  // NOTIFICACIÓN AUTOMÁTICA POR WHATSAPP
  const notificarWhatsApp = (caso) => {
    let mensaje = '';
    if (caso.status === 'Cita en Clínica Central') {
      mensaje = `Hola ${caso.name}, te saluda el Depto. Médico de Comunicaciones F.C.\n\nEl Dr. Angel Roldan ha revisado tu caso y te ha citado a la Clínica Central para una evaluación médica. Por favor confirmar de recibido y coordinar tu llegada.`;
    } else {
      mensaje = `Hola ${caso.name}, te saluda el Depto. Médico de Comunicaciones F.C.\n\nEl Dr. Angel Roldan ha evaluado tu reporte y dejó la siguiente indicación médica: *"${caso.recommendation}"*.\n\nPor favor acércate a tu fisioterapeuta de categoría para seguir este proceso.`;
    }

    // Formatea el teléfono (elimina espacios o guiones) y abre la URL de WhatsApp
    const telefonoLimpio = caso.phone.replace(/\D/g, '');
    window.open(
      `https://wa.me/${telefonoLimpio}?text=${encodeURIComponent(mensaje)}`,
      '_blank'
    );
  };

  // ==========================================
  // VISTA PARA LOS FISIOTERAPEUTAS
  // ==========================================
  if (user.role === 'FISIO') {
    return (
      <div className="p-4 md:p-6 animate-fade-in">
        <h2 className="text-2xl font-bold text-red-700 mb-6 flex items-center gap-2 border-b pb-2">
          <HeartPulse /> Triage e Interconsultas
        </h2>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Formulario de Envío (Fisio) */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
            <h3 className="text-lg font-bold text-[#000080] mb-4">
              Enviar Caso al Director Médico
            </h3>
            {enviado && (
              <div className="mb-4 bg-green-100 text-green-800 p-3 rounded-xl font-bold border border-green-300 flex items-center gap-2">
                <CheckCircle size={18} /> ¡Caso enviado con éxito!
              </div>
            )}

            <form onSubmit={enviarTriage} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-bold text-xs text-gray-600">
                    Jugador
                  </label>
                  <input
                    type="text"
                    required
                    className="w-full border p-2 rounded-xl mt-1 text-sm"
                    value={nuevoCaso.name}
                    onChange={(e) =>
                      setNuevoCaso({ ...nuevoCaso, name: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="font-bold text-xs text-gray-600">
                    Teléfono (WhatsApp)
                  </label>
                  <input
                    type="tel"
                    required
                    className="w-full border p-2 rounded-xl mt-1 text-sm"
                    value={nuevoCaso.phone}
                    onChange={(e) =>
                      setNuevoCaso({ ...nuevoCaso, phone: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-bold text-xs text-gray-600">
                    Categoría
                  </label>
                  <select
                    className="w-full border p-2 rounded-xl mt-1 text-sm"
                    value={nuevoCaso.category}
                    onChange={(e) =>
                      setNuevoCaso({ ...nuevoCaso, category: e.target.value })
                    }
                  >
                    {user.categories.map(
                      (c) =>
                        c !== 'ALL' && (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        )
                    )}
                  </select>
                </div>
                <div>
                  <label className="font-bold text-xs text-gray-600">
                    Prioridad
                  </label>
                  <select
                    className="w-full border p-2 rounded-xl mt-1 text-sm"
                    value={nuevoCaso.priority}
                    onChange={(e) =>
                      setNuevoCaso({ ...nuevoCaso, priority: e.target.value })
                    }
                  >
                    <option value="Baja">Baja (Rutina)</option>
                    <option value="Media">Media (Molestia)</option>
                    <option value="Alta">Alta (Trauma/Aguda)</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="font-bold text-xs text-gray-600">
                  Diagnóstico Preliminar
                </label>
                <input
                  type="text"
                  required
                  className="w-full border p-2 rounded-xl mt-1 text-sm"
                  value={nuevoCaso.diagnostic}
                  onChange={(e) =>
                    setNuevoCaso({ ...nuevoCaso, diagnostic: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="font-bold text-xs text-gray-600">
                  Motivo Clínico de Envío
                </label>
                <textarea
                  required
                  rows="2"
                  className="w-full border p-2 rounded-xl mt-1 text-sm"
                  value={nuevoCaso.reason}
                  onChange={(e) =>
                    setNuevoCaso({ ...nuevoCaso, reason: e.target.value })
                  }
                ></textarea>
              </div>
              <button
                type="submit"
                className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-xl flex justify-center items-center gap-2 shadow-md transition-all"
              >
                <Send size={18} /> Enviar a Clínica Central
              </button>
            </form>
          </div>

          {/* Bandeja de Respuestas (Fisio) */}
          <div className="bg-gray-50 p-6 rounded-2xl shadow-inner border border-gray-200">
            <h3 className="text-lg font-bold text-gray-700 mb-4">
              Respuestas del Director Médico
            </h3>
            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
              {casos
                .filter((c) => user.categories.includes(c.category))
                .map((caso) => (
                  <div
                    key={caso.id}
                    className={`bg-white border-l-4 p-4 rounded-xl shadow-sm ${
                      caso.status === 'Pendiente'
                        ? 'border-gray-400'
                        : caso.status.includes('Cita')
                        ? 'border-red-500'
                        : 'border-blue-500'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-bold text-gray-800">{caso.name}</h4>
                      <span
                        className={`text-xs px-2 py-1 rounded-full font-bold ${
                          caso.status === 'Pendiente'
                            ? 'bg-gray-100 text-gray-600'
                            : caso.status.includes('Cita')
                            ? 'bg-red-100 text-red-700'
                            : 'bg-blue-100 text-blue-700'
                        }`}
                      >
                        {caso.status}
                      </span>
                    </div>
                    {caso.recommendation && (
                      <div className="bg-blue-50 border border-blue-100 p-3 rounded-lg mt-2">
                        <p className="text-[10px] text-blue-600 font-bold uppercase mb-1">
                          Indicación del Dr. Angel:
                        </p>
                        <p className="text-sm font-semibold text-blue-900 leading-tight">
                          "{caso.recommendation}"
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              {casos.filter((c) => user.categories.includes(c.category))
                .length === 0 && (
                <p className="text-gray-500 italic text-sm text-center mt-10">
                  No has enviado interconsultas aún.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // VISTA PARA EL DIRECTOR MÉDICO
  // ==========================================
  return (
    <div className="p-4 md:p-6 animate-fade-in relative">
      <h2 className="text-2xl font-extrabold text-red-700 mb-6 flex items-center gap-2 border-b pb-2">
        <HeartPulse size={28} /> Bandeja de Triage (Canteras)
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {casos.map((caso) => (
          <div
            key={caso.id}
            className={`bg-white border-l-4 p-5 rounded-2xl shadow-sm hover:shadow-md transition-all ${
              caso.status === 'Pendiente'
                ? 'border-red-500'
                : 'border-green-500'
            }`}
          >
            <div className="flex justify-between items-start mb-2">
              <div>
                <h3 className="font-bold text-xl text-gray-800 leading-tight">
                  {caso.name}
                </h3>
                <p className="text-sm text-gray-500 font-medium">
                  {caso.category} • <Phone size={12} className="inline" />{' '}
                  {caso.phone}
                </p>
              </div>
              <span
                className={`px-2 py-1 rounded-full text-xs font-bold shadow-sm ${
                  caso.priority === 'Alta'
                    ? 'bg-red-100 text-red-700'
                    : 'bg-yellow-100 text-yellow-700'
                }`}
              >
                Prioridad {caso.priority}
              </span>
            </div>

            <p className="text-xs text-gray-400 mb-3 flex items-center gap-1 font-bold">
              <AlertTriangle size={14} /> Reporta: {caso.from}
            </p>

            <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 mb-4">
              <p className="text-xs font-bold text-gray-500 uppercase mb-1">
                Diagnóstico & Motivo:
              </p>
              <p className="text-sm text-gray-800 font-medium mb-1">
                {caso.diagnostic}
              </p>
              <p className="text-sm text-gray-600 italic">"{caso.reason}"</p>
            </div>

            {/* ACCIONES DEL DIRECTOR */}
            {caso.status === 'Pendiente' ? (
              <div className="flex gap-2 mt-auto">
                <button
                  onClick={() => aceptarCaso(caso.id)}
                  className="flex-1 bg-red-50 text-red-700 border border-red-200 hover:bg-red-600 hover:text-white font-bold py-2 rounded-xl text-sm transition-colors shadow-sm"
                >
                  Citar a Clínica
                </button>
                <button
                  onClick={() => {
                    setActiveCaso(caso);
                    setShowReply(true);
                  }}
                  className="flex-1 bg-[#000080] text-white hover:bg-blue-900 font-bold py-2 rounded-xl text-sm transition-colors shadow-sm"
                >
                  Indicación Remota
                </button>
              </div>
            ) : (
              <div className="mt-auto">
                <div className="w-full bg-green-50 text-green-800 border border-green-200 text-center font-bold py-2 rounded-xl text-sm mb-2">
                  {caso.status}
                </div>

                {/* BOTÓN MÁGICO DE WHATSAPP */}
                <button
                  onClick={() => notificarWhatsApp(caso)}
                  className="w-full bg-[#25D366] hover:bg-[#1ebe5d] text-white font-bold py-2 rounded-xl text-sm flex justify-center items-center gap-2 shadow-md transition-all"
                >
                  <MessageSquare size={16} /> Notificar al Jugador
                </button>
              </div>
            )}
          </div>
        ))}
        {casos.length === 0 && (
          <p className="text-gray-500 col-span-3 text-center py-10">
            Bandeja limpia. No hay casos pendientes.
          </p>
        )}
      </div>

      {/* MODAL: REDACTAR INDICACIÓN REMOTA */}
      {showReply && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl relative animate-fade-in">
            <h3 className="text-xl font-bold text-[#000080] mb-2">
              Indicación para Fisio / Jugador
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              Esta nota será visible para el fisioterapeuta y se enviará por
              WhatsApp al jugador.
            </p>
            <form onSubmit={enviarRecomendacion}>
              <textarea
                required
                rows="4"
                className="w-full border border-gray-300 p-3 rounded-xl mb-4 text-sm focus:ring-2 focus:ring-[#000080]"
                placeholder="Ej. Aplicar hielo, vendaje compresivo y guardar reposo..."
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
              ></textarea>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowReply(false)}
                  className="flex-1 bg-gray-200 py-3 rounded-xl font-bold text-gray-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-[#000080] text-white py-3 rounded-xl font-bold shadow-md"
                >
                  Guardar y Enviar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
