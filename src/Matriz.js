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

      // LÓGICA DE CONVOCATORIA: Muestra los de la categoría activa, Y si estás en la Mayor, muestra también a los "convocados"
      const visible = processedPlayers.filter((p) => {
        if (activeCategory === 'Mayor') {
          return p.category === 'Mayor' || p.convocado === true;
        }
        return p.category === activeCategory;
      });
      setPlayers(visible);
    }
  };

  useEffect(() => { fetchPlayers(); }, [user, activeCategory]);

  const handleMedCommentChange = (id, text) => {
    setPlayers(players.map((p) => (p.id === id ? { ...p, med_comment: text } : p)));
  };
  const handleFisioCommentChange = (id, text) => {
    setPlayers(players.map((p) => (p.id === id ? { ...p, fisio_comment: text } : p)));
  };

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
    await supabase.from('jugadores').update({ [field]: newValue }).eq('id', id);
  };

  // BOTÓN DE CIERRE EXCLUSIVO PARA EL DIRECTOR
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
    fetchPlayers();
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  // GENERADOR DE PDF OPTIMIZADO PARA MÓVILES (TAMAÑO A4)
  const generarParteMedico = () => {
    const ventana = window.open('', '_blank');
    
    const bajas = players.filter(p => p.status === 'Baja' || p.status === 'Diferenciado');
    const aptosConNotas = players.filter(p => p.status === 'Apto' && (p.med_comment || p.fisio_comment));
    const enCrio = players.filter(p => p.crio_hoy);
    const enMasaje = players.filter(p => p.masaje_hoy);

    const todosAptos = bajas.length === 0 && aptosConNotas.length === 0 && enCrio.length === 0 && enMasaje.length === 0;

    let reporteHTML = '';

    if (todosAptos) {
      reporteHTML = `
        <div class="no-print" style="margin-bottom:20px;">✅ Sin incidentes. Todo el plantel está apto.</div>
        <h3 style="text-align:center; color: #166534; padding: 20px; border: 1px solid #bbf7d0; background: #f0fdf4; border-radius: 8px;">
          DÍA SIN INCIDENTES MÉDICOS<br/><br/>
          <span style="font-size:12pt; font-weight:normal;">Todo el plantel se encuentra Apto y a total disposición, sin novedades médicas que reportar.</span>
        </h3>
      `;
    } else {
      if (bajas.length > 0) {
        reporteHTML += `<h3 style="color: #b91c1c; border-bottom: 2px solid #b91c1c; padding-bottom: 5px; text-transform: uppercase;">🔴 Jugadores No Disponibles o Diferenciados</h3>`;
        reporteHTML += bajas.map(p => {
          const estadoDesc = p.status === 'Baja' ? 'Baja Médica' : 'Trabajo Diferenciado';
          const lastInjury = p.history && p.history.length > 0 ? p.history[p.history.length - 1] : null;
          const esCronico = lastInjury && Number(lastInjury.timeLoss) > 10;
          const tagConvocado = p.convocado ? ` <em>(Convocado)</em>` : '';

          if (esCronico && p.status === 'Baja') {
            return `
              <div class="section" style="background-color: #f8fafc; border-left: 4px solid #94a3b8; padding-left: 10px;">
                <p><strong>${p.name} (${p.position})${tagConvocado} - Baja Médica Prolongada.</strong><br/>
                Continúa en su fase de rehabilitación, sin fecha de retorno a corto plazo.</p>
              </div>`;
          }

          const comments = [];
          if (p.med_comment) comments.push(`<strong>Médico:</strong> ${p.med_comment}`);
          if (p.fisio_comment) comments.push(`<strong>Fisio:</strong> ${p.fisio_comment}`);
          const currentManejo = comments.length > 0 ? comments.join(' | ') : 'Manejo médico en curso';

          return `
            <div class="section">
              <p><strong>${p.name}</strong> (${p.position})${tagConvocado} - <strong>${estadoDesc}</strong>.<br/> 
              Abordaje / Observación: <em>${currentManejo}</em></p>
            </div>`;
        }).join('');
      }

      if (aptosConNotas.length > 0) {
        reporteHTML += `<h3 style="color: #15803d; border-bottom: 2px solid #15803d; padding-bottom: 5px; margin-top: 25px; text-transform: uppercase;">🟢 Jugadores Disponibles (Con Observaciones)</h3>`;
        reporteHTML += aptosConNotas.map(p => {
          const comments = [];
          const tagConvocado = p.convocado ? ` <em>(Convocado)</em>` : '';
          if (p.med_comment) comments.push(`<strong>Médico:</strong> ${p.med_comment}`);
          if (p.fisio_comment) comments.push(`<strong>Fisio:</strong> ${p.fisio_comment}`);
          return `
            <div class="section">
              <p><strong>${p.name}</strong> (${p.position})${tagConvocado} - <strong>Disponible</strong>.<br/> 
              <em>${comments.join(' | ')}</em></p>
            </div>`;
        }).join('');
      }

      if (enCrio.length > 0 || enMasaje.length > 0) {
        reporteHTML += `
          <div style="margin-top: 30px; page-break-inside: avoid;">
            <h3 style="color: #000080; border-bottom: 2px solid #000080; padding-bottom: 5px; text-transform: uppercase;">⚡ Terapias y Prevención</h3>
            <div class="grid">
              <div class="col" style="background: #f0f9ff; border: 1px solid #bae6fd;">
                <h4 style="margin:0 0 10px 0; color: #0369a1;">❄️ Crioterapia</h4>
                <ul>
                  ${enCrio.length > 0 ? enCrio.map(p => `<li><strong>${p.name}</strong>${p.convocado ? ' <em>(C)</em>' : ''}</li>`).join('') : '<li style="color:#9ca3af;">Ninguno</li>'}
                </ul>
              </div>
              <div class="col" style="background: #f0fdfa; border: 1px solid #99f6e4;">
                <h4 style="margin:0 0 10px 0; color: #0f766e;">💆 Masaje / Descarga</h4>
                <ul>
                  ${enMasaje.length > 0 ? enMasaje.map(p => `<li><strong>${p.name}</strong>${p.convocado ? ' <em>(C)</em>' : ''}</li>`).join('') : '<li style="color:#9ca3af;">Ninguno</li>'}
                </ul>
              </div>
            </div>
          </div>
        `;
      }
    }

    // CSS OPTIMIZADO PARA A4 Y MÓVILES
    const baseCSS = `
      @page { size: A4; margin: 15mm; }
      body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 20px; color: #1f2937; max-width: 100%; margin: 0; font-size: 11pt; -webkit-print-color-adjust: exact; }
      .header { border-bottom: 2px solid #000080; padding-bottom: 10px; margin-bottom: 20px; }
      .title { color: #000080; font-size: 16pt; font-weight: 900; margin: 0; text-transform: uppercase; letter-spacing: 1px; }
      .subtitle { color: #6b7280; font-size: 9pt; text-transform: uppercase; letter-spacing: 2px; margin-top: 5px; font-weight: bold; }
      .footer { margin-top: 40px; text-align: center; page-break-inside: avoid; }
      .signature { border-top: 1px solid #1f2937; width: 200px; margin: 0 auto; padding-top: 5px; font-weight: bold; font-size: 10pt; }
      .no-print { text-align: center; margin-bottom: 15px; padding: 10px; background-color: #fef08a; border: 1px solid #fde047; color: #854d0e; font-size: 10pt; border-radius: 5px; font-weight: bold; }
      @media print { .no-print { display: none; } body { padding: 0; } }
      h3 { font-size: 12pt; margin-top: 15px; margin-bottom: 10px; }
      p { margin: 0 0 5px 0; line-height: 1.4; }
      .section { margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px dashed #e5e7eb; }
      .grid { display: flex; gap: 15px; margin-top: 10px; width: 100%; }
      .col { flex: 1; padding: 12px; border-radius: 6px; }
      ul { margin: 0; padding-left: 20px; }
      li { margin-bottom: 4px; font-size: 10pt; }
    `;

    ventana.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Parte Médico - ${activeCategory}</title>
        <style>${baseCSS}</style>
      </head>
      <body>
        <div class="no-print">👆 Para enviar por WhatsApp: Haz clic en las opciones de tu navegador y selecciona "Compartir" -> "Imprimir" -> "Guardar como PDF".</div>
        <div class="header">
          <h1 class="title">Comunicaciones F.C.</h1>
          <p class="subtitle">Departamento Médico - Categoría: ${activeCategory}</p>
        </div>
        
        <p style="text-align: right; color: #6b7280; font-size: 10pt; font-weight:bold;">Fecha: ${new Date().toLocaleDateString('es-ES')}</p>
        <p style="font-size: 11pt; font-weight: bold; margin-top: 20px;">Cuerpo Técnico,</p>
        <p style="font-size: 11pt; line-height: 1.5; margin-bottom: 20px;">A continuación, se detalla el reporte de disponibilidad médica y preventivo correspondiente a la jornada de <strong>${contextoDia}</strong>:</p>

        ${reporteHTML}

        <p style="font-size: 9pt; margin-top: 30px; color: #6b7280; font-style: italic;">* Los jugadores del plantel no mencionados en este documento se encuentran 100% aptos y sin observaciones médicas.</p>

        <div class="footer">
          <div class="signature">${user.name}</div>
          <div style="font-size: 9pt; color: #6b7280; margin-top: 4px;">Departamento Médico / Fisioterapia</div>
        </div>
        <script>window.onload = function() { setTimeout(function() { window.print(); }, 800); }</script>
      </body>
      </html>
    `);
    ventana.document.close();
  };

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
          <button onClick={generarParteMedico} className="bg-white border-2 border-[#000080] text-[#000080] hover:bg-blue-50 px-4 py-2 rounded-xl flex items-center gap-2 font-bold shadow-sm transition-all flex-shrink-0">
            <FileText size={18} /> Generar Reporte PDF
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
          <CheckCircle size={20} /> Historiales cerrados y tabla limpiada exitosamente.
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
                        <div className="flex items-center flex-wrap gap-1 mt-1 mb-1">
                          <p className="text-xs text-gray-500 font-medium">{p.category} • {p.position}</p>
                          {/* ETIQUETA DE CONVOCADO */}
                          {p.convocado && activeCategory === 'Mayor' && (
                            <span className="bg-purple-100 text-purple-700 text-[9px] px-1.5 py-0.5 rounded font-bold uppercase shadow-sm">
                              Convocado
                            </span>
                          )}
                        </div>
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
          
          {/* BOTÓN DE CIERRE EXCLUSIVO PARA EL DIRECTOR */}
          {user.role === 'DIRECTOR' && (
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
