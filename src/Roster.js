import React, { useState, useEffect } from 'react';
import {
  ShieldAlert, Send, Activity, User, Plus, X, Mic, FileSearch, Search,
  Printer, Download, Phone, Paperclip, FileText, Edit, Camera, Edit2, ArrowUp, Star
} from 'lucide-react';
import { supabase } from './supabase'; 

const ZONAS_ANATOMICAS = [
  'Cabeza', 'Cuello', 'Hombro', 'Pecho', 'Abdomen', 'Espalda', 'Ingle/Pubis',
  'Muslo (Cuádriceps)', 'Muslo (Isquiotibial)', 'Rodilla', 'Pantorrilla', 'Tobillo', 'Pie'
];

export default function Roster({ user, categoryFilter }) {
  const defaultCat = user.role === 'DIRECTOR' || user.role === 'CT' || user.categories?.includes('ALL') ? 'Mayor' : user.categories[0];

  const [players, setPlayers] = useState([]);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const [showNewPlayer, setShowNewPlayer] = useState(false);
  const [showEditPlayer, setShowEditPlayer] = useState(false);
  const [showNewInjury, setShowNewInjury] = useState(false);
  const [showEditInjury, setShowEditInjury] = useState(false);
  const [showExams, setShowExams] = useState(false);
  const [showEvolution, setShowEvolution] = useState(false);
  const [showWeight, setShowWeight] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const [newPlayerForm, setNewPlayerForm] = useState({
    name: '', dorsal: '', phone: '', category: defaultCat, position: 'Defensa', weight: '', height: '', background: '', photo_url: ''
  });

  const [editPlayerForm, setEditPlayerForm] = useState({});
  
  const [newInjuryForm, setNewInjuryForm] = useState({
    date: '', diagnosis: '', area: '', historyText: '', treatment: '', medId: '', medQty: '', timeLoss: '0', context: 'Entrenamiento', laterality: 'N/A', relapse: false, interconsulta: false,
  });

  const [editInjuryForm, setEditInjuryForm] = useState({});
  const [editingInjuryIndex, setEditingInjuryIndex] = useState(null);
  
  const [newEvolution, setNewEvolution] = useState('');
  const [attachedFile, setAttachedFile] = useState('');
  const [newWeight, setNewWeight] = useState('');
  const [examForm, setExamForm] = useState({
    sospecha: '', tratamiento: '', mri: false, usg: false, rx: false,
  });

  const [filteredZonas, setFilteredZonas] = useState([]);
  const [isRecording, setIsRecording] = useState(false);
  const [categoryMeds, setCategoryMeds] = useState([]); 

  const fetchPlayers = async () => {
    const { data } = await supabase.from('jugadores').select('*').order('name', { ascending: true });
    if (data) setPlayers(data);
  };

  useEffect(() => { fetchPlayers(); }, []);

  useEffect(() => {
    if (showNewInjury && selectedPlayer) {
      const fetchMeds = async () => {
        const { data } = await supabase.from('kardex_categorias').select('*').eq('category', selectedPlayer.category).gt('quantity', 0);
        setCategoryMeds(data || []);
      };
      fetchMeds();
    }
  }, [showNewInjury, selectedPlayer]);

  const canAddPlayer = user.role === 'DIRECTOR' || user.role === 'FISIO';

  const handlePhotoUpload = async (e, setFormFunc) => {
    const file = e.target.files[0];
    if (!file) return;

    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}.${fileExt}`;
    const filePath = `${fileName}`;

    setIsUploading(true);
    const { error: uploadError } = await supabase.storage.from('perfiles').upload(filePath, file);
    
    if (uploadError) {
      alert('Error subiendo imagen: ' + uploadError.message);
      setIsUploading(false);
    } else {
      const { data } = supabase.storage.from('perfiles').getPublicUrl(filePath);
      setFormFunc(prev => ({ ...prev, photo_url: data.publicUrl }));
      setIsUploading(false);
    }
  };

  const handleAddPlayer = async (e) => {
    e.preventDefault();
    const newPlayer = {
      ...newPlayerForm,
      dorsal: newPlayerForm.dorsal ? Number(newPlayerForm.dorsal) : null,
      weight: newPlayerForm.weight ? Number(newPlayerForm.weight) : null,
      height: newPlayerForm.height ? Number(newPlayerForm.height) : null,
      status: 'Apto', history: [], evolution: [], convocado: false,
      weightHistory: newPlayerForm.weight ? [{ date: new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }), weight: Number(newPlayerForm.weight) }] : [],
    };

    const { data } = await supabase.from('jugadores').insert([newPlayer]).select();
    if (data) {
      setPlayers([...players, data[0]]);
      setShowNewPlayer(false);
      setNewPlayerForm({ name: '', dorsal: '', phone: '', category: defaultCat, position: 'Defensa', weight: '', height: '', background: '', photo_url: '' });
    }
  };

  const handleUpdatePlayer = async (e) => {
    e.preventDefault();
    const updatedData = {
      name: editPlayerForm.name,
      dorsal: editPlayerForm.dorsal ? Number(editPlayerForm.dorsal) : null,
      phone: editPlayerForm.phone || '', category: editPlayerForm.category, position: editPlayerForm.position,
      weight: editPlayerForm.weight ? Number(editPlayerForm.weight) : null, height: editPlayerForm.height ? Number(editPlayerForm.height) : null, background: editPlayerForm.background || '', photo_url: editPlayerForm.photo_url || '',
    };

    const { data } = await supabase.from('jugadores').update(updatedData).eq('id', selectedPlayer.id).select();
    if (data) {
      setPlayers(players.map((p) => (p.id === selectedPlayer.id ? data[0] : p)));
      setSelectedPlayer(data[0]); setShowEditPlayer(false);
    }
  };

  // NUEVO: Función para alternar la convocatoria a la Mayor
  const handleToggleConvocatoria = async () => {
    const newValue = !selectedPlayer.convocado;
    const { data } = await supabase.from('jugadores').update({ convocado: newValue }).eq('id', selectedPlayer.id).select();
    if (data) {
      setSelectedPlayer(data[0]);
      setPlayers(players.map(p => p.id === data[0].id ? data[0] : p));
    }
  };

  const handleAddInjury = async (e) => {
    e.preventDefault();
    let medName = '';
    if (newInjuryForm.medId && newInjuryForm.medQty > 0) {
      const itemToUse = categoryMeds.find((i) => i.id === Number(newInjuryForm.medId));
      if (itemToUse) {
        medName = itemToUse.name;
        const newQty = itemToUse.quantity - Number(newInjuryForm.medQty);
        await supabase.from('kardex_categorias').update({ quantity: newQty }).eq('id', itemToUse.id);
      }
    }

    const fechaHoy = new Date().toLocaleDateString('es-ES');
    const lesionParaGuardar = { ...newInjuryForm, date: fechaHoy, medName, medQty: newInjuryForm.medQty, interconsulta: newInjuryForm.interconsulta };
    const currentHistory = selectedPlayer.history || [];
    const updatedHistory = [...currentHistory, lesionParaGuardar];
    const newStatus = Number(newInjuryForm.timeLoss) > 0 ? 'Baja' : 'Apto';

    const { data } = await supabase.from('jugadores').update({ history: updatedHistory, status: newStatus }).eq('id', selectedPlayer.id).select();
    if (data) {
      setPlayers(players.map((p) => (p.id === selectedPlayer.id ? data[0] : p)));
      setSelectedPlayer(data[0]); 
    }
    setShowNewInjury(false);
    setNewInjuryForm({ date: '', diagnosis: '', area: '', historyText: '', treatment: '', medId: '', medQty: '', timeLoss: '0', context: 'Entrenamiento', laterality: 'N/A', relapse: false, interconsulta: false });
  };

  const handleUpdateInjury = async (e) => {
    e.preventDefault();
    let updatedHistory = [...(selectedPlayer.history || [])];
    updatedHistory[editingInjuryIndex] = editInjuryForm;
    
    const activeInjuries = updatedHistory.filter(h => Number(h.timeLoss) > 0);
    const newStatus = activeInjuries.length > 0 ? 'Baja' : 'Apto';

    const { data } = await supabase.from('jugadores').update({ history: updatedHistory, status: newStatus }).eq('id', selectedPlayer.id).select();
    if (data) {
      setPlayers(players.map((p) => (p.id === selectedPlayer.id ? data[0] : p)));
      setSelectedPlayer(data[0]);
    }
    setShowEditInjury(false);
  };

  const handleAddEvolution = async (e) => {
    e.preventDefault();
    const newEvo = { date: new Date().toLocaleDateString('es-ES'), note: newEvolution, file: attachedFile };
    const currentEvo = selectedPlayer.evolution || [];
    const { data } = await supabase.from('jugadores').update({ evolution: [...currentEvo, newEvo] }).eq('id', selectedPlayer.id).select();
    if (data) {
      setPlayers(players.map((p) => (p.id === selectedPlayer.id ? data[0] : p)));
      setSelectedPlayer(data[0]);
    }
    setNewEvolution(''); setAttachedFile(''); setShowEvolution(false);
  };

  const handleAddWeight = async (e) => {
    e.preventDefault();
    const newWeightEntry = { date: new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }), weight: Number(newWeight) };
    const currentHistory = selectedPlayer.weightHistory || [];
    const { data } = await supabase.from('jugadores').update({ weight: Number(newWeight), weightHistory: [...currentHistory, newWeightEntry] }).eq('id', selectedPlayer.id).select();
    if (data) {
      setPlayers(players.map((p) => (p.id === selectedPlayer.id ? data[0] : p)));
      setSelectedPlayer(data[0]);
    }
    setNewWeight(''); setShowWeight(false);
  };

  const generarPDF = (tipo, data) => {
    const ventana = window.open('', '_blank');
    let contenido = '';

    if (tipo === 'examen') {
      const examenesList = [];
      if (examForm.mri) examenesList.push('Resonancia Magnética (MRI)');
      if (examForm.usg) examenesList.push('Ultrasonido Musculoesquelético');
      if (examForm.rx) examenesList.push('Rayos X / Radiografía');
      const estudiosHTML = examenesList.length > 0 ? examenesList.map((e) => `<li>${e}</li>`).join('') : '<li>Evaluación Especializada / Gabinete</li>';

      contenido = `
        <p style="text-align: right; color: #6b7280; font-size: 14px;"><strong>Fecha:</strong> ${new Date().toLocaleDateString('es-ES')}</p>
        <div style="margin-top: 20px; font-size: 15px; line-height: 1.6;">
          <p><strong>A: Cristian Caceres, Presidente del Club y H. Junta Directiva</strong><br/>
          <strong>De: Dr. Angel Roldan, Director Médico</strong></p><br/>
          <p>Buenos días,</p>
          <p>Por medio de la presente me permito explicar e informar que el jugador <strong>${selectedPlayer.name}</strong>, perteneciente al plantel <strong>${selectedPlayer.category}</strong>, presenta actualmente la siguiente condición y/o sospecha clínica:</p>
          <div style="background-color: #f9fafb; border-left: 4px solid #000080; padding: 12px; margin: 15px 0;">
            <em>"${examForm.sospecha || 'Molestia aguda en evaluación clínica'}"</em>
          </div>
          <p>Debido a este cuadro, el jugador actualmente tiene instaurado el siguiente tratamiento y abordaje médico:</p>
          <div style="background-color: #f9fafb; border-left: 4px solid #000080; padding: 12px; margin: 15px 0;">
            <em>"${examForm.tratamiento || 'Terapia conservadora y observación'}"</em>
          </div>
          <p>Para poder confirmar el alcance exacto de la lesión, emitir un diagnóstico definitivo y proyectar correctamente su tiempo de baja, <strong>se solicita formalmente la autorización para realizar el/los siguiente(s) examen(es):</strong></p>
          <ul style="font-weight: bold; color: #1f2937;">${estudiosHTML}</ul>
          <p>Quedo a su entera disposición para cualquier duda sobre el caso.</p>
        </div>`;
    } else {
      contenido = `
        <div style="text-align: center; font-size: 20px; font-weight: bold; margin: 30px 0; text-transform: uppercase;">REPORTE MÉDICO DE LESIÓN Y ABORDAJE</div>
        <div style="display:flex; gap: 20px; margin-bottom: 20px;">
          <div style="flex:1"><div style="font-size:10px; color:#6b7280; text-transform:uppercase;">Nombre</div><div style="font-size:15px; font-weight:bold; border-bottom:1px solid #e5e7eb;">${selectedPlayer.name}</div></div>
          <div style="flex:1"><div style="font-size:10px; color:#6b7280; text-transform:uppercase;">Fecha Evento</div><div style="font-size:15px; font-weight:bold; border-bottom:1px solid #e5e7eb;">${data.date}</div></div>
        </div>
        <div style="margin-bottom: 20px;">
          <p><strong>Diagnóstico:</strong> <span style="color:#b91c1c;">${data.diagnosis}</span></p>
          <p><strong>Zona Anatómica:</strong> ${data.area} (${data.laterality}) | <strong>Time-Loss:</strong> ${data.timeLoss} días</p>
        </div>
        <div style="border: 1px solid #e5e7eb; padding: 15px; background-color: #f9fafb; margin-bottom: 15px;">
          <strong>Historia Clínica:</strong><br/>${data.historyText}
        </div>
        <div style="border: 1px solid #e5e7eb; padding: 15px; background-color: #f9fafb;">
          <strong>Abordaje:</strong><br/>${data.treatment}
          ${data.medName ? `<br/><br/><strong>Insumos:</strong> ${data.medQty}x ${data.medName}` : ''}
        </div>`;
    }

    const baseCSS = `
      body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 40px; color: #1f2937; max-width: 800px; margin: 0 auto; }
      .header { border-bottom: 3px solid #000080; padding-bottom: 15px; margin-bottom: 20px; }
      .title { color: #000080; font-size: 22px; font-weight: 900; margin: 0; text-transform: uppercase; letter-spacing: 1px; }
      .subtitle { color: #6b7280; font-size: 11px; text-transform: uppercase; letter-spacing: 2px; margin-top: 5px; font-weight: bold; }
      .footer { margin-top: 80px; text-align: center; }
      .signature { border-top: 1px solid #1f2937; width: 250px; margin: 0 auto; padding-top: 10px; font-weight: bold; font-size: 14px; }
      .no-print { text-align: center; margin-bottom: 20px; padding: 10px; background-color: #f0fdf4; border: 1px solid #bbf7d0; color: #166534; font-size: 14px; border-radius: 5px; }
      @media print { .no-print { display: none; } }
    `;

    ventana.document.write(`
      <html><head><title>Documento Médico - ${selectedPlayer.name}</title><style>${baseCSS}</style></head>
      <body>
        <div class="no-print"><strong>Para enviar por WhatsApp/Email:</strong> Imprime y selecciona "Guardar como PDF".</div>
        <div class="header"><h1 class="title">Comunicaciones F.C.</h1><p class="subtitle">Departamento de Ciencias Médicas y Rendimiento Deportivo</p></div>
        ${contenido}
        <div class="footer"><div class="signature">Dr. Angel Miguel Roldan Ramirez</div><div style="font-size: 12px; color: #6b7280; margin-top: 4px;">Director Médico</div></div>
        <script>window.onload = function() { setTimeout(function() { window.print(); }, 800); }</script>
      </body></html>
    `);
    ventana.document.close();
  };

  const startDictation = (setFormFunc) => {
    if ('webkitSpeechRecognition' in window) {
      const recognition = new window.webkitSpeechRecognition();
      recognition.lang = 'es-ES';
      setIsRecording(true);
      recognition.onresult = (e) => {
        setFormFunc((prev) => ({
          ...prev,
          historyText: prev.historyText ? `${prev.historyText} ${e.results[0][0].transcript}` : e.results[0][0].transcript,
        }));
        setIsRecording(false);
      };
      recognition.start();
    } else alert('Dictado por voz requiere Google Chrome.');
  };

  const handleZonaChange = (e, formState, setFormFunc) => {
    const text = e.target.value;
    setFormFunc({ ...formState, area: text });
    if (text.length > 0)
      setFilteredZonas(ZONAS_ANATOMICAS.filter((z) => z.toLowerCase().includes(text.toLowerCase())));
    else setFilteredZonas([]);
  };

  const visiblePlayers = players.filter((p) => {
    const hasCategoryAccess = user.categories.includes('ALL') || user.categories.includes(p.category);
    const matchesMenu = categoryFilter === 'Todas' || p.category === categoryFilter;
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
    return hasCategoryAccess && matchesMenu && matchesSearch;
  });

  if (selectedPlayer) {
    const pEvo = selectedPlayer.evolution || [];
    const pHist = selectedPlayer.history || [];
    const pWeightHist = selectedPlayer.weightHistory || [];

    return (
      <div className="p-4 md:p-6 relative animate-fade-in">
        <div className="flex justify-between items-center mb-4">
          <button onClick={() => setSelectedPlayer(null)} className="text-[#000080] font-bold">
            ← Volver al Roster
          </button>
          {(user.role === 'DIRECTOR' || user.role === 'FISIO') && (
            <button 
              onClick={() => { setEditPlayerForm(selectedPlayer); setShowEditPlayer(true); }} 
              className="text-gray-500 hover:text-blue-600 font-bold flex items-center gap-1 text-sm bg-gray-100 hover:bg-blue-50 px-3 py-1.5 rounded-lg transition"
            >
              <Edit size={16} /> Editar Perfil
            </button>
          )}
        </div>
        
        <div className="bg-white p-6 rounded-2xl shadow-sm mb-6 border border-gray-200">
          <div className="flex flex-col md:flex-row justify-between items-start gap-4">
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 md:w-24 md:h-24 bg-gray-100 border border-gray-200 rounded-full overflow-hidden flex-shrink-0 shadow-sm flex items-center justify-center">
                {selectedPlayer.photo_url ? (
                  <img src={selectedPlayer.photo_url} alt={selectedPlayer.name} className="w-full h-full object-cover" />
                ) : (
                  <User size={40} className="text-gray-300" />
                )}
              </div>
              <div>
                <h2 className="text-3xl font-extrabold text-[#000080]">
                  <span className="text-gray-400 mr-2">#{selectedPlayer.dorsal || 'N/A'}</span>{selectedPlayer.name}
                </h2>
                <div className="flex items-center gap-2 mb-2">
                  <p className="text-gray-500 font-medium">{selectedPlayer.category} | {selectedPlayer.position}</p>
                </div>
                
                <div className="flex items-center gap-3">
                  <span className={`px-4 py-1.5 rounded-full font-bold shadow-sm text-sm ${selectedPlayer.status === 'Apto' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {selectedPlayer.status}
                  </span>
                  
                  {/* BOTÓN MÁGICO DE CONVOCATORIA */}
                  {selectedPlayer.category !== 'Mayor' && (user.role === 'DIRECTOR' || user.role === 'FISIO') && (
                    <button
                      onClick={handleToggleConvocatoria}
                      className={`text-xs font-bold px-3 py-1.5 rounded-full border transition-all flex items-center gap-1 ${
                        selectedPlayer.convocado 
                          ? 'bg-purple-100 text-purple-700 border-purple-300 shadow-sm' 
                          : 'bg-white text-gray-500 border-gray-300 hover:bg-purple-50 hover:text-purple-600'
                      }`}
                    >
                      {selectedPlayer.convocado ? <><Star size={14} /> Convocado a Mayor</> : <><ArrowUp size={14} /> Convocar a Mayor</>}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6 mb-6">
            <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 relative group">
              <p className="text-xs text-blue-600 font-bold uppercase mb-1">Peso Actual</p>
              <p className="font-bold text-gray-800 text-2xl mb-2">{selectedPlayer.weight || '-'} kg</p>
              <div className="h-16 flex items-end justify-between gap-1 pt-4 border-t border-blue-200/50 mt-2">
                {pWeightHist.slice(-5).map((w, idx, arr) => {
                  const min = Math.min(...arr.map((a) => a.weight)) - 2;
                  const max = Math.max(...arr.map((a) => a.weight)) + 2;
                  const height = Math.max(15, ((w.weight - min) / (max - min)) * 100);
                  return (
                    <div key={idx} className="flex flex-col items-center w-full group/bar relative">
                      <span className="text-[9px] font-bold text-blue-800 absolute -top-4 opacity-0 group-hover/bar:opacity-100 transition-opacity">{w.weight}</span>
                      <div className="w-full bg-[#000080] hover:bg-blue-600 rounded-t-sm transition-all" style={{ height: `${height}%` }}></div>
                      <span className="text-[8px] text-blue-500 mt-1 truncate w-full text-center">{w.date}</span>
                    </div>
                  );
                })}
              </div>
              {(user.role === 'DIRECTOR' || user.role === 'PF') && (
                <button onClick={() => setShowWeight(true)} className="absolute top-4 right-4 text-blue-600 hover:bg-blue-200 p-1 rounded-md opacity-0 group-hover:opacity-100 transition">
                  <Plus size={16} />
                </button>
              )}
            </div>
            <div className="bg-gray-50 p-4 rounded-xl border">
              <p className="text-xs text-gray-500 font-bold uppercase">Estatura</p>
              <p className="font-bold text-gray-800 mt-2">{selectedPlayer.height || '-'} m</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-xl border">
              <p className="text-xs text-gray-500 font-bold uppercase">Teléfono / WhatsApp</p>
              <p className="font-bold text-[#000080] text-lg mt-2 flex items-center gap-2">
                <Phone size={18} />{selectedPlayer.phone || 'No registrado'}
              </p>
            </div>
          </div>

          {(user.role === 'PF' || user.role === 'CT') ? (
            <div className="p-4 bg-red-50 text-red-800 rounded-xl flex items-center gap-3">
              <ShieldAlert size={24} /> <p><strong>Acceso Restringido:</strong> Perfil clínico privado.</p>
            </div>
          ) : (
            <div className="flex flex-wrap gap-3">
              <button onClick={() => setShowExams(true)} className="bg-white border-2 border-gray-200 hover:bg-gray-50 px-4 py-2 rounded-xl flex items-center gap-2 font-bold text-gray-700 transition">
                <FileSearch size={18} /> Carta Exámenes (Directiva)
              </button>
              <button onClick={() => setShowNewInjury(true)} className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 shadow-md">
                <Activity size={18} /> Registrar Lesión y Abordaje
              </button>
            </div>
          )}
        </div>

        {user.role !== 'PF' && user.role !== 'CT' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
              <h3 className="text-xl font-bold text-[#000080] mb-4 border-b pb-2">Historial Clínico de Lesiones</h3>
              {pHist.length === 0 ? (
                <p className="text-gray-500">Sin lesiones registradas.</p>
              ) : (
                <div className="space-y-4">
                  {pHist.map((lesion, i) => (
                    <div key={i} className={`border-l-4 p-4 rounded-r-lg relative ${lesion.interconsulta ? 'border-yellow-500 bg-yellow-50' : 'border-red-500 bg-red-50'}`}>
                      <div className="absolute top-4 right-4 flex gap-2">
                        <button onClick={() => { setEditInjuryForm(lesion); setEditingInjuryIndex(i); setShowEditInjury(true); }} className="text-blue-700 hover:bg-blue-100 p-2 rounded-lg flex items-center gap-1 text-xs font-bold transition" title="Editar Historial">
                          <Edit2 size={14} /> Editar
                        </button>
                        <button onClick={() => generarPDF('lesion', lesion)} className="text-red-700 hover:bg-red-100 p-2 rounded-lg flex items-center gap-1 text-xs font-bold transition" title="Descargar / Enviar">
                          <Download size={14} /> PDF
                        </button>
                      </div>
                      <div className="text-xs text-red-500 font-bold flex items-center flex-wrap gap-2">
                        <span>{lesion.date} • {lesion.context} {lesion.relapse ? '(Recaída)' : ''}</span>
                        {lesion.interconsulta && (
                          <span className="bg-yellow-500 text-white text-[10px] px-2 py-0.5 rounded font-bold uppercase flex items-center gap-1 shadow-sm">
                            <Send size={10} /> Interconsulta
                          </span>
                        )}
                      </div>
                      <p className="font-bold text-red-900 text-lg leading-tight mt-1 w-3/4">{lesion.diagnosis}</p>
                      <div className="mt-2 bg-white/60 p-3 rounded border border-red-100">
                        <p className="text-xs text-gray-500 font-bold uppercase mb-1">Anamnesis / Historia:</p>
                        <p className="text-sm text-gray-700 italic">"{lesion.historyText}"</p>
                        {lesion.treatment && (
                          <div className="mt-2 pt-2 border-t border-red-100">
                            <p className="text-xs text-blue-600 font-bold uppercase mb-1">Abordaje / Tratamiento Realizado:</p>
                            <p className="text-sm text-gray-800 font-medium">{lesion.treatment}</p>
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-red-700 font-bold mt-2">ZONA: {lesion.area} ({lesion.laterality}) | TIME-LOSS: {lesion.timeLoss} días</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border relative">
              <div className="flex justify-between items-center mb-4 border-b pb-2">
                <h3 className="text-xl font-bold text-[#000080]">Seguimiento Méd. / Notas</h3>
                <button onClick={() => setShowEvolution(true)} className="bg-blue-100 text-blue-700 hover:bg-blue-200 px-3 py-1 rounded-lg text-sm font-bold flex items-center gap-1">
                  <Plus size={16} /> Añadir
                </button>
              </div>
              {pEvo.length === 0 ? (
                <p className="text-gray-500 text-sm">No hay notas clínicas.</p>
              ) : (
                <div className="space-y-3 max-h-[600px] overflow-y-auto">
                  {pEvo.map((evo, i) => (
                    <div key={i} className="bg-blue-50/50 p-4 rounded-xl border border-blue-100">
                      <p className="text-xs text-blue-500 font-bold mb-1">{evo.date}</p>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">{evo.note}</p>
                      {evo.file && (
                        <div className="mt-3 pt-2 border-t border-blue-100 flex items-center gap-2">
                          <Paperclip size={14} className="text-blue-500" />
                          <span className="text-xs font-bold text-blue-700">{evo.file}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {showEditInjury && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 w-full max-w-2xl shadow-2xl relative overflow-y-auto max-h-[90vh]">
              <button onClick={() => setShowEditInjury(false)} className="absolute top-4 right-4 text-gray-400"><X /></button>
              <h3 className="text-xl font-bold text-blue-700 mb-4 flex items-center gap-2"><Edit2 /> Editar Registro de Lesión</h3>
              <form onSubmit={handleUpdateInjury} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-gray-600">Diagnóstico Exacto</label>
                    <input type="text" required className="w-full border p-2 rounded-xl mt-1 text-sm" value={editInjuryForm.diagnosis} onChange={(e) => setEditInjuryForm({ ...editInjuryForm, diagnosis: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-600">Time-Loss (Días)</label>
                    <input type="number" required className="w-full border p-2 rounded-xl mt-1 text-sm" value={editInjuryForm.timeLoss} onChange={(e) => setEditInjuryForm({ ...editInjuryForm, timeLoss: e.target.value })} />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-600">Historia / Mecanismo</label>
                  <textarea rows="3" className="w-full border p-2 rounded-xl mt-1 text-sm" value={editInjuryForm.historyText} onChange={(e) => setEditInjuryForm({ ...editInjuryForm, historyText: e.target.value })}></textarea>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-600">Tratamiento / Abordaje</label>
                  <textarea rows="2" className="w-full border p-2 rounded-xl mt-1 text-sm" value={editInjuryForm.treatment} onChange={(e) => setEditInjuryForm({ ...editInjuryForm, treatment: e.target.value })}></textarea>
                </div>
                <button type="submit" className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl shadow-md">Guardar Cambios Clínicos</button>
              </form>
            </div>
          </div>
        )}

        {showWeight && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 w-full max-w-sm">
              <h3 className="font-bold text-lg mb-4 text-[#000080]">Actualizar Peso (kg)</h3>
              <form onSubmit={handleAddWeight}>
                <input type="number" step="0.1" required className="w-full border p-2 rounded mb-4" value={newWeight} onChange={(e) => setNewWeight(e.target.value)} />
                <div className="flex gap-2">
                  <button type="button" onClick={() => setShowWeight(false)} className="flex-1 bg-gray-200 py-2 rounded font-bold">Cancelar</button>
                  <button type="submit" className="flex-1 bg-[#000080] text-white py-2 rounded font-bold">Guardar</button>
                </div>
              </form>
            </div>
          </div>
        )}
        
        {showEvolution && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
              <h3 className="font-bold text-xl mb-4 text-[#000080] flex items-center gap-2"><FileText /> Nota de Evolución</h3>
              <form onSubmit={handleAddEvolution}>
                <textarea required rows="4" className="w-full border p-3 rounded-xl mb-3 text-sm" value={newEvolution} onChange={(e) => setNewEvolution(e.target.value)}></textarea>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setShowEvolution(false)} className="flex-1 bg-gray-200 py-3 rounded-xl font-bold">Cancelar</button>
                  <button type="submit" className="flex-1 bg-[#000080] text-white py-3 rounded-xl font-bold">Guardar Nota</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {showExams && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 w-full max-w-xl shadow-2xl relative">
              <button onClick={() => setShowExams(false)} className="absolute top-4 right-4 text-gray-400"><X /></button>
              <h3 className="text-xl font-bold text-[#000080] mb-2 flex items-center gap-2"><FileSearch /> Carta Solicitud de Exámenes</h3>
              <p className="text-sm text-gray-500 mb-4">Complete la justificación médica. Esto generará una carta formal dirigida a la Presidencia del Club.</p>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-bold text-gray-700">1. Condición / Sospecha Clínica Actual</label>
                  <textarea rows="2" placeholder="Ej. Presenta dolor agudo..." className="w-full border p-2 rounded-xl mt-1 text-sm focus:ring-2 focus:ring-[#000080]" value={examForm.sospecha} onChange={(e) => setExamForm({ ...examForm, sospecha: e.target.value })}></textarea>
                </div>
                <div>
                  <label className="text-sm font-bold text-gray-700">2. Abordaje y Tratamiento Instaurado</label>
                  <textarea rows="2" placeholder="Ej. Se inmovilizó la zona..." className="w-full border p-2 rounded-xl mt-1 text-sm focus:ring-2 focus:ring-[#000080]" value={examForm.tratamiento} onChange={(e) => setExamForm({ ...examForm, tratamiento: e.target.value })}></textarea>
                </div>
                <div>
                  <label className="text-sm font-bold text-gray-700 mb-2 block">3. Estudios Requeridos</label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2"><input type="checkbox" className="w-4 h-4" checked={examForm.mri} onChange={(e) => setExamForm({ ...examForm, mri: e.target.checked })} /> MRI</label>
                    <label className="flex items-center gap-2"><input type="checkbox" className="w-4 h-4" checked={examForm.usg} onChange={(e) => setExamForm({ ...examForm, usg: e.target.checked })} /> USG</label>
                    <label className="flex items-center gap-2"><input type="checkbox" className="w-4 h-4" checked={examForm.rx} onChange={(e) => setExamForm({ ...examForm, rx: e.target.checked })} /> Rayos X</label>
                  </div>
                </div>
                <button onClick={() => { setShowExams(false); generarPDF('examen', null); }} className="w-full bg-[#000080] text-white font-bold py-3 rounded-xl mt-2 flex justify-center items-center gap-2">
                  <Printer size={18} /> Generar Carta para Directiva
                </button>
              </div>
            </div>
          </div>
        )}

        {showNewInjury && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 w-full max-w-2xl shadow-2xl relative overflow-y-auto max-h-[90vh]">
              <button onClick={() => setShowNewInjury(false)} className="absolute top-4 right-4 text-gray-400"><X /></button>
              <h3 className="text-xl font-bold text-red-600 mb-4 flex items-center gap-2"><Activity /> Registrar Nueva Lesión y Abordaje</h3>
              <form onSubmit={handleAddInjury} className="space-y-4">
                <div className="bg-red-50/50 p-4 rounded-xl border border-red-100 space-y-3">
                  <h4 className="text-sm font-bold text-red-800 border-b border-red-200 pb-1">1. Diagnóstico Médico</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="col-span-2">
                      <label className="text-xs font-bold text-gray-600">Contexto</label>
                      <select className="w-full border p-2 rounded-xl mt-1 text-sm bg-gray-50" value={newInjuryForm.context} onChange={(e) => setNewInjuryForm({ ...newInjuryForm, context: e.target.value })}>
                        <option value="Entrenamiento">Entrenamiento</option>
                        <option value="Partido Oficial">Partido Oficial</option>
                        <option value="Partido Amistoso">Partido</option>
                        <option value="Enfermedad Común">Enfermedad</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-gray-600">Time-Loss (Días)</label>
                      <input type="number" required className="w-full border p-2 rounded-xl mt-1 text-sm" value={newInjuryForm.timeLoss} onChange={(e) => setNewInjuryForm({ ...newInjuryForm, timeLoss: e.target.value })} />
                    </div>
                    <div className="flex items-end pb-2">
                      <label className="flex items-center gap-2 font-bold text-sm text-red-600">
                        <input type="checkbox" className="w-5 h-5 accent-red-600" checked={newInjuryForm.relapse} onChange={(e) => setNewInjuryForm({ ...newInjuryForm, relapse: e.target.checked })} /> Recaída
                      </label>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="col-span-2 relative">
                      <label className="text-xs font-bold text-gray-600">Zona Anatómica</label>
                      <input type="text" required placeholder="Ej. Rodilla..." className="w-full border p-2 rounded-xl mt-1 text-sm" value={newInjuryForm.area} onChange={(e) => handleZonaChange(e, newInjuryForm, setNewInjuryForm)} />
                      {filteredZonas.length > 0 && (
                        <ul className="absolute z-10 w-full bg-white border mt-1 rounded-xl shadow-xl max-h-32 overflow-y-auto">
                          {filteredZonas.map((z) => (
                            <li key={z} onClick={() => { setNewInjuryForm({ ...newInjuryForm, area: z }); setFilteredZonas([]); }} className="p-2 hover:bg-blue-50 cursor-pointer border-b text-sm">{z}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                    <div>
                      <label className="text-xs font-bold text-gray-600">Lateralidad</label>
                      <select className="w-full border p-2 rounded-xl mt-1 text-sm bg-gray-50" value={newInjuryForm.laterality} onChange={(e) => setNewInjuryForm({ ...newInjuryForm, laterality: e.target.value })}>
                        <option value="N/A">N/A</option><option value="Derecha">Der</option><option value="Izquierda">Izq</option><option value="Bilateral">Bilat</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-600">Diagnóstico Exacto</label>
                    <input type="text" required className="w-full border p-2 rounded-xl mt-1 text-sm" value={newInjuryForm.diagnosis} onChange={(e) => setNewInjuryForm({ ...newInjuryForm, diagnosis: e.target.value })} />
                  </div>
                  <div>
                    <label className="flex justify-between items-end text-xs font-bold text-gray-600 mb-1">
                      <span>Mecanismo / Historia</span>
                      <button type="button" onClick={() => startDictation(setNewInjuryForm)} className={`p-2 rounded-full ${isRecording ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-white text-gray-600 shadow'}`}><Mic size={14} /></button>
                    </label>
                    <textarea required rows="2" className="w-full border p-2 rounded-xl text-sm" value={newInjuryForm.historyText} onChange={(e) => setNewInjuryForm({ ...newInjuryForm, historyText: e.target.value })}></textarea>
                  </div>
                </div>

                <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 space-y-3">
                  <h4 className="text-sm font-bold text-[#000080] border-b border-blue-200 pb-1">2. Abordaje / Tratamiento Realizado</h4>
                  <div>
                    <textarea required rows="2" className="w-full border p-2 rounded-xl text-sm" placeholder="Ej. Aplicación de hielo..." value={newInjuryForm.treatment} onChange={(e) => setNewInjuryForm({ ...newInjuryForm, treatment: e.target.value })}></textarea>
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-gray-200">
                    <p className="text-xs font-bold text-yellow-600 mb-2">Usar Insumo de Bodega ({selectedPlayer.category})</p>
                    <div className="grid grid-cols-4 gap-3">
                      <div className="col-span-3">
                        <select className="w-full border p-2 rounded-xl text-sm" value={newInjuryForm.medId} onChange={(e) => setNewInjuryForm({ ...newInjuryForm, medId: e.target.value })}>
                          <option value="">-- No utilizar insumos --</option>
                          {categoryMeds.map((item) => (
                            <option key={item.id} value={item.id}>{item.name} ({item.quantity} disp.)</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <input type="number" placeholder="Cant." min="1" max={categoryMeds.find((i) => i.id === Number(newInjuryForm.medId))?.quantity || 99} disabled={!newInjuryForm.medId} className="w-full border p-2 rounded-xl text-sm disabled:bg-gray-100" value={newInjuryForm.medQty} onChange={(e) => setNewInjuryForm({ ...newInjuryForm, medQty: e.target.value })} />
                      </div>
                    </div>
                  </div>
                </div>

                {user.role === 'FISIO' && (
                  <div className="bg-yellow-50 p-4 rounded-xl border border-yellow-200 mt-4 mb-2">
                    <label className="flex items-center gap-3 font-bold text-yellow-800 cursor-pointer">
                      <input
                        type="checkbox"
                        className="w-5 h-5 accent-yellow-600"
                        checked={newInjuryForm.interconsulta}
                        onChange={(e) => setNewInjuryForm({ ...newInjuryForm, interconsulta: e.target.checked })}
                      />
                      <Send size={18} /> Solicitar Interconsulta a Dr. Angel
                    </label>
                  </div>
                )}

                <button type="submit" className="w-full bg-red-600 text-white font-bold py-3 rounded-xl shadow-md">
                  Guardar Lesión en la Nube
                </button>
              </form>
            </div>
          </div>
        )}

        {showEditPlayer && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl relative overflow-y-auto max-h-[90vh]">
              <button onClick={() => setShowEditPlayer(false)} className="absolute top-4 right-4 text-gray-400"><X /></button>
              <h3 className="text-xl font-bold text-gray-700 mb-4 flex items-center gap-2"><Edit /> Editar Perfil de {editPlayerForm.name}</h3>
              
              <div className="mb-4 flex items-center gap-4 bg-gray-50 p-3 rounded-xl border">
                <div className="w-16 h-16 bg-gray-200 rounded-full overflow-hidden flex items-center justify-center border-2 border-white shadow-sm">
                  {editPlayerForm.photo_url ? <img src={editPlayerForm.photo_url} alt="Perfil" className="w-full h-full object-cover"/> : <Camera size={24} className="text-gray-400"/>}
                </div>
                <div className="flex-1">
                  <label className="text-xs font-bold text-gray-600 block mb-1">Cambiar Fotografía</label>
                  <input type="file" accept="image/*" onChange={(e) => handlePhotoUpload(e, setEditPlayerForm)} className="text-xs file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700" disabled={isUploading} />
                  {isUploading && <p className="text-xs text-blue-500 font-bold mt-1 animate-pulse">Subiendo foto...</p>}
                </div>
              </div>

              <form onSubmit={handleUpdatePlayer} className="space-y-3">
                <div className="grid grid-cols-4 gap-3">
                  <div className="col-span-3">
                    <label className="text-xs font-bold">Nombre Completo</label>
                    <input type="text" required className="w-full border p-2 rounded-lg mt-1 text-sm" value={editPlayerForm.name || ''} onChange={(e) => setEditPlayerForm({ ...editPlayerForm, name: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-xs font-bold">Dorsal</label>
                    <input type="number" className="w-full border p-2 rounded-lg mt-1 text-sm" value={editPlayerForm.dorsal || ''} onChange={(e) => setEditPlayerForm({ ...editPlayerForm, dorsal: e.target.value })} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold">Teléfono (WhatsApp)</label>
                    <input type="tel" className="w-full border p-2 rounded-lg mt-1 text-sm" value={editPlayerForm.phone || ''} onChange={(e) => setEditPlayerForm({ ...editPlayerForm, phone: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-xs font-bold">Categoría</label>
                    <select className="w-full border p-2 rounded-lg mt-1 text-sm" value={editPlayerForm.category || ''} onChange={(e) => setEditPlayerForm({ ...editPlayerForm, category: e.target.value })}>
                      {user.role === 'DIRECTOR' ? (
                        <><option value="Mayor">Mayor</option><option value="Especial">Especial</option><option value="Cat A">Cat A</option><option value="Cat B">Cat B</option><option value="Sub-15">Sub-15</option><option value="Sub-13">Sub-13</option></>
                      ) : (
                        user.categories.map((c) => c !== 'ALL' && (<option key={c} value={c}>{c}</option>))
                      )}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs font-bold">Posición</label>
                    <select className="w-full border p-2 rounded-lg mt-1 text-sm" value={editPlayerForm.position || ''} onChange={(e) => setEditPlayerForm({ ...editPlayerForm, position: e.target.value })}>
                      <option value="Portero">Portero</option><option value="Defensa">Defensa</option><option value="Mediocampista">Medio</option><option value="Delantero">Delantero</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold">Peso (kg)</label>
                    <input type="number" step="0.1" className="w-full border p-2 rounded-lg mt-1 text-sm" value={editPlayerForm.weight || ''} onChange={(e) => setEditPlayerForm({ ...editPlayerForm, weight: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-xs font-bold">Estatura (m)</label>
                    <input type="number" step="0.01" className="w-full border p-2 rounded-lg mt-1 text-sm" value={editPlayerForm.height || ''} onChange={(e) => setEditPlayerForm({ ...editPlayerForm, height: e.target.value })} />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold">Antecedentes Clínicos</label>
                  <textarea rows="2" className="w-full border p-2 rounded-lg mt-1 text-sm" value={editPlayerForm.background || ''} onChange={(e) => setEditPlayerForm({ ...editPlayerForm, background: e.target.value })}></textarea>
                </div>
                <div className="flex gap-2 pt-2">
                  <button type="button" onClick={() => setShowEditPlayer(false)} className="flex-1 bg-gray-200 py-3 rounded-xl font-bold">Cancelar</button>
                  <button type="submit" className="flex-1 bg-blue-600 text-white font-bold py-3 rounded-xl shadow-md">Guardar Cambios</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 relative">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 border-b pb-4 gap-4">
        <h2 className="text-2xl font-bold text-[#000080]">
          Roster Clínico: <span className="text-blue-500">{categoryFilter}</span>
        </h2>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
            <input type="text" placeholder="Buscar jugador..." className="w-full pl-10 pr-4 py-2 border rounded-xl text-sm" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
          {canAddPlayer && (
            <button onClick={() => setShowNewPlayer(true)} className="bg-[#000080] text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 shadow-md">
              <Plus size={18} /> Añadir Jugador
            </button>
          )}
        </div>
      </div>

      {players.length === 0 ? (
        <div className="bg-white p-10 text-center rounded-2xl border text-gray-500">
          <User size={48} className="mx-auto mb-4 text-gray-300" />
          No hay jugadores registrados en la base de datos.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {visiblePlayers.map((p) => (
            <div key={p.id} onClick={() => setSelectedPlayer(p)} className="bg-white p-4 rounded-2xl shadow-sm border cursor-pointer hover:border-blue-400 hover:shadow-md transition group flex gap-3 items-center">
              <div className="w-12 h-12 bg-gray-100 rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center">
                {p.photo_url ? <img src={p.photo_url} alt={p.name} className="w-full h-full object-cover"/> : <User size={20} className="text-gray-400"/>}
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-start mb-0.5">
                  <h3 className="font-bold text-sm text-gray-800 group-hover:text-[#000080] truncate w-32">
                    {p.name}
                  </h3>
                  <span className={`px-2 py-0.5 text-[10px] rounded-full font-bold shadow-sm ${p.status === 'Apto' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {p.status}
                  </span>
                </div>
                <div className="flex flex-col">
                  <p className="text-xs text-gray-500 font-medium">{p.category} • {p.position} {p.dorsal ? `• #${p.dorsal}` : ''}</p>
                  {p.convocado && (
                    <span className="text-[9px] font-bold text-purple-600 bg-purple-50 rounded px-1 w-max mt-0.5 border border-purple-100">🌟 Convocado a Mayor</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showNewPlayer && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl relative overflow-y-auto max-h-[90vh]">
            <button onClick={() => setShowNewPlayer(false)} className="absolute top-4 right-4 text-gray-400"><X /></button>
            <h3 className="text-xl font-bold text-[#000080] mb-4 flex items-center gap-2"><User /> Nuevo Jugador</h3>
            
            <div className="mb-4 flex items-center gap-4 bg-gray-50 p-3 rounded-xl border">
              <div className="w-16 h-16 bg-gray-200 rounded-full overflow-hidden flex items-center justify-center border-2 border-white shadow-sm">
                {newPlayerForm.photo_url ? <img src={newPlayerForm.photo_url} alt="Perfil" className="w-full h-full object-cover"/> : <Camera size={24} className="text-gray-400"/>}
              </div>
              <div className="flex-1">
                <label className="text-xs font-bold text-gray-600 block mb-1">Fotografía del Jugador</label>
                <input type="file" accept="image/*" onChange={(e) => handlePhotoUpload(e, setNewPlayerForm)} className="text-xs file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700" disabled={isUploading}/>
                {isUploading && <p className="text-xs text-blue-500 font-bold mt-1 animate-pulse">Subiendo foto...</p>}
              </div>
            </div>

            <form onSubmit={handleAddPlayer} className="space-y-3">
              <div className="grid grid-cols-4 gap-3">
                <div className="col-span-3">
                  <label className="text-xs font-bold">Nombre Completo</label>
                  <input type="text" required className="w-full border p-2 rounded-lg mt-1 text-sm" value={newPlayerForm.name} onChange={(e) => setNewPlayerForm({ ...newPlayerForm, name: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs font-bold">Dorsal</label>
                  <input type="number" className="w-full border p-2 rounded-lg mt-1 text-sm" value={newPlayerForm.dorsal} onChange={(e) => setNewPlayerForm({ ...newPlayerForm, dorsal: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold">Teléfono (WhatsApp)</label>
                  <input type="tel" placeholder="Ej. 55551234" className="w-full border p-2 rounded-lg mt-1 text-sm" value={newPlayerForm.phone} onChange={(e) => setNewPlayerForm({ ...newPlayerForm, phone: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs font-bold">Categoría</label>
                  <select className="w-full border p-2 rounded-lg mt-1 text-sm" value={newPlayerForm.category} onChange={(e) => setNewPlayerForm({ ...newPlayerForm, category: e.target.value })}>
                    {user.role === 'DIRECTOR' ? (
                      <><option value="Mayor">Mayor</option><option value="Especial">Especial</option><option value="Cat A">Cat A</option><option value="Cat B">Cat B</option><option value="Sub-15">Sub-15</option><option value="Sub-13">Sub-13</option></>
                    ) : (
                      user.categories.map((c) => c !== 'ALL' && (<option key={c} value={c}>{c}</option>))
                    )}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-bold">Posición</label>
                  <select className="w-full border p-2 rounded-lg mt-1 text-sm" value={newPlayerForm.position} onChange={(e) => setNewPlayerForm({ ...newPlayerForm, position: e.target.value })}>
                    <option value="Portero">Portero</option><option value="Defensa">Defensa</option><option value="Mediocampista">Medio</option><option value="Delantero">Delantero</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold">Peso (kg)</label>
                  <input type="number" step="0.1" className="w-full border p-2 rounded-lg mt-1 text-sm" value={newPlayerForm.weight} onChange={(e) => setNewPlayerForm({ ...newPlayerForm, weight: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs font-bold">Estatura (m)</label>
                  <input type="number" step="0.01" className="w-full border p-2 rounded-lg mt-1 text-sm" value={newPlayerForm.height} onChange={(e) => setNewPlayerForm({ ...newPlayerForm, height: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="text-xs font-bold">Antecedentes Clínicos</label>
                <textarea rows="2" className="w-full border p-2 rounded-lg mt-1 text-sm" value={newPlayerForm.background} onChange={(e) => setNewPlayerForm({ ...newPlayerForm, background: e.target.value })}></textarea>
              </div>
              <button type="submit" className="w-full bg-[#000080] text-white font-bold py-3 rounded-xl mt-2 shadow-md">Guardar Jugador en Nube</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
