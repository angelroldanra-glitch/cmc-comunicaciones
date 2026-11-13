import React, { useState, useEffect } from 'react';
import {
  CalendarDays, Save, FileText, CheckCircle, Edit3, User, Activity, Snowflake, Hand
} from 'lucide-react';
import { supabase } from './supabase'; 

export default function Matriz({ user }) {
  const allCats = ['Mayor', 'Especial', 'Cat A', 'Cat B', 'Sub-15', 'Sub-13'];
  const availableCategories = (user.role === 'DIRECTOR' || user.categories?.includes('ALL')) 
    ? allCats : user.categories;

  const [activeCategory, setActiveCategory] = useState(availableCategories[0] || 'Mayor');
  const [players, setPlayers] = useState([]);
  const [contextoDia, setContextoDia] = useState('Entrenamiento');
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [editingStatus, setEditingStatus] = useState(null);
  
  // NUEVO: Estado para mostrar el reporte dentro de la app sin ventanas emergentes
  const [showReport, setShowReport] = useState(false);

  const fetchPlayers = async () => {
    const { data } = await supabase.from('jugadores').select('*').order('name', { ascending: true });

    if (data) {
      const today = new Date();
      const processedPlayers = data.map((p) => {
        let currentStatus = p.status;
        if (p.status === 'Baja' && p.history && p.history.length > 0) {
          const lastInjury = p.history[p.history.length - 1];
          if (lastInjury && lastInjury.timeLoss > 0 && lastInjury.date) {
            const parts = lastInjury.date.split('/');
            if (parts.length === 3) {
              const injuryDate = new Date(parts[2], parts[1] - 1, parts[0]);
              const daysPassed = Math.floor((today - injuryDate) / (1000 * 60 * 60 * 24));
              if (daysPassed >= lastInjury.timeLoss) currentStatus = 'Apto';
            }
          }
        }
        return { ...p, status: currentStatus };
      });

      const visible = processedPlayers.filter((p) => p.category === activeCategory);
      setPlayers(visible);
    }
  };

  useEffect(() => { fetchPlayers(); }, [user, activeCategory]);

  // Actualizan el estado local mientras tecleas
  const handleMedCommentChange = (id, text) => {
    setPlayers(players.map((p) => (p.id === id ? { ...p, med_comment: text } : p)));
  };
  const handleFisioCommentChange = (id, text) => {
    setPlayers(players.map((p) => (p.id === id ? { ...p, fisio_comment: text } : p)));
  };

  // NUEVO AUTOGUARDADO: Guarda en la nube cuando dejas de escribir (pierde el foco)
  const handleCommentBlur = async (id, field, value) => {
    await supabase.from('jugadores').update({ [field]: value }).eq('id', id);
  };

  const handleStatusOverride = async (id, newStatus) => {
    setPlayers(players.map((p) => (p.id === id ? { ...p, status: newStatus } : p)));
    setEditingStatus(null);
    await supabase.from('jugadores').update({ status: newStatus }).eq('id', id);
  };

  const handleTherapyToggle = async (id, field, currentValue) => {
    if (user.username !== 'lft.mayor2') return;
    const newValue = !currentValue;
    setPlayers(players.map((p) => (p.id === id ? { ...p, [field]: newValue } : p)));
    await supabase.from('jugadores').update({ [field]: newValue }).eq('id', id); // Guarda instantáneamente
  };

  const handleSave = async () => {
    for (const p of players) {
      const hasNotes = p.med_comment || p.fisio_comment;
      const hasTherapy = p.crio_hoy || p.masaje_hoy;

      if (hasNotes || hasTherapy) {
        const notasFormateadas = [];
        if (p.med_comment) notasFormateadas.push(`Médico: ${p.med_comment}`);
        if (p.fisio_comment) notasFormateadas.push(`Fisio: ${p.fisio_comment}`);
        if (p.crio_hoy) notasFormateadas.push(`+ Crioterapia`);
        if (p.masaje_hoy) notasFormateadas.push(`+ Masaje de Descarga`);

        const newEvo = {
          date: new Date().toLocaleDateString('es-ES'),
          note: `Abordaje Diario (${contextoDia}):\n` + notasFormateadas.join('\n'),
        };
        const currentEvo = p.evolution || [];
        
        await supabase.from('jugadores').update({
          evolution: [...currentEvo, newEvo],
          med_comment: '',
          fisio_comment: '',
          crio_hoy: false,
          masaje_hoy: false
        }).eq('id', p.id);
      }
    }

    setSavedSuccess(true);
    fetchPlayers(); // Refresca limpiando pantalla
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  // VISTA PREVIA DEL REPORTE (Nativo, sin ventanas emergentes)
  if (showReport) {
    const bajas = players.filter(p => p.status === 'Baja' || p.status === 'Diferenciado');
    const aptosConNotas = players.filter(p => p.status === 'Apto' && (p.med_comment || p.fisio_comment));
    const enCrio = players.filter(p => p.crio_hoy);
    const enMasaje = players.filter(p => p.masaje_hoy);
    const todosAptos = bajas.length === 0 && aptosConNotas.length === 0 && enCrio.length === 0 && enMasaje.length === 0;

    return (
      <div className="fixed inset-0 bg-white z-50 overflow-y-auto print:absolute print:inset-0">
        <div className="max-w-3xl mx-auto p-8 print:p-0 print:m-0">
          
          {/* BARRA DE HERRAMIENTAS (No se imprime) */}
          <div className="flex flex-col md:flex-row justify-between items-center mb-8 pb-4 border-b print:hidden gap-4 bg-gray-50 p-4 rounded-xl">
            <button onClick={() => setShowReport(false)} className="text-gray-600 font-bold hover:text-red-600 w-full md:w-auto text-center">
              ← Regresar a la Matriz
            </button>
            <p className="text-xs text-gray-500 text-center">Para enviar por WhatsApp, guarda como PDF.</p>
            <button onClick={() => window.print()} className="bg-[#000080] text-white px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg w-full md:w-auto">
              <FileText size={18} /> Imprimir / Guardar PDF
            </button>
          </div>

          {/* CUERPO DEL DOCUMENTO */}
          <div className="font-sans text-gray-900">
            <div className="border-b-4 border-[#000080] pb-4 mb-6">
              <h1 className="text-3xl font-black text-[#000080] uppercase tracking-wide m-0">Comunicaciones F.C.</h1>
              <p className="text-sm text-gray-500 font-bold uppercase tracking-widest mt-1">Departamento Médico - Categoría: {activeCategory}</p>
            </div>
            
            <p className="text-right text-gray-500 text-sm font-bold mb-6">Fecha: {new Date().toLocaleDateString('es-ES')}</p>
            <p className="font-bold text-lg mb-2">Querido Cuerpo Técnico,</p>
            <p className="mb-6 leading-relaxed text-gray-700">A continuación, se detalla el reporte de disponibilidad médica y preventivo correspondiente a la jornada de <strong>{contextoDia}</strong>:</p>

            {todosAptos ? (
              <div className="bg-green-50 border border-green-200 text-green-800 p-6 rounded-xl text-center my-8">
                <h3 className="font-bold text-lg">✅ DÍA SIN INCIDENTES MÉDICOS</h3>
                <p className="mt-2">Todo el plantel se encuentra Apto y a total disposición, sin novedades médicas que reportar.</p>
              </div>
            ) : (
              <>
                {bajas.length > 0 && (
                  <div className="mb-8">
                    <h3 className="text-red-700 border-b-2 border-red-700 pb-1 mb-4 font-bold uppercase">🔴 Jugadores No Disponibles o Diferenciados</h3>
                    {bajas.map(p => {
                      const estadoDesc = p.status === 'Baja' ? 'Baja Médica (No Disponible)' : 'Trabajo Diferenciado';
                      const lastInjury = p.history && p.history.length > 0 ? p.history[p.history.length - 1] : null;
                      const esCronico = lastInjury && Number(lastInjury.timeLoss) > 10;
                      
                      if (esCronico && p.status === 'Baja') {
                        return (
                          <div key={p.id} className="mb-4 p-4 bg-gray-50 border-l-4 border-gray-400">
                            <p className="m-0 text-gray-700"><strong>{p.name} ({p.position}) - Baja Médica Prolongada.</strong><br/>
                            Continúa en su fase de rehabilitación correspondiente, sin fecha de retorno a corto plazo.</p>
                          </div>
                        );
                      }

                      const comments = [];
                      if (p.med_comment) comments.push(`Médico: ${p.med_comment}`);
                      if (p.fisio_comment) comments.push(`Fisio: ${p.fisio_comment}`);
                      const currentManejo = comments.length > 0 ? comments.join(' | ') : 'Manejo médico en curso';

                      return (
                        <div key={p.id} className="mb-4 pb-4 border-b border-dashed border-gray-300">
                          <p className="m-0 text-gray-800 text-lg">
                            <strong>{p.name}</strong> ({p.position}) - <strong>{estadoDesc}</strong>.<br/>
                            <span className="text-base text-gray-600">Abordaje / Observación: <em>{currentManejo}</em></span>
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}

                {aptosConNotas.length > 0 && (
                  <div className="mb-8">
                    <h3 className="text-green-700 border-b-2 border-green-700 pb-1 mb-4 font-bold uppercase">🟢 Jugadores Disponibles (Con Observaciones)</h3>
                    {aptosConNotas.map(p => {
                      const comments = [];
                      if (p.med_comment) comments.push(`Médico: ${p.med_comment}`);
                      if (p.fisio_comment) comments.push(`Fisio: ${p.fisio_comment}`);
                      return (
                        <div key={p.id} className="mb-4 pb-4 border-b border-dashed border-gray-300">
                          <p className="m-0 text-gray-800 text-lg">
                            <strong>{p.name}</strong> ({p.position}) - <strong>Disponible</strong>.<br/>
                            <span className="text-base text-gray-600"><em>{comments.join(' | ')}</em></span>
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}

                {(enCrio.length > 0 || enMasaje.length > 0) && (
                  <div className="mb-8 mt-8 border-t-2 border-[#000080] pt-6 page-break-inside-avoid">
                    <h3 className="text-[#000080] font-bold uppercase mb-4">⚡ Procedimientos de Prevención y Recuperación</h3>
                    <div className="flex flex-col sm:flex-row gap-6">
                      <div className="flex-1 bg-blue-50 p-5 rounded-xl border border-blue-100">
                        <h4 className="text-blue-800 font-bold mb-3 text-lg">❄️ Crioterapia (Tinas)</h4>
                        <ul className="list-disc pl-5 text-blue-900 space-y-1">
                          {enCrio.length > 0 ? enCrio.map(p => <li key={p.id}><strong>{p.name}</strong></li>) : <li className="text-gray-400 list-none -ml-5">Ninguno reportado</li>}
                        </ul>
                      </div>
                      <div className="flex-1 bg-teal-50 p-5 rounded-xl border border-teal-100">
                        <h4 className="text-teal-800 font-bold mb-3 text-lg">💆 Masaje / Descarga</h4>
                        <ul className="list-disc pl-5 text-teal-900 space-y-1">
                          {enMasaje.length > 0 ? enMasaje.map(p => <li key={p.id}><strong>{p.name}</strong></li>) : <li className="text-gray-400 list-none -ml-5">Ninguno reportado</li>}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}

            <p className="text-sm text-gray-500 italic mt-12">* Los jugadores del plantel no mencionados en este documento se encuentran 100% aptos y sin observaciones médicas.</p>
            
            <div className="mt-16 text-center">
              <div className="border-t border-gray-800 w-64 mx-auto pt-2 font-bold">{user.name}</div>
              <div className="text-sm text-gray-500 mt-1">Departamento Médico / Fisioterapia</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const isCT = user.role === 'CT';

  return (
    <div className="p-4 md:p-6 animate-fade-in relative">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-4 border-b pb-4">
        <div>
          <h2 className="text-2xl font-extrabold text-[#000080] flex items-center gap-3">
            <CalendarDays size={28} className="text-blue-600" /> Matriz de Disponibilidad
          </h2>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <select className="border border-gray-300 rounded-xl p-2 text-sm font-bold text-gray-700 bg-white shadow-sm" value={contextoDia} onChange={(e) => setContextoDia(e.target.value)}>
            <option value="Entrenamiento">Entrenamiento</option><option value="Partido Oficial">Partido Oficial</option><option value="Partido Amistoso">Partido Amistoso</option><option value="Recuperación">Recuperación</option>
          </select>
          <button onClick={() => setShowReport(true)} className="bg-white border-2 border-[#000080] text-[#000080] hover:bg-blue-50 px-4 py-2 rounded-xl flex items-center gap-2 font-bold shadow-sm transition-all flex-shrink-0">
            <FileText size={18} /> 1. Ver Reporte PDF
          </button>
        </div>
      </div>

      {availableCategories.length > 1 && (
        <div className="flex flex-wrap gap-2 mb-6 bg-gray-50 p-2 rounded-2xl border border-gray-200">
          {availableCategories.map(cat => (
            <button key={cat} onClick={() => setActiveCategory(cat)} className={`px-5 py-2 rounded-xl text-sm font-bold transition-all ${activeCategory === cat ? 'bg-[#000080] text-white shadow-md' : 'bg-white text-gray-600 hover:bg-blue-50 hover:text-blue-700 border border-gray-200'}`}>
              {cat}
            </button>
          ))}
        </div>
      )}

      {savedSuccess && (
        <div className="mb-4 bg-green-100 border border-green-300 text-green-800 px-4 py-3 rounded-xl flex items-center gap-2 font-bold shadow-sm">
          <CheckCircle size={20} /> Historiales cerrados y tabla limpiada para el día de mañana.
        </div>
      )}

      {players.length === 0 ? (
        <div className="bg-gray-50 p-8 text-center rounded-2xl border border-gray-200 text-gray-500 mt-4">
          <User size={40} className="mx-auto mb-3 text-gray-300" /> No hay jugadores registrados en {activeCategory}.
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead className="bg-gradient-to-r from-[#000080] to-blue-900 text-white">
                <tr>
                  <th className="p-4 font-semibold w-1/5">Jugador</th>
                  <th className="p-4 font-semibold text-center w-1/6">Estado</th>
                  <th className="p-4 font-semibold w-2/5">Notas y Abordaje Clínico de Hoy</th>
                  <th className="p-4 font-semibold text-center w-1/5">Terapias Preventivas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {players.map((p) => {
                  const lastInjury = p.history && p.history.length > 0 ? p.history[p.history.length - 1] : null;
                  const isTherapyDisabled = user.username !== 'lft.mayor2'; 

                  return (
                    <tr key={p.id} className="hover:bg-blue-50/30 transition-colors">
                      <td className="p-4 align-top">
                        <p className="font-bold text-gray-800 text-lg leading-tight">{p.name}</p>
                        <p className="text-xs text-gray-500 font-medium mb-1">{p.category} • {p.position}</p>
                        <span className="inline-flex items-center gap-1 bg-gray-100 text-gray-600 text-[10px] px-2 py-0.5 rounded font-bold border border-gray-200">
                          ⚖️ {p.weight ? `${p.weight} kg` : 'S/P'}
                        </span>
                      </td>

                      <td className="p-4 text-center align-top relative">
                        <div className="flex items-center justify-center gap-2">
                          <span className={`px-4 py-1.5 text-xs rounded-full font-bold shadow-sm border ${p.status === 'Apto' ? 'bg-green-100 text-green-700 border-green-200' : p.status === 'Baja' ? 'bg-red-100 text-red-700 border-red-200' : 'bg-yellow-100 text-yellow-700 border-yellow-200'}`}>
                            {p.status}
                          </span>
                          {user.role === 'DIRECTOR' && (
                            <button onClick={() => setEditingStatus(editingStatus === p.id ? null : p.id)} className="text-gray-400 hover:text-[#000080] transition">
                              <Edit3 size={16} />
                            </button>
                          )}
                        </div>

                        {editingStatus === p.id && user.role === 'DIRECTOR' && (
                          <div className="absolute top-10 left-1/2 -translate-x-1/2 bg-white border shadow-xl rounded-lg p-2 z-10 flex flex-col gap-1 w-32">
                            <button onClick={() => handleStatusOverride(p.id, 'Apto')} className="text-xs font-bold text-green-700 bg-green-50 py-1 rounded">Forzar: Apto</button>
                            <button onClick={() => handleStatusOverride(p.id, 'Diferenciado')} className="text-xs font-bold text-yellow-700 bg-yellow-50 py-1 rounded">Diferenciado</button>
                            <button onClick={() => handleStatusOverride(p.id, 'Baja')} className="text-xs font-bold text-red-700 bg-red-50 py-1 rounded">Baja</button>
                          </div>
                        )}
                      </td>

                      <td className="p-4 align-top">
                        {lastInjury && p.status !== 'Apto' && (
                          <div className="flex items-start gap-1.5 mb-3 text-xs text-red-800 bg-red-50 p-2 rounded-lg border border-red-100">
                            <Activity size={14} className="mt-0.5 flex-shrink-0" />
                            <span className="font-semibold leading-tight">{lastInjury.diagnosis}</span>
                          </div>
                        )}
                        
                        <div className="space-y-2">
                          <div>
                            <label className="text-[10px] font-bold text-blue-800 uppercase pl-1 block mb-0.5">Nota Médica (Dir. Médico)</label>
                            <input
                              type="text"
                              disabled={user.role !== 'DIRECTOR'}
                              placeholder={user.role === 'DIRECTOR' ? "Escribe tu criterio médico..." : "Solo lectura para fisios/CT"}
                              className="w-full border border-gray-200 rounded-lg p-2 text-xs focus:ring-2 focus:ring-blue-400 bg-white disabled:bg-gray-100 disabled:text-gray-600"
                              value={p.med_comment || ''}
                              onChange={(e) => handleMedCommentChange(p.id, e.target.value)}
                              onBlur={(e) => handleCommentBlur(p.id, 'med_comment', e.target.value)}
                            />
                          </div>
                          
                          <div>
                            <label className="text-[10px] font-bold text-teal-800 uppercase pl-1 block mb-0.5">Abordaje Físico (Fisio)</label>
                            <input
                              type="text"
                              disabled={isCT}
                              placeholder={isCT ? "Solo lectura" : "Ej. Descarga en cuádriceps..."}
                              className="w-full border border-gray-200 rounded-lg p-2 text-xs focus:ring-2 focus:ring-teal-400 bg-white disabled:bg-gray-100 disabled:text-gray-600"
                              value={p.fisio_comment || ''}
                              onChange={(e) => handleFisioCommentChange(p.id, e.target.value)}
                              onBlur={(e) => handleCommentBlur(p.id, 'fisio_comment', e.target.value)}
                            />
                          </div>
                        </div>
                      </td>

                      <td className="p-4 align-top">
                        <div className="flex flex-col gap-2 bg-gray-50 border border-gray-200 p-3 rounded-xl shadow-inner">
                          <label className={`flex items-center gap-2 text-xs font-bold transition-opacity ${isTherapyDisabled ? 'opacity-50 cursor-not-allowed' : 'hover:text-blue-600 cursor-pointer'}`}>
                            <input 
                              type="checkbox" 
                              disabled={isTherapyDisabled}
                              checked={p.crio_hoy || false}
                              onChange={() => handleTherapyToggle(p.id, 'crio_hoy', p.crio_hoy || false)}
                              className="w-4 h-4 text-blue-600 rounded disabled:cursor-not-allowed"
                            />
                            <Snowflake size={14} className={p.crio_hoy ? "text-blue-500" : "text-gray-400"} /> Crioterapia
                          </label>
                          
                          <div className="w-full h-px bg-gray-200"></div>

                          <label className={`flex items-center gap-2 text-xs font-bold transition-opacity ${isTherapyDisabled ? 'opacity-50 cursor-not-allowed' : 'hover:text-teal-600 cursor-pointer'}`}>
                            <input 
                              type="checkbox" 
                              disabled={isTherapyDisabled}
                              checked={p.masaje_hoy || false}
                              onChange={() => handleTherapyToggle(p.id, 'masaje_hoy', p.masaje_hoy || false)}
                              className="w-4 h-4 text-teal-600 rounded disabled:cursor-not-allowed"
                            />
                            <Hand size={14} className={p.masaje_hoy ? "text-teal-500" : "text-gray-400"} /> Masaje
                          </label>
                        </div>
                        {isTherapyDisabled && <p className="text-[9px] text-center text-gray-400 mt-1">Exclusivo LFT.Mayor2</p>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          
          {!isCT && (
            <div className="p-4 bg-gray-50 border-t border-gray-200 flex justify-end">
              <button
                onClick={handleSave}
                className="bg-[#000080] hover:bg-blue-900 text-white px-6 py-3 rounded-xl flex items-center gap-2 font-bold shadow-md transition-all"
              >
                <Save size={20} /> 2. Guardar Historial (Cierre de Día)
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
