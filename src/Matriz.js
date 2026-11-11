import React, { useState, useEffect } from 'react';
import {
  CalendarDays,
  Save,
  FileText,
  CheckCircle,
  Edit3,
  User,
  Activity,
} from 'lucide-react';
import { supabase } from './supabase'; // CONEXIÓN A SUPABASE

export default function Matriz({ user, categoryFilter }) {
  const [players, setPlayers] = useState([]);
  const [contextoDia, setContextoDia] = useState('Entrenamiento');
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [editingStatus, setEditingStatus] = useState(null);

  // 1. CARGAR JUGADORES DESDE LA NUBE
  const fetchPlayers = async () => {
    const { data, error } = await supabase
      .from('jugadores')
      .select('*')
      .order('name', { ascending: true });

    if (data) {
      const today = new Date();
      const processedPlayers = data.map((p) => {
        let currentStatus = p.status;

        // Lógica automática: Si el timeLoss ya pasó, regresarlo a Apto (basado en su última lesión)
        if (p.status === 'Baja' && p.history && p.history.length > 0) {
          const lastInjury = p.history[p.history.length - 1];
          if (lastInjury && lastInjury.timeLoss > 0 && lastInjury.date) {
            // Convirtiendo fecha DD/MM/YYYY a objeto Date
            const parts = lastInjury.date.split('/');
            if (parts.length === 3) {
              const injuryDate = new Date(parts[2], parts[1] - 1, parts[0]);
              const daysPassed = Math.floor(
                (today - injuryDate) / (1000 * 60 * 60 * 24)
              );
              if (daysPassed >= lastInjury.timeLoss) currentStatus = 'Apto';
            }
          }
        }
        return { ...p, status: currentStatus };
      });

      // FILTRO INTELIGENTE APLICADO AQUÍ
      const visible = processedPlayers.filter((p) => {
        // Regla 1: Si es FISIO, solo ve lo que tiene en su gafete.
        const hasCategoryAccess = user.categories.includes(p.category);
        
        // Regla 2: Si es DIRECTOR, forzamos que SOLO vea la categoría 'Mayor' en esta pantalla.
        if (user.role === 'DIRECTOR') {
            return p.category === 'Mayor';
        }
        
        // Si no es director, aplicamos el filtro normal
        const matchesMenu = categoryFilter === 'Todas' || p.category === categoryFilter;
        return hasCategoryAccess && matchesMenu;
      });

      setPlayers(visible);
    }
  };

  useEffect(() => {
    fetchPlayers();
  }, [user, categoryFilter]);

  const handleCommentChange = (id, text) => {
    setPlayers(
      players.map((p) => (p.id === id ? { ...p, draftComment: text } : p))
    );
  };

  // FORZAR ESTADO EN LA NUBE
  const handleStatusOverride = async (id, newStatus) => {
    setPlayers(
      players.map((p) => (p.id === id ? { ...p, status: newStatus } : p))
    );
    setEditingStatus(null);
    // Actualizar directamente en la base de datos
    await supabase.from('jugadores').update({ status: newStatus }).eq('id', id);
  };

  // GUARDAR OBSERVACIONES COMO EVOLUCIÓN EN LA NUBE
  const handleSave = async () => {
    for (const p of players) {
      if (p.draftComment) {
        const newEvo = {
          date: new Date().toLocaleDateString('es-ES'),
          note: `Parte Médico (${contextoDia}): ${p.draftComment}`,
        };
        const currentEvo = p.evolution || [];

        // Guardar nota en la evolución del jugador en Supabase
        await supabase
          .from('jugadores')
          .update({ evolution: [...currentEvo, newEvo] })
          .eq('id', p.id);
      }
    }

    const finalPlayers = players.map((p) => {
      if (p.draftComment)
        return { ...p, comment: `Nota: ${p.draftComment}`, draftComment: '' };
      return p;
    });
    setPlayers(finalPlayers);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  // PDF EN FORMATO CARTA NARRATIVA (INTACTO)
  const generarParteMedico = () => {
    const ventana = window.open('', '_blank');
    const lesionados = players.filter(
      (p) => p.status === 'Baja' || p.status === 'Diferenciado'
    );
    const todosAptos = lesionados.length === 0;

    // Para el título del reporte, usamos 'Mayor' si es director, o el filtro si es fisio
    const tituloCategoria = user.role === 'DIRECTOR' ? 'Mayor' : categoryFilter;

    let reporteHTML = '';

    if (todosAptos) {
      reporteHTML = `
        <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; color: #166534; padding: 20px; border-radius: 8px; text-align: center; margin: 30px 0;">
          <h3 style="margin: 0; font-size: 18px;">✅ DÍA SIN INCIDENTES MÉDICOS</h3>
          <p style="margin-top: 10px; font-size: 15px;">Nos complace informar que todo el plantel se encuentra en óptimas condiciones, sin lesiones reportadas, estando aptos y a total disposición para las actividades.</p>
        </div>
      `;
    } else {
      reporteHTML = lesionados
        .map((p) => {
          const estadoDesc =
            p.status === 'Baja'
              ? 'no está disponible (Baja Médica)'
              : 'realizará trabajo diferenciado';

          const lastInjury =
            p.history && p.history.length > 0
              ? p.history[p.history.length - 1]
              : null;
          const diagInfo = lastInjury
            ? lastInjury.diagnosis
            : 'Evaluación médica en curso';
          const timeLossDesc =
            lastInjury && lastInjury.timeLoss > 0
              ? `ameritando un reposo o tiempo de baja estimado de <strong>${lastInjury.timeLoss} días</strong>.`
              : `<strong>no siendo necesario el reposo deportivo</strong> (sin time-loss).`;

          return `
        <div style="margin-bottom: 20px; padding-bottom: 15px; border-bottom: 1px dashed #ccc;">
          <p style="margin: 0 0 10px 0; line-height: 1.6;">
            El jugador <strong>${p.name}</strong> (${
            p.position
          }) <strong>${estadoDesc}</strong>.<br/> 
            Presenta actualmente el diagnóstico de: <em>${diagInfo}</em>.<br/>
            Se está manejando con el siguiente abordaje y medicación: <em>${
              p.comment || 'Terapia de rutina'
            }</em>, por lo que ${timeLossDesc}
          </p>
        </div>`;
        })
        .join('');
    }

    const baseCSS = `
      body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 40px; color: #1f2937; max-width: 800px; margin: 0 auto; }
      .header { border-bottom: 3px solid #000080; padding-bottom: 15px; margin-bottom: 30px; }
      .title { color: #000080; font-size: 22px; font-weight: 900; margin: 0; text-transform: uppercase; letter-spacing: 1px; }
      .subtitle { color: #6b7280; font-size: 11px; text-transform: uppercase; letter-spacing: 2px; margin-top: 5px; font-weight: bold; }
      .footer { margin-top: 80px; text-align: center; }
      .signature { border-top: 1px solid #1f2937; width: 250px; margin: 0 auto; padding-top: 10px; font-weight: bold; font-size: 14px; }
      .no-print { text-align: center; margin-bottom: 20px; padding: 10px; background-color: #f0fdf4; border: 1px solid #bbf7d0; color: #166534; font-size: 14px; border-radius: 5px; }
      @media print { .no-print { display: none; } }
    `;

    ventana.document.write(`
      <html><head><title>Parte Médico - ${tituloCategoria}</title><style>${baseCSS}</style></head>
      <body>
        <div class="no-print"><strong>Para enviar al CT por WhatsApp:</strong> Selecciona "Guardar como PDF".</div>
        <div class="header">
          <h1 class="title">Comunicaciones F.C.</h1>
          <p class="subtitle">Departamento Médico - Categoría: ${tituloCategoria}</p>
        </div>
        
        <p style="text-align: right; color: #6b7280; font-size: 14px;"><strong>Fecha:</strong> ${new Date().toLocaleDateString(
          'es-ES'
        )}</p>
        
        <p style="font-size: 16px; font-weight: bold; margin-top: 30px;">Querido Cuerpo Técnico,</p>
        <p style="font-size: 15px; line-height: 1.6; margin-bottom: 30px;">Por medio de la presente es un gusto saludarles. A continuación, brindo el resumen de disponibilidad y novedades médicas correspondiente a la jornada de <strong>${contextoDia}</strong> del día de hoy:</p>

        ${reporteHTML}

        ${
          !todosAptos
            ? `<p style="font-size: 15px; margin-top: 20px; color: #15803d; font-weight: bold;">El resto del plantel no mencionado en este reporte se encuentra APTO y a total disposición.</p>`
            : ''
        }

        <div class="footer">
          <div class="signature">${user.name}</div>
          <div style="font-size: 12px; color: #6b7280; margin-top: 4px;">Departamento Médico / Fisioterapia</div>
        </div>
        <script>window.onload = function() { setTimeout(function() { window.print(); }, 500); }</script>
      </body></html>
    `);
    ventana.document.close();
  };

  return (
    <div className="p-4 md:p-6 animate-fade-in relative">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 border-b pb-4">
        <div>
          <h2 className="text-2xl font-extrabold text-[#000080] flex items-center gap-3">
            <CalendarDays size={28} className="text-blue-600" /> Matriz de
            Disponibilidad (Parte Médico)
          </h2>
          <p className="text-gray-500 font-bold mt-1">
            Categoría: <span className="text-blue-500">{user.role === 'DIRECTOR' ? 'Mayor' : categoryFilter}</span>
          </p>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <select
            className="border border-gray-300 rounded-xl p-2 text-sm font-bold text-gray-700 bg-white shadow-sm"
            value={contextoDia}
            onChange={(e) => setContextoDia(e.target.value)}
          >
            <option value="Entrenamiento">Entrenamiento</option>
            <option value="Partido Oficial">Partido Oficial</option>
            <option value="Partido Amistoso">Partido Amistoso</option>
            <option value="Recuperación">Recuperación</option>
          </select>
          <button
            onClick={generarParteMedico}
            className="bg-white border-2 border-[#000080] text-[#000080] hover:bg-blue-50 px-4 py-2 rounded-xl flex items-center gap-2 font-bold shadow-sm transition-all flex-shrink-0"
          >
            <FileText size={18} /> Generar Reporte CT
          </button>
        </div>
      </div>

      {savedSuccess && (
        <div className="mb-4 bg-green-100 border border-green-300 text-green-800 px-4 py-3 rounded-xl flex items-center gap-2 font-bold shadow-sm">
          <CheckCircle size={20} /> Observaciones guardadas en el expediente del
          jugador.
        </div>
      )}

      {players.length === 0 ? (
        <div className="bg-gray-50 p-8 text-center rounded-2xl border border-gray-200 text-gray-500">
          <User size={40} className="mx-auto mb-3 text-gray-300" /> No hay
          jugadores visibles en esta categoría (Añádelos desde el Roster).
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-gradient-to-r from-[#000080] to-blue-900 text-white">
                <tr>
                  <th className="p-4 font-semibold w-1/4">
                    Jugador / Posición
                  </th>
                  <th className="p-4 font-semibold text-center w-1/6">
                    Estado Clínico
                  </th>
                  <th className="p-4 font-semibold w-7/12">
                    Resumen / Abordaje de Hoy
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {players.map((p) => {
                  const lastInjury =
                    p.history && p.history.length > 0
                      ? p.history[p.history.length - 1]
                      : null;

                  return (
                    <tr
                      key={p.id}
                      className="hover:bg-blue-50/30 transition-colors"
                    >
                      <td className="p-4">
                        <p className="font-bold text-gray-800 text-lg leading-tight">
                          {p.name}
                        </p>
                        <p className="text-sm text-gray-500 font-medium">
                          {p.category} • {p.position}
                        </p>
                      </td>

                      <td className="p-4 text-center relative">
                        <div className="flex items-center justify-center gap-2">
                          <span
                            className={`px-4 py-1.5 text-sm rounded-full font-bold shadow-sm border ${
                              p.status === 'Apto'
                                ? 'bg-green-100 text-green-700 border-green-200'
                                : p.status === 'Baja'
                                ? 'bg-red-100 text-red-700 border-red-200'
                                : 'bg-yellow-100 text-yellow-700 border-yellow-200'
                            }`}
                          >
                            {p.status}
                          </span>
                          {user.role === 'DIRECTOR' && (
                            <button
                              onClick={() =>
                                setEditingStatus(
                                  editingStatus === p.id ? null : p.id
                                )
                              }
                              className="text-gray-400 hover:text-[#000080] transition"
                            >
                              <Edit3 size={16} />
                            </button>
                          )}
                        </div>

                        {editingStatus === p.id && user.role === 'DIRECTOR' && (
                          <div className="absolute top-14 left-1/2 -translate-x-1/2 bg-white border shadow-xl rounded-lg p-2 z-10 flex flex-col gap-1 w-32">
                            <button
                              onClick={() => handleStatusOverride(p.id, 'Apto')}
                              className="text-xs font-bold text-green-700 bg-green-50 py-1 rounded"
                            >
                              Forzar: Apto
                            </button>
                            <button
                              onClick={() =>
                                handleStatusOverride(p.id, 'Diferenciado')
                              }
                              className="text-xs font-bold text-yellow-700 bg-yellow-50 py-1 rounded"
                            >
                              Diferenciado
                            </button>
                            <button
                              onClick={() => handleStatusOverride(p.id, 'Baja')}
                              className="text-xs font-bold text-red-700 bg-red-50 py-1 rounded"
                            >
                              Baja
                            </button>
                          </div>
                        )}
                      </td>

                      <td className="p-4">
                        {lastInjury && p.status !== 'Apto' && (
                          <div className="flex items-start gap-1.5 mb-2 text-sm text-red-800 bg-red-50 p-2 rounded-lg border border-red-100">
                            <Activity
                              size={14}
                              className="mt-0.5 flex-shrink-0"
                            />
                            <span className="font-semibold leading-tight">
                              {lastInjury.diagnosis}
                            </span>
                          </div>
                        )}
                        {p.comment && (
                          <p className="text-xs text-gray-600 font-medium italic mb-2 border-l-2 border-blue-300 pl-2">
                            {p.comment}
                          </p>
                        )}
                        <input
                          type="text"
                          placeholder="Abordaje/Tratamiento de hoy..."
                          className="w-full border border-gray-200 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-400 bg-gray-50"
                          value={
                            p.draftComment !== undefined ? p.draftComment : ''
                          }
                          onChange={(e) =>
                            handleCommentChange(p.id, e.target.value)
                          }
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="p-4 bg-gray-50 border-t border-gray-200 flex justify-end">
            <button
              onClick={handleSave}
              className="bg-[#000080] hover:bg-blue-900 text-white px-6 py-3 rounded-xl flex items-center gap-2 font-bold shadow-md transition-all"
            >
              <Save size={20} /> Guardar en Expediente (Nube)
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
