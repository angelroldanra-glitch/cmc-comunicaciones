import React, { useState, useEffect } from 'react';
import {
  HeartPulse,
  CheckCircle,
  AlertTriangle,
  MessageSquare,
  Send,
  Phone,
} from 'lucide-react';
import { supabase } from './supabase'; // CONEXIÓN A SUPABASE

export default function Triage({ user }) {
  // Bandeja conectada a la nube
  const [casos, setCasos] = useState([]);
  const [showReply, setShowReply] = useState(false);
  const [activeCaso, setActiveCaso] = useState(null);
  const [replyText, setReplyText] = useState('');

  // ESCÁNER EN VIVO: Busca en Supabase todas las lesiones con sello de interconsulta
  const fetchInterconsultas = async () => {
    const { data, error } = await supabase.from('jugadores').select('*');
    if (data) {
      let interconsultasExtraidas = [];

      data.forEach((jugador) => {
        if (jugador.history && jugador.history.length > 0) {
          jugador.history.forEach((lesion, index) => {
            if (lesion.interconsulta === true) {
              // Convertir la lesión en formato de "Caso de Triage"
              interconsultasExtraidas.push({
                id: `${jugador.id}-${index}`, // ID único combinando el ID del jugador y el index de la lesión
                jugadorId: jugador.id,
                historialIndex: index,
                name: jugador.name,
                phone: jugador.phone,
                category: jugador.category,
                diagnostic: lesion.diagnosis,
                reason: lesion.historyText,
                priority: lesion.timeLoss > 3 ? 'Alta' : 'Media',
                status: lesion.statusInterconsulta || 'Pendiente', // Si no tiene status, es Pendiente
                from: 'Fisioterapeuta',
                recommendation: lesion.recommendation || '',
              });
            }
          });
        }
      });

      // Ordenar para que los pendientes salgan de primero
      interconsultasExtraidas.sort((a, b) => a.status === 'Pendiente' ? -1 : 1);
      setCasos(interconsultasExtraidas);
    }
  };

  // Escanear apenas se abre la pantalla
  useEffect(() => {
    fetchInterconsultas();
  }, []);


  // =========================================================================
  // ACCIONES DEL DIRECTOR MÉDICO (Actualizan el estado de la interconsulta en Supabase)
  // =========================================================================
  const actualizarStatusEnNube = async (caso, nuevoStatus, nuevaRecomendacion = '') => {
    // 1. Obtener al jugador de la base de datos
    const { data: jugadorData } = await supabase
      .from('jugadores')
      .select('history')
      .eq('id', caso.jugadorId)
      .single();

    if (jugadorData) {
      // 2. Modificar su historial para agregar el status y recomendación del Director
      let historialActualizado = [...jugadorData.history];
      historialActualizado[caso.historialIndex].statusInterconsulta = nuevoStatus;
      if (nuevaRecomendacion) {
        historialActualizado[caso.historialIndex].recommendation = nuevaRecomendacion;
      }

      // 3. Guardarlo de vuelta en Supabase
      await supabase
        .from('jugadores')
        .update({ history: historialActualizado })
        .eq('id', caso.jugadorId);

      // Refrescar la pantalla
      fetchInterconsultas();
    }
  };

  const aceptarCaso = (caso) => {
    actualizarStatusEnNube(caso, 'Cita en Clínica Central');
  };

  const enviarRecomendacion = (e) => {
    e.preventDefault();
    actualizarStatusEnNube(activeCaso, 'Indicación Remota Enviada', replyText);
    setShowReply(false);
    setReplyText('');
  };


  // =========================================================================
  // NOTIFICACIÓN AUTOMÁTICA POR WHATSAPP
  // =========================================================================
  const notificarWhatsApp = (caso) => {
    let mensaje = '';
    if (caso.status === 'Cita en Clínica Central') {
      mensaje = `Hola ${caso.name}, te saluda el Depto. Médico de Comunicaciones F.C.\n\nEl Dr. Angel Roldan ha revisado tu caso clínico y te ha citado a la Clínica Central para una evaluación médica. Por favor confirmar de recibido y coordinar tu llegada.`;
    } else {
      mensaje = `Hola ${caso.name}, te saluda el Depto. Médico de Comunicaciones F.C.\n\nEl Dr. Angel Roldan ha evaluado tu reporte y dejó la siguiente indicación médica: *"${caso.recommendation}"*.\n\nPor favor acércate a tu fisioterapeuta de categoría para seguir este proceso.`;
    }

    const telefonoLimpio = caso.phone ? caso.phone.replace(/\D/g, '') : '';
    if (!telefonoLimpio) {
      alert("Este jugador no tiene un número de teléfono registrado.");
      return;
    }
    
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
          <HeartPulse /> Respuestas del Director Médico
        </h2>

        <div className="bg-gray-50 p-6 rounded-2xl shadow-inner border border-gray-200">
          <p className="text-gray-600 mb-6 font-medium">
            Nota: Para solicitar una nueva interconsulta, ve a la pestaña <strong>Roster</strong>, busca al jugador, haz clic en "Registrar Lesión" y marca la casilla amarilla de Interconsulta.
          </p>
          
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
            {casos.filter((c) => user.categories.includes(c.category)).length === 0 && (
              <p className="text-gray-500 italic text-sm text-center mt-10">
                No hay interconsultas activas en tu categoría.
              </p>
            )}
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
              caso.status === 'Pendiente' ? 'border-red-500' : 'border-green-500'
            }`}
          >
            <div className="flex justify-between items-start mb-2">
              <div>
                <h3 className="font-bold text-xl text-gray-800 leading-tight">
                  {caso.name}
                </h3>
                <p className="text-sm text-gray-500 font-medium">
                  {caso.category} • <Phone size={12} className="inline" />{' '}
                  {caso.phone || 'Sin número'}
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
              <AlertTriangle size={14} /> Reportado vía Roster Clínico
            </p>

            <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 mb-4">
              <p className="text-xs font-bold text-gray-500 uppercase mb-1">
                Diagnóstico Exacto:
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
                  onClick={() => aceptarCaso(caso)}
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
                <button
                  onClick={() => notificarWhatsApp(caso)}
                  className="w-full bg-[#25D366] hover:bg-[#1ebe5d] text-white font-bold py-2 rounded-xl text-sm flex justify-center items-center gap-2 shadow-md transition-all"
                >
                  <MessageSquare size={16} /> Notificar por WhatsApp
                </button>
              </div>
            )}
          </div>
        ))}
        {casos.length === 0 && (
          <div className="col-span-3 text-center py-10 bg-white border rounded-2xl">
            <CheckCircle size={48} className="mx-auto text-green-300 mb-3" />
            <p className="text-gray-500 font-bold text-lg">Bandeja limpia.</p>
            <p className="text-gray-400 text-sm">No hay interconsultas clínicas pendientes.</p>
          </div>
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
              Esta nota será visible para el fisioterapeuta y se enviará por WhatsApp al jugador.
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
