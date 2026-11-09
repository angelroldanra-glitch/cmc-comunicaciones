import React, { useState, useEffect } from 'react';
import {
  Pill,
  Search,
  AlertCircle,
  AlertTriangle,
  Plus,
  X,
  CheckCircle,
  Send,
  History,
  Box,
  Activity,
} from 'lucide-react';
import { supabase } from './supabase'; // CONEXIÓN A LA NUBE

const WADA_BANNED = [
  'dexametasona',
  'betametasona',
  'clembuterol',
  'furosemida',
  'salbutamol',
  'efedrina',
  'nandrolona',
  'testosterona',
  'estanozolol',
  'eritropoyetina',
  'epo',
  'cocaína',
  'metilfenidato',
  'triamcinolona',
  'metilprednisolona',
];

export default function Kardex({ user }) {
  const [wadaSearch, setWadaSearch] = useState('');
  const [activeTab, setActiveTab] = useState('central');
  const [auditCategory, setAuditCategory] = useState('Mayor');

  // ESTADOS CONECTADOS A SUPABASE
  const [generalInventory, setGeneralInventory] = useState([]);
  const [categoryInventories, setCategoryInventories] = useState({});
  const [transferHistory, setTransferHistory] = useState([]);

  const [showNewItem, setShowNewItem] = useState(false);
  const [showDispatch, setShowDispatch] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);

  const [newItemForm, setNewItemForm] = useState({
    name: '',
    format: '',
    quantity: '',
    unit: 'tabs',
  });
  const [dispatchForm, setDispatchForm] = useState({
    category: 'Mayor',
    amount: '',
  });

  // 1. CARGAR DATOS DESDE LA NUBE AL ENTRAR
  useEffect(() => {
    fetchInventory();
    const savedHist = localStorage.getItem('kardexHistory');
    if (savedHist) setTransferHistory(JSON.parse(savedHist));
  }, []);

  const fetchInventory = async () => {
    // Traer Bodega General
    const { data: general } = await supabase
      .from('kardex_general')
      .select('*')
      .order('id', { ascending: true });
    if (general) setGeneralInventory(general);

    // Traer Bodegas de Categorías y agruparlas
    const { data: categorias } = await supabase
      .from('kardex_categorias')
      .select('*');
    if (categorias) {
      const grouped = {};
      categorias.forEach((item) => {
        if (!grouped[item.category]) grouped[item.category] = [];
        grouped[item.category].push(item);
      });
      setCategoryInventories(grouped);
    }
  };

  const checkWADA = (term) => {
    if (term.length < 3) return null;
    const isBanned = WADA_BANNED.some((w) => term.toLowerCase().includes(w));
    return isBanned ? 'BANNED' : 'SAFE';
  };

  const isItemWada = (name) =>
    WADA_BANNED.some((w) => name.toLowerCase().includes(w));

  // 2. GUARDAR NUEVO LOTE EN LA NUBE
  const handleAddItem = async (e) => {
    e.preventDefault();
    const qty = Number(newItemForm.quantity);

    const { data, error } = await supabase
      .from('kardex_general')
      .insert([
        {
          name: newItemForm.name,
          format: newItemForm.format,
          quantity: qty,
          initialQty: qty,
          unit: newItemForm.unit,
        },
      ])
      .select();

    if (data) {
      setGeneralInventory([...generalInventory, data[0]]);
      setShowNewItem(false);
      setNewItemForm({ name: '', format: '', quantity: '', unit: 'tabs' });
    } else if (error) {
      alert('Error de conexión al guardar.');
    }
  };

  // 3. TRANSFERIR Y ACTUALIZAR EN LA NUBE
  const handleDispatch = async (e) => {
    e.preventDefault();
    const amount = Number(dispatchForm.amount);
    const newQtyGeneral = selectedItem.quantity - amount;

    // A. Descontar de Central en la nube
    await supabase
      .from('kardex_general')
      .update({ quantity: newQtyGeneral })
      .eq('id', selectedItem.id);

    // B. Sumar a Categoría en la nube
    const catInv = categoryInventories[dispatchForm.category] || [];
    const existingItem = catInv.find((i) => i.name === selectedItem.name);

    if (existingItem) {
      await supabase
        .from('kardex_categorias')
        .update({
          quantity: existingItem.quantity + amount,
          initialQty: existingItem.initialQty + amount,
        })
        .eq('id', existingItem.id);
    } else {
      await supabase.from('kardex_categorias').insert([
        {
          category: dispatchForm.category,
          name: selectedItem.name,
          quantity: amount,
          initialQty: amount,
          unit: selectedItem.unit,
        },
      ]);
    }

    // Refrescar pantalla
    fetchInventory();

    // Guardar Historial
    const log = `Transferidas ${amount} ${selectedItem.unit} de ${selectedItem.name} a la categoría ${dispatchForm.category}.`;
    const newHist = [
      {
        date: new Date().toLocaleDateString('es-ES', {
          day: '2-digit',
          month: 'short',
          hour: '2-digit',
          minute: '2-digit',
        }),
        log,
      },
      ...transferHistory,
    ];
    setTransferHistory(newHist);
    localStorage.setItem('kardexHistory', JSON.stringify(newHist));

    setShowDispatch(false);
    setDispatchForm({ category: 'Mayor', amount: '' });
  };

  // ==========================================
  // VISTAS (El diseño queda intacto)
  // ==========================================
  if (user.role === 'FISIO') {
    const fisioCat = user.categories[0];
    const miBodega = categoryInventories[fisioCat] || [];

    return (
      <div className="p-4 md:p-6 animate-fade-in">
        <h2 className="text-2xl font-extrabold text-[#000080] mb-6 flex items-center gap-2 border-b pb-2">
          <Box size={28} /> Mi Bodega:{' '}
          <span className="text-blue-500">{fisioCat}</span>
        </h2>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
          <p className="text-sm text-gray-500 mb-4">
            Inventario asignado a tu categoría. Enlazado a la nube.
          </p>

          {miBodega.length === 0 ? (
            <p className="text-gray-400 text-center py-10">
              Tu bodega está vacía. Solicita abastecimiento a Central.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {miBodega.map((item, idx) => {
                const percent = (item.quantity / item.initialQty) * 100;
                const isLow = percent <= 25;
                return (
                  <div
                    key={idx}
                    className={`p-4 rounded-xl border-l-4 shadow-sm flex justify-between items-center ${
                      isLow
                        ? 'bg-orange-50 border-orange-500'
                        : 'bg-gray-50 border-blue-500'
                    }`}
                  >
                    <div>
                      <h4 className="font-bold text-gray-800 flex items-center gap-2">
                        {isItemWada(item.name) && (
                          <span className="bg-red-600 text-white text-[10px] px-1.5 py-0.5 rounded font-bold">
                            WADA
                          </span>
                        )}
                        {item.name}
                      </h4>
                      {isLow && (
                        <p className="text-xs text-orange-600 font-bold mt-1 flex items-center gap-1">
                          <AlertTriangle size={12} /> Stock Crítico
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-extrabold text-[#000080]">
                        {item.quantity}
                      </p>
                      <p className="text-xs text-gray-500 font-bold uppercase">
                        {item.unit}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 animate-fade-in relative">
      <div className="flex justify-between items-center mb-6 border-b pb-4">
        <h2 className="text-2xl font-extrabold text-[#000080] flex items-center gap-3">
          <Pill size={28} className="text-blue-600" /> Logística Médica (Kardex)
        </h2>
        <button
          onClick={() => setShowNewItem(true)}
          className="bg-[#000080] text-white px-4 py-2 rounded-xl flex items-center gap-2 font-bold shadow-md hover:bg-blue-900 transition"
        >
          <Plus size={18} /> Nuevo Lote General
        </button>
      </div>

      <div className="flex gap-4 mb-6">
        <button
          onClick={() => setActiveTab('central')}
          className={`px-4 py-2 rounded-lg font-bold transition ${
            activeTab === 'central'
              ? 'bg-[#000080] text-white shadow-md'
              : 'bg-white text-gray-600 hover:bg-gray-100 border'
          }`}
        >
          Bodega General
        </button>
        <button
          onClick={() => setActiveTab('auditoria')}
          className={`px-4 py-2 rounded-lg font-bold transition ${
            activeTab === 'auditoria'
              ? 'bg-[#000080] text-white shadow-md'
              : 'bg-white text-gray-600 hover:bg-gray-100 border'
          }`}
        >
          Auditoría Canteras
        </button>
        <button
          onClick={() => setActiveTab('historial')}
          className={`px-4 py-2 rounded-lg font-bold transition flex items-center gap-2 ${
            activeTab === 'historial'
              ? 'bg-blue-100 text-[#000080] shadow-md border-blue-200 border'
              : 'bg-white text-gray-600 hover:bg-gray-100 border'
          }`}
        >
          <History size={16} /> Movimientos
        </button>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 mb-6">
        <h3 className="text-lg font-bold mb-3 flex items-center gap-2 text-[#000080]">
          <Search size={18} /> Buscador Inteligente WADA
        </h3>
        <input
          type="text"
          placeholder="Escriba el componente activo (Ej. Dexametasona)..."
          className="w-full border p-3 rounded-xl focus:ring-2 focus:ring-[#000080] bg-gray-50"
          value={wadaSearch}
          onChange={(e) => setWadaSearch(e.target.value)}
        />
        {wadaSearch.length > 2 && (
          <div className="mt-3 animate-fade-in">
            {checkWADA(wadaSearch) === 'BANNED' ? (
              <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-xl flex items-start gap-3">
                <AlertCircle size={24} />
                <div>
                  <p className="font-bold">¡SUSTANCIA PROHIBIDA (WADA)!</p>
                  <p className="text-sm mt-1">
                    El uso de este componente requiere una Autorización de Uso
                    Terapéutico (AUT).
                  </p>
                </div>
              </div>
            ) : (
              <div className="bg-green-50 border border-green-200 text-green-800 p-4 rounded-xl flex items-center gap-3">
                <CheckCircle size={24} />
                <p className="font-bold">
                  Sustancia no detectada en la lista de prohibiciones.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {activeTab === 'central' && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="bg-gray-50 p-4 border-b font-bold text-gray-700 flex justify-between">
            <span>Inventario Central (Nube)</span>
            <span>Acción Logística</span>
          </div>
          <div className="p-4 space-y-3">
            {generalInventory.length === 0 && (
              <p className="text-center text-gray-400 py-6">
                Sin insumos en la base de datos.
              </p>
            )}
            {generalInventory.map((item) => {
              const isLow = (item.quantity / item.initialQty) * 100 <= 25;
              const isWada = isItemWada(item.name);
              return (
                <div
                  key={item.id}
                  className="flex justify-between items-center border border-gray-100 p-4 rounded-xl hover:shadow-md transition bg-white"
                >
                  <div className="flex-1">
                    <h4 className="font-bold text-lg text-[#000080] flex items-center gap-2">
                      {isWada && (
                        <span className="bg-red-600 text-white text-[10px] px-2 py-0.5 rounded font-bold uppercase">
                          WADA
                        </span>
                      )}
                      {item.name}
                    </h4>
                    <p className="text-sm text-gray-500">{item.format}</p>
                    {isLow && (
                      <p className="text-xs text-orange-600 font-bold mt-1 flex items-center gap-1">
                        <AlertTriangle size={12} /> Alerta: Queda 25% o menos.
                      </p>
                    )}
                  </div>

                  <div className="text-center px-6 border-x border-gray-100 mr-6">
                    <p
                      className={`text-3xl font-extrabold ${
                        isLow ? 'text-orange-600' : 'text-green-600'
                      }`}
                    >
                      {item.quantity}
                    </p>
                    <p className="text-xs text-gray-500 uppercase font-bold">
                      {item.unit}
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      setSelectedItem(item);
                      setShowDispatch(true);
                    }}
                    className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 shadow transition"
                    disabled={item.quantity === 0}
                  >
                    <Send size={16} /> Transferir
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {activeTab === 'auditoria' && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-[#000080] flex items-center gap-2">
              <Activity size={20} /> Estado de Sub-Bodegas
            </h3>
            <select
              className="border border-gray-300 rounded-xl p-2 font-bold text-[#000080] bg-gray-50"
              value={auditCategory}
              onChange={(e) => setAuditCategory(e.target.value)}
            >
              <option value="Mayor">Mayor</option>
              <option value="Especial">Especial</option>
              <option value="Sub-15">Sub-15</option>
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {!categoryInventories[auditCategory] ||
            categoryInventories[auditCategory].length === 0 ? (
              <p className="text-gray-400 italic">
                No se ha enviado inventario.
              </p>
            ) : (
              categoryInventories[auditCategory].map((item, idx) => {
                const isLow = (item.quantity / item.initialQty) * 100 <= 25;
                return (
                  <div
                    key={idx}
                    className={`p-4 rounded-xl border-l-4 flex justify-between items-center ${
                      isLow
                        ? 'bg-orange-50 border-orange-500'
                        : 'bg-gray-50 border-blue-500'
                    }`}
                  >
                    <div>
                      <h4 className="font-bold text-gray-800">{item.name}</h4>
                      {isLow && (
                        <p className="text-xs text-orange-600 font-bold mt-1">
                          ¡Requiere Reabastecimiento!
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-extrabold text-[#000080]">
                        {item.quantity}
                      </p>
                      <p className="text-xs text-gray-500 font-bold uppercase">
                        {item.unit}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {activeTab === 'historial' && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
          <h3 className="text-lg font-bold text-[#000080] mb-4">
            Registro de Movimientos Logísticos
          </h3>
          <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
            {transferHistory.map((log, i) => (
              <div
                key={i}
                className="flex gap-4 items-start p-3 bg-gray-50 rounded-lg border border-gray-100"
              >
                <span className="bg-blue-100 text-blue-800 text-xs font-bold px-2 py-1 rounded-md whitespace-nowrap">
                  {log.date}
                </span>
                <p className="text-sm text-gray-700 font-medium">{log.log}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {showNewItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl relative">
            <button
              onClick={() => setShowNewItem(false)}
              className="absolute top-4 right-4 text-gray-400"
            >
              <X />
            </button>
            <h3 className="text-xl font-bold text-[#000080] mb-4 flex items-center gap-2">
              <Plus /> Abastecer Nube Central
            </h3>
            <form onSubmit={handleAddItem} className="space-y-4">
              <div>
                <label className="text-sm font-bold">Nombre del Insumo</label>
                <input
                  type="text"
                  required
                  className="w-full border p-3 rounded-xl mt-1 focus:ring-2 focus:ring-[#000080]"
                  value={newItemForm.name}
                  onChange={(e) =>
                    setNewItemForm({ ...newItemForm, name: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="text-sm font-bold">Formato</label>
                <input
                  type="text"
                  required
                  className="w-full border p-3 rounded-xl mt-1 focus:ring-2 focus:ring-[#000080]"
                  value={newItemForm.format}
                  onChange={(e) =>
                    setNewItemForm({ ...newItemForm, format: e.target.value })
                  }
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-bold">Cantidad</label>
                  <input
                    type="number"
                    required
                    className="w-full border p-3 rounded-xl mt-1 focus:ring-2 focus:ring-[#000080]"
                    value={newItemForm.quantity}
                    onChange={(e) =>
                      setNewItemForm({
                        ...newItemForm,
                        quantity: e.target.value,
                      })
                    }
                  />
                </div>
                <div>
                  <label className="text-sm font-bold">Unidad</label>
                  <select
                    className="w-full border p-3 rounded-xl mt-1"
                    value={newItemForm.unit}
                    onChange={(e) =>
                      setNewItemForm({ ...newItemForm, unit: e.target.value })
                    }
                  >
                    <option value="tabs">Tabs</option>
                    <option value="ampollas">Ampollas</option>
                    <option value="tubos">Tubos</option>
                    <option value="vendas">Vendas</option>
                  </select>
                </div>
              </div>
              <button
                type="submit"
                className="w-full bg-[#000080] text-white font-bold py-3 rounded-xl mt-2 shadow-md"
              >
                Subir a la Base de Datos
              </button>
            </form>
          </div>
        </div>
      )}

      {showDispatch && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl relative">
            <button
              onClick={() => setShowDispatch(false)}
              className="absolute top-4 right-4 text-gray-400"
            >
              <X />
            </button>
            <h3 className="text-xl font-bold text-yellow-600 mb-1 flex items-center gap-2">
              <Send size={22} /> Transferir Insumo
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              Insumo: <strong>{selectedItem?.name}</strong> (Disp:{' '}
              {selectedItem?.quantity})
            </p>
            <form onSubmit={handleDispatch} className="space-y-4">
              <div>
                <label className="text-sm font-bold">Categoría Destino</label>
                <select
                  required
                  className="w-full border p-3 rounded-xl mt-1"
                  value={dispatchForm.category}
                  onChange={(e) =>
                    setDispatchForm({
                      ...dispatchForm,
                      category: e.target.value,
                    })
                  }
                >
                  <option value="Mayor">Mayor</option>
                  <option value="Especial">Especial</option>
                  <option value="Cat A">Cat A</option>
                  <option value="Cat B">Cat B</option>
                  <option value="Sub-15">Sub-15</option>
                  <option value="Sub-13">Sub-13</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-bold">Cantidad</label>
                <input
                  type="number"
                  required
                  min="1"
                  max={selectedItem?.quantity}
                  className="w-full border p-3 rounded-xl mt-1 text-lg font-bold"
                  value={dispatchForm.amount}
                  onChange={(e) =>
                    setDispatchForm({ ...dispatchForm, amount: e.target.value })
                  }
                />
              </div>
              <button
                type="submit"
                className="w-full bg-yellow-500 text-white font-bold py-3 rounded-xl shadow-md mt-2"
              >
                Confirmar Envío a Nube
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
