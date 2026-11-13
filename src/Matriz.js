import React, { useState, useEffect } from 'react';
import {
  CalendarDays,
  Save,
  FileText,
  CheckCircle,
  Edit3,
  User,
  Activity,
  Snowflake,
  Hand
} from 'lucide-react';
import { supabase } from './supabase'; 

export default function Matriz({ user }) {
  const allCats = ['Mayor', 'Especial', 'Cat A', 'Cat B', 'Sub-15', 'Sub-13'];
  const availableCategories = (user.role === 'DIRECTOR' || user.categories?.includes('ALL')) 
    ? allCats 
    : user.categories;

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

      const visible = processedPlayers.filter((p) => p.category === activeCategory);
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

  const generarParteMedico = () => {
    const ventana = window.open('', '_blank');
    
    // Filtramos y separamos por grupos exactos
    const bajas = players.filter(p => p.status === 'Baja' || p.status === 'Diferenciado');
    const aptosConNotas = players.filter(p => p.status === 'Apto' && (p.med_comment || p.fisio_comment));
    const enCrio = players.filter(p => p.crio_hoy);
    const enMasaje = players.filter(p => p.masaje_hoy);

    const todosAptos = bajas.length === 0 && aptosConNotas.length === 0 && enCrio.length === 0 && enMasaje.length === 0;

    let reporteHTML = '';

    if (todosAptos) {
      reporteHTML = `
        <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; color: #166534; padding: 20px; border-radius: 8px; text-align: center; margin: 30px 0;">
          <h3 style="margin: 0; font-size: 18px;">✅ DÍA SIN INCIDENTES MÉDICOS</h3>
          <p style="margin-top: 10px; font-size: 15px;">Todo el plantel se encuentra Apto y a total disposición, sin novedades médicas que reportar.</p>
        </div>
      `;
    } else {
      
      // 1. SECCIÓN DE BAJAS Y DIFERENCIADOS
      if (bajas.length > 0) {
        reporteHTML += `<h3 style="color: #b91c1c; border-bottom: 2px solid #b91c1c; padding-bottom: 5px; text-transform: uppercase;">🔴 Jugadores No Disponibles o Diferenciados</h3>`;
        reporteHTML += bajas.map(p => {
          const estadoDesc = p.status === 'Baja' ? 'Baja Médica (No Disponible)' : 'Trabajo Diferenciado';
          const lastInjury = p.history && p.history.length > 0 ? p.history[p.history.length - 1] : null;
          const esCronico = lastInjury && Number(lastInjury.timeLoss) > 10;

          if (esCronico && p.status === 'Baja') {
            return `
              <div style="margin-bottom: 15px; padding: 10px; background-color: #f8fafc; border-left: 4px solid #94a3b8;">
                <p style="margin: 0; line-height: 1.5; color: #475569;">
                  <strong>${p.name} (${p.position}) - Baja Médica Prolongada.</strong><br/>
                  Continúa en su fase de rehabilitación correspondiente, sin fecha de retorno a corto plazo.
                </p>
              </div>`;
          }

          const comments = [];
          if (p.med_comment) comments.push(`<strong>Médico:</strong> ${p.med_comment}`);
          if (p.fisio_comment) comments.push(`<strong>Fisio:</strong> ${p.fisio_comment}`);
          const currentManejo = comments.length > 0 ? comments.join(' | ') : 'Manejo médico en curso';

          return `
            <div style="margin-bottom: 15px; padding-bottom: 15px; border-bottom: 1px dashed #ccc;">
              <p style="margin: 0 0 5px 0; line-height: 1.6;">
                <strong>${p.name}</strong> (${p.position}) - <strong>${estadoDesc}</strong>.<br/> 
                Abordaje / Observación: <em>${currentManejo}</em>
              </p>
            </div>`;
        }).join('');
      }

      // 2. SECCIÓN DE JUGADORES APTOS PERO CON COMENTARIO
      if (aptosConNotas.length > 0) {
        reporteHTML += `<h3 style="color: #15803d; border-bottom: 2px solid #15803d; padding-bottom: 5px; margin-top: 30px; text-transform: uppercase;">🟢 Jugadores Disponibles (Con Observaciones)</h3>`;
        reporteHTML += aptosConNotas.map(p => {
          const comments = [];
          if (p.med_comment) comments.push(`<strong>Médico:</strong> ${p.med_comment}`);
          if (p.fisio_comment) comments.push(`<strong>Fisio:</strong> ${p.fisio_comment}`);
          
          return `
            <div style="margin-bottom: 15px; padding-bottom: 15px; border-bottom: 1px dashed #ccc;">
              <p style="margin: 0 0 5px 0; line-height: 1.6;">
                <strong>${p.name}</strong> (${p.position}) - <strong>Disponible</strong>.<br/> 
                <em>${comments.join(' | ')}</em>
              </p>
            </div>`;
        }).join('');
      }

      // 3. SECCIÓN DE LISTAS DE PROCEDIMIENTOS (CRIO Y MASAJE)
      if (enCrio.length > 0 || enMasaje.length > 0) {
        reporteHTML += `<h3 style="color: #000080; border-bottom: 2px solid #000080; padding-bottom: 5px; margin-top: 30px; text-transform: uppercase;">⚡ Procedimientos de Prevención y Recuperación</h3>`;
        
        reporteHTML += `<div style="display: flex; gap: 20px; margin-top: 15px;">`;
        
        // Tabla Crio
        reporteHTML += `<div style="flex: 1; background: #f0f9ff; padding: 15px; border-radius: 8px; border: 1px solid #bae6fd;">`;
        reporteHTML += `<h4 style="margin-top: 0; margin-bottom: 10px; color: #0369a1;">❄️ Lista de Crioterapia</h4>`;
        reporteHTML += `<ul style="margin: 0; padding-left: 20px; font-size: 14px; color: #1e3a8a;">`;
        if (enCrio.length > 0) {
          enCrio.forEach(p => { reporteHTML += `<li><strong>${p.name}</strong></li>`; });
        } else {
          reporteHTML += `<li>Ninguno reportado</li>`;
        }
        reporteHTML += `</ul></div>`;

        // Tabla Masaje
        reporteHTML += `<div style="flex: 1; background: #f0fdfa; padding: 15px; border-radius: 8px; border: 1px solid #99f6e4;">`;
        reporteHTML += `<h4 style="margin-top: 0; margin-bottom: 10px; color: #0f766e;">💆 Lista de Masaje / Descarga</h4>`;
        reporteHTML += `<ul style="margin: 0; padding-left: 20px; font-size: 14px; color: #134e4a;">`;
        if (enMasaje.length > 0) {
          enMasaje.forEach(p => { reporteHTML += `<li><strong>${p.name}</strong></li>`; });
        } else {
          reporteHTML += `<li>Ninguno reportado</li>`;
        }
        reporteHTML += `</ul></div>`;

        reporteHTML += `</div>`; // Cierre del flex
      }
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
        
        <p style="text-align: right; color: #6b7280; font-size: 14px;"><strong>Fecha:</strong> ${new Date().toLocaleDateString('es-ES')}</p>
        <p style="font-size: 16px; font-weight: bold; margin-top: 30px;">Querido Cuerpo Técnico,</p>
        <p style="font-size: 15px; line-height: 1.6; margin-bottom: 30px;">A continuación, se detalla el reporte de disponibilidad médica y preventivo correspondiente a la jornada de <strong>${contextoDia}</strong>:</p>

        ${reporteHTML}

        <p style="font-size: 14px; margin-top: 30px; color: #4b5563; font-style: italic;">* Los jugadores del plantel no mencionados en este documento se encuentran 100% aptos y sin observaciones médicas.</p>

        <div class="footer">
          <div class="signature">${user.name}</div>
          <div style="font-size: 12px; color: #6b7280; margin-top: 4px;">Departamento Médico / Fisioterapia</div>
        </div>
        <script>window.onload = function() { setTimeout(function() { window.print(); }, 500); }</script>
      </body></html>
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
            <FileText size={18} /> 1. Generar Reporte PDF
          </button>
        </div>
      </div>

      {availableCategories.length > 1 && (
        <div className="flex flex-wrap gap-2 mb-6 bg-gray-50 p-2 rounded-2xl border border-gray-200">
          {availableCategories.map(cat => (
            <button 
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-5 py-2 rounded-xl text-sm font-bold transition-all ${
                activeCategory === cat 
                ? 'bg-[#000080] text-white shadow-md' 
                : 'bg-white text-gray-600 hover:bg-blue-50 hover:text-blue-700 border border-gray-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {savedSuccess && (
        <div className="mb-4 bg-green-100 border border-green-300 text-green-800 px-4 py-3 rounded-xl flex items-center gap-2 font-bold shadow-sm">
          <CheckCircle size={20} /> Datos guardados en historiales clínicos y tabla limpiada.
        </div>
      )}

      {players.length === 0 ? (
        <div className="bg-gray-50 p-8 text-center rounded-2xl border border-gray-200 text-gray-500 mt-4">
          <User size={40} className="mx-auto mb-3 text-gray-300" /> No hay jugadores registrados en la categoría {activeCategory}.
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
