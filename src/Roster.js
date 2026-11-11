import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Send,
  Activity,
  User,
  Plus,
  X,
  Mic,
  FileSearch,
  Search,
  Printer,
  Download,
  Phone,
  Paperclip,
  FileText,
  Edit
} from 'lucide-react';
import { supabase } from './supabase'; 

const ZONAS_ANATOMICAS = [
  'Cabeza',
  'Cuello',
  'Hombro',
  'Pecho',
  'Abdomen',
  'Espalda',
  'Ingle/Pubis',
  'Muslo (Cuádriceps)',
  'Muslo (Isquiotibial)',
  'Rodilla',
  'Pantorrilla',
  'Tobillo',
  'Pie',
];

export default function Roster({ user, categoryFilter }) {
  const defaultCat = user.role === 'DIRECTOR' || user.categories?.includes('ALL') ? 'Mayor' : user.categories[0];

  const [players, setPlayers] = useState([]);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const [showNewPlayer, setShowNewPlayer] = useState(false);
  const [showEditPlayer, setShowEditPlayer] = useState(false);
  const [showNewInjury, setShowNewInjury] = useState(false);
  const [showExams, setShowExams] = useState(false);
  const [showEvolution, setShowEvolution] = useState(false);
  const [showWeight, setShowWeight] = useState(false);

  const [newPlayerForm, setNewPlayerForm] = useState({
    name: '', dorsal: '', phone: '', category: defaultCat, position: 'Defensa', weight: '', height: '', background: '',
  });

  const [editPlayerForm, setEditPlayerForm] = useState({});
  
  const [newInjuryForm, setNewInjuryForm] = useState({
    date: '', diagnosis: '', area: '', historyText: '', treatment: '', medId: '', medQty: '', timeLoss: '0', context: 'Entrenamiento', laterality: 'N/A', relapse: false, interconsulta: false,
  });
  
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
    const { data } = await supabase
      .from('jugadores')
      .select('*')
      .order('name', { ascending: true });
    if (data) setPlayers(data);
  };

  useEffect(() => {
    fetchPlayers();
  }, []);

  useEffect(() => {
    if (showNewInjury && selectedPlayer) {
      const fetchMeds = async () => {
        const { data } = await supabase
          .from('kardex_categorias')
          .select('*')
          .eq('category', selectedPlayer.category)
          .gt('quantity', 0);
        setCategoryMeds(data || []);
      };
      fetchMeds();
    }
  }, [showNewInjury, selectedPlayer]);

  const canAddPlayer = user.role === 'DIRECTOR' || user.role === 'FISIO';

  const handleAddPlayer = async (e) => {
    e.preventDefault();
    const newPlayer = {
      ...newPlayerForm,
      // Solo convierte a número si el usuario escribió algo; si no, lo deja nulo
      dorsal: newPlayerForm.dorsal ? Number(newPlayerForm.dorsal) : null,
      weight: newPlayerForm.weight ? Number(newPlayerForm.weight) : null,
      height: newPlayerForm.height ? Number(newPlayerForm.height) : null,
      status: 'Apto',
      history: [],
      evolution: [],
      // Solo registra historial de peso inicial si de verdad ingresó un peso
      weightHistory: newPlayerForm.weight ? [
        {
          date: new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }),
          weight: Number(newPlayerForm.weight),
        },
      ] : [],
    };

    const { data } = await supabase.from('jugadores').insert([newPlayer]).select();
    if (data) {
      setPlayers([...players, data[0]]);
      setShowNewPlayer(false);
      setNewPlayerForm({
        name: '', dorsal: '', phone: '', category: defaultCat, position: 'Defensa', weight: '', height: '', background: '',
      });
    }
  };

  const handleUpdatePlayer = async (e) => {
    e.preventDefault();
    const updatedData = {
      name: editPlayerForm.name,
      dorsal: editPlayerForm.dorsal ? Number(editPlayerForm.dorsal) : null,
      phone: editPlayerForm.phone || '',
      category: editPlayerForm.category,
      position: editPlayerForm.position,
      weight: editPlayerForm.weight ? Number(editPlayerForm.weight) : null,
      height: editPlayerForm.height ? Number(editPlayerForm.height) : null,
      background: editPlayerForm.background || '',
    };

    const { data } = await supabase
      .from('jugadores')
      .update(updatedData)
      .eq('id', selectedPlayer.id)
      .select();

    if (data) {
      setPlayers(players.map((p) => (p.id === selectedPlayer.id ? data[0] : p)));
      setSelectedPlayer(data[0]);
      setShowEditPlayer(false);
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
    const lesionParaGuardar = {
      ...newInjuryForm,
      date: fechaHoy,
      medName,
      medQty: newInjuryForm.medQty,
      interconsulta: newInjuryForm.interconsulta,
    };

    const currentHistory = selectedPlayer.history || [];
    const updatedHistory = [...currentHistory, lesionParaGuardar];
    const newStatus = Number(newInjuryForm.timeLoss) > 0 ? 'Baja' : 'Apto';

    const { data } = await supabase
      .from('jugadores')
      .update({ history: updatedHistory, status: newStatus })
      .eq('id', selectedPlayer.id)
      .select();

    if (data) {
      setPlayers(players.map((p) => (p.id === selectedPlayer.id ? data[0] : p)));
      setSelectedPlayer(data[0]); 
    }

    setShowNewInjury(false);
    setNewInjuryForm({
      date: '', diagnosis: '', area: '', historyText: '', treatment: '', medId: '', medQty: '', timeLoss: '0', context: 'Entrenamiento', laterality: 'N/A', relapse: false, interconsulta: false,
    });
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
