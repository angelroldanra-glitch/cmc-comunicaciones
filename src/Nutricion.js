import React, { useState, useEffect } from 'react';
import {
  HeartPulse,
  Plus,
  MessageSquare,
  AlertCircle,
  CheckCircle,
  Clock,
  X,
  Send,
  Phone,
} from 'lucide-react';
import { supabase } from './supabase'; // CONEXIÓN A LA NUBE

export default function Triage({ user }) {
  const [tickets, setTickets] = useState([]);
  const [showNewTicket, setShowNewTicket] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [replyText, setReplyText] = useState('');

  const [newTicketForm, setNewTicketForm] = useState({
    name: '',
    category: user.categories ? user.categories[0] : 'Mayor',
    diagnostic: '',
    reason: '',
    priority: 'Media',
    phone: '',
  });

  // 1. CARGAR TICKETS DESDE LA NUBE
  const fetchTickets = async () => {
    const { data } = await supabase
      .from('triage')
      .select('*')
      .order('id', { ascending: false });
    if (data) setTickets(data);
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  // 2. CREAR NUEVA INTERCONSULTA (NUBE)
  const handleAddTicket = async (e) => {
    e.preventDefault();
    const newTicket = {
      ...newTicketForm,
      status: 'Pendiente',
      from: user.name,
    };

    const { data } = await supabase.from('triage').insert([newTicket]).select();

    if (data) {
      setTickets([data[0], ...tickets]);
      setShowNewTicket(false);
      setNewTicketForm({
        name: '',
        category: user.categories ? user.categories[0] : 'Mayor',
        diagnostic: '',
        reason: '',
        priority: 'Media',
        phone: '',
      });
    }
  };

  // 3. RESPONDER INTERCONSULTA (NUBE) - Solo Director
  const handleReply = async (e) => {
    e.preventDefault();
    const { data } = await supabase
      .from('triage')
      .update({ status: 'Resuelto', recommendation: replyText })
      .eq('id', selectedTicket.id)
      .select();

    if (data) {
      setTickets(
        tickets.map((t) => (t.id === selectedTicket.id ? data[0] : t))
      );
      setSelectedTicket(null);
      setReplyText('');
    }
  };

  // Filtrar tickets: El Director ve todos, el Fisio solo ve los que él creó o los de su categoría
  const visibleTickets =
    user.role === 'DIRECTOR'
      ? tickets
      : tickets.filter(
          (t) => t.category === user.categories[0] || t.from === user.name
        );

  const getPriorityColor = (priority) => {
    if (priority === 'Alta') return 'bg-red-100 text-red-700 border-red-200';
    if (priority === 'Media')
      return 'bg-yellow-100 text-yellow-700 border-yellow-200';
    return 'bg-green-100 text-green-700 border-green-200';
  };

  return (
    <div className="p-4 md:p-6 relative animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 border-b pb-4 gap-4">
        <h2 className="text-2xl font-bold text-red-600 flex items-center gap-2">
          <HeartPulse size={28} /> Bandeja de Interconsultas
        </h2>
        {user.role === 'FISIO' && (
          <button
            onClick={() => setShowNewTicket(true)}
            className="bg-red-600 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 shadow-md hover:bg-red-700 transition"
          >
            <Plus size={18} /> Solicitar Interconsulta
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LISTADO DE TICKETS */}
        <div className="lg:col-span-1 space-y-3 max-h-[70vh] overflow-y-auto pr-2">
          {visibleTickets.length === 0 ? (
            <div className="bg-white p-6 rounded-2xl border text-center text-gray-500 shadow-sm">
              <MessageSquare size={32} className="mx-auto mb-2 text-gray-300" />
              No hay casos en bandeja.
            </div>
          ) : (
            visibleTickets.map((ticket) => (
              <div
                key={ticket.id}
                onClick={() => setSelectedTicket(ticket)}
                className={`p-4 rounded-xl border-l-4 cursor-pointer transition shadow-sm bg-white ${
                  selectedTicket?.id === ticket.id
                    ? 'border-l-[#000080] shadow-md ring-1 ring-blue-100'
                    : 'border-l-transparent hover:border-gray-300'
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${getPriorityColor(
                      ticket.priority
                    )}`}
                  >
                    {ticket.priority}
                  </span>
                  <span className="flex items-center gap-1 text-xs font-bold text-gray-500">
                    {ticket.status === 'Pendiente' ? (
                      <Clock size={12} className="text-orange-500" />
                    ) : (
                      <CheckCircle size={12} className="text-green-500" />
                    )}
                    {ticket.status}
                  </span>
                </div>
                <h4 className="font-bold text-gray-800 leading-tight">
                  {ticket.name}
                </h4>
                <p className="text-xs text-gray-500 mt-1">
                  {ticket.category} • Fisio: {ticket.from}
                </p>
              </div>
            ))
          )}
        </div>

        {/* DETALLE DEL TICKET SELECCIONADO */}
        <div className="lg:col-span-2">
          {selectedTicket ? (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="bg-gray-50 p-4 border-b flex justify-between items-center">
                <div>
                  <h3 className="font-bold text-lg text-[#000080]">
                    Caso Clínico: {selectedTicket.name}
                  </h3>
                  <p className="text-sm text-gray-500">
                    Categoría: {selectedTicket.category} | Solicitado por:{' '}
                    {selectedTicket.from}
                  </p>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold border ${getPriorityColor(
                    selectedTicket.priority
                  )}`}
                >
                  Prioridad {selectedTicket.priority}
                </span>
              </div>

              <div className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-red-50 p-4 rounded-xl border border-red-100">
                    <p className="text-xs font-bold text-red-600 uppercase mb-1">
                      Diagnóstico / Sospecha
                    </p>
                    <p className="font-medium text-gray-800">
                      {selectedTicket.diagnostic}
                    </p>
                  </div>
                  <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                    <p className="text-xs font-bold text-blue-600 uppercase mb-1">
                      Motivo de Interconsulta
                    </p>
                    <p className="font-medium text-gray-800">
                      {selectedTicket.reason}
                    </p>
                  </div>
                </div>

                {selectedTicket.recommendation ? (
                  <div className="bg-[#000080]/5 p-4 rounded-xl border border-[#000080]/20">
                    <p className="text-xs font-bold text-[#000080] uppercase mb-1 flex items-center gap-1">
                      <CheckCircle size={14} /> Respuesta de Dirección Médica
                    </p>
                    <p className="font-bold text-gray-800 mt-2 whitespace-pre-wrap">
                      {selectedTicket.recommendation}
                    </p>
                  </div>
                ) : user.role === 'DIRECTOR' ? (
                  <form onSubmit={handleReply} className="border-t pt-4">
                    <p className="text-sm font-bold text-[#000080] mb-2">
                      Dictar o Escribir Resolución Médica
                    </p>
                    <textarea
                      required
                      rows="3"
                      className="w-full border p-3 rounded-xl focus:ring-2 focus:ring-[#000080] bg-gray-50"
                      placeholder="Ej. Proceder con inmovilización inmediata y referir a rayos X..."
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                    ></textarea>
                    <div className="flex gap-3 mt-3">
                      <button
                        type="submit"
                        className="bg-[#000080] text-white px-6 py-2 rounded-xl font-bold flex items-center gap-2 shadow hover:bg-blue-900 transition"
                      >
                        <Send size={16} /> Enviar Resolución al Fisio
                      </button>
                      {selectedTicket.phone && (
                        <a
                          href={`https://wa.me/502${selectedTicket.phone}`}
                          target="_blank"
                          rel="noreferrer"
                          className="bg-green-500 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 shadow hover:bg-green-600 transition"
                        >
                          <Phone size={16} /> Llamar / WhatsApp
                        </a>
                      )}
                    </div>
                  </form>
                ) : (
                  <div className="bg-orange-50 p-4 rounded-xl border border-orange-100 text-center text-orange-800 font-bold flex items-center justify-center gap-2">
                    <Clock size={18} /> Esperando resolución del Dr. Angel
                    Roldan...
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="hidden lg:flex flex-col items-center justify-center h-full bg-gray-50 rounded-2xl border border-gray-200 border-dashed text-gray-400 p-10">
              <AlertCircle size={48} className="mb-4 text-gray-300" />
              <p className="font-bold">Selecciona un caso de la bandeja</p>
              <p className="text-sm text-center mt-2">
                Revisa los detalles clínicos y responde a los fisios de las
                diferentes categorías.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* MODAL NUEVO TICKET (Para los Fisios) */}
      {showNewTicket && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl relative">
            <button
              onClick={() => setShowNewTicket(false)}
              className="absolute top-4 right-4 text-gray-400"
            >
              <X />
            </button>
            <h3 className="text-xl font-bold text-red-600 mb-4 flex items-center gap-2">
              <HeartPulse /> Solicitar Interconsulta Central
            </h3>
            <form onSubmit={handleAddTicket} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-bold text-gray-700">
                    Nombre del Jugador
                  </label>
                  <input
                    type="text"
                    required
                    className="w-full border p-2 rounded-xl mt-1"
                    value={newTicketForm.name}
                    onChange={(e) =>
                      setNewTicketForm({
                        ...newTicketForm,
                        name: e.target.value,
                      })
                    }
                  />
                </div>
                <div>
                  <label className="text-sm font-bold text-gray-700">
                    Teléfono (Opcional)
                  </label>
                  <input
                    type="tel"
                    className="w-full border p-2 rounded-xl mt-1"
                    placeholder="Ej. 55551234"
                    value={newTicketForm.phone}
                    onChange={(e) =>
                      setNewTicketForm({
                        ...newTicketForm,
                        phone: e.target.value,
                      })
                    }
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-bold text-gray-700">
                  Diagnóstico Presuntivo
                </label>
                <input
                  type="text"
                  required
                  className="w-full border p-2 rounded-xl mt-1"
                  value={newTicketForm.diagnostic}
                  onChange={(e) =>
                    setNewTicketForm({
                      ...newTicketForm,
                      diagnostic: e.target.value,
                    })
                  }
                />
              </div>
              <div>
                <label className="text-sm font-bold text-gray-700">
                  Motivo de Interconsulta / Duda
                </label>
                <textarea
                  required
                  rows="2"
                  className="w-full border p-2 rounded-xl mt-1"
                  placeholder="¿Qué necesitas que revise o apruebe el Director?"
                  value={newTicketForm.reason}
                  onChange={(e) =>
                    setNewTicketForm({
                      ...newTicketForm,
                      reason: e.target.value,
                    })
                  }
                ></textarea>
              </div>
              <div>
                <label className="text-sm font-bold text-gray-700">
                  Prioridad
                </label>
                <select
                  className="w-full border p-2 rounded-xl mt-1 bg-gray-50"
                  value={newTicketForm.priority}
                  onChange={(e) =>
                    setNewTicketForm({
                      ...newTicketForm,
                      priority: e.target.value,
                    })
                  }
                >
                  <option value="Baja">Baja - Puede esperar</option>
                  <option value="Media">Media - Revisión hoy</option>
                  <option value="Alta">Alta - ¡Urgente / Emergencia!</option>
                </select>
              </div>
              <button
                type="submit"
                className="w-full bg-red-600 text-white font-bold py-3 rounded-xl mt-2 shadow-md hover:bg-red-700"
              >
                Enviar Caso al Dr. Angel
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
