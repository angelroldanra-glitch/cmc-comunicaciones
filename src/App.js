import React, { useState, useEffect } from 'react';
import {
  Users,
  CalendarDays,
  LogOut,
  ShieldPlus,
  UserCircle,
  Pill,
  Apple,
  HeartPulse,
  BarChart3,
  ChevronRight,
} from 'lucide-react';
import Login from './Login';
import Roster from './Roster';
import Matriz from './Matriz';
import Kardex from './Kardex';
import Nutricion from './Nutricion';
import Triage from './Triage';
import Estadisticas from './Estadisticas';

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [activeTab, setActiveTab] = useState('roster');
  const [activeCategory, setActiveCategory] = useState('Todas');

  // Auto-dirigir a Nutrición si es el rol NUTRI
  useEffect(() => {
    if (currentUser && currentUser.role === 'NUTRI') {
      setActiveTab('nutrition');
    } else if (currentUser) {
      setActiveTab('roster');
    }
  }, [currentUser]);

  if (!currentUser) return <Login onLogin={setCurrentUser} />;

  // REGLAS ESTRICTAS DE VISIBILIDAD
  const isNutri = currentUser.role === 'NUTRI';
  const canSeeRoster = !isNutri;
  const canSeeMatrix = !isNutri;
  const canSeeTriage =
    currentUser.role === 'DIRECTOR' || currentUser.role === 'FISIO';
  const canSeePharmacy =
    currentUser.role === 'DIRECTOR' || currentUser.role === 'FISIO';
  const canSeeNutrition = true; // Todos lo ven, pero los permisos de edición están dentro del módulo

  // CORRECCIÓN 1: Habilitar Estadísticas para los Fisios
  const canSeeStats =
    currentUser.role === 'DIRECTOR' || currentUser.role === 'FISIO';

  const todasLasCategorias = [
    'Todas',
    'Mayor',
    'Especial',
    'Cat A',
    'Cat B',
    'Sub-15',
    'Sub-13',
  ];
  const categoriasMenu = todasLasCategorias.filter(
    (cat) =>
      currentUser.categories.includes('ALL') ||
      currentUser.categories.includes(cat) ||
      cat === 'Todas'
  );

  return (
    <div className="flex h-screen bg-gray-100 font-sans text-gray-900 overflow-hidden">
      <div className="w-64 bg-gradient-to-b from-[#000080] to-blue-900 shadow-2xl flex flex-col justify-between transition-all">
        <div>
          <div className="p-6 text-center border-b border-blue-800">
            <ShieldPlus className="mx-auto text-white mb-2" size={32} />
            <h1 className="font-bold text-xl tracking-tight text-white">
              Comunicaciones
            </h1>
            <p className="text-xs text-blue-300 uppercase tracking-widest mt-1">
              Clínica
            </p>
          </div>

          <nav className="flex-1 overflow-y-auto py-6 space-y-2 px-4">
            {canSeeRoster && (
              <div className="mb-2">
                <button
                  onClick={() => {
                    setActiveTab('roster');
                    setActiveCategory('Todas');
                  }}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all ${
                    activeTab === 'roster'
                      ? 'bg-white/10 text-white font-bold shadow-inner'
                      : 'text-blue-200 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Users size={20} /> Roster Clínico
                  </div>
                </button>
                {activeTab === 'roster' && (
                  <div className="ml-7 mt-2 pl-3 border-l border-blue-700/50 space-y-1">
                    {categoriasMenu.map((cat) => (
                      <button
                        key={cat}
                        onClick={() => setActiveCategory(cat)}
                        className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all flex items-center gap-2 ${
                          activeCategory === cat
                            ? 'bg-blue-800 text-white font-bold shadow-sm'
                            : 'text-blue-300 hover:text-white hover:bg-white/5'
                        }`}
                      >
                        {activeCategory === cat && (
                          <ChevronRight size={14} className="text-blue-400" />
                        )}{' '}
                        {cat}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {canSeeMatrix && (
              <button
                onClick={() => setActiveTab('matrix')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                  activeTab === 'matrix'
                    ? 'bg-white/10 text-white font-bold shadow-inner'
                    : 'text-blue-200 hover:bg-white/5 hover:text-white'
                }`}
              >
                <CalendarDays size={20} /> Matriz Diaria
              </button>
            )}
            {canSeeTriage && (
              <button
                onClick={() => setActiveTab('triage')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                  activeTab === 'triage'
                    ? 'bg-red-500/20 text-white font-bold shadow-inner border border-red-500/30'
                    : 'text-blue-200 hover:bg-white/5 hover:text-white'
                }`}
              >
                <HeartPulse
                  size={20}
                  className={activeTab === 'triage' ? 'text-red-400' : ''}
                />{' '}
                Triage Canteras
              </button>
            )}
            {canSeePharmacy && (
              <button
                onClick={() => setActiveTab('pharmacy')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                  activeTab === 'pharmacy'
                    ? 'bg-white/10 text-white font-bold shadow-inner'
                    : 'text-blue-200 hover:bg-white/5 hover:text-white'
                }`}
              >
                <Pill size={20} /> Kardex / WADA
              </button>
            )}
            {canSeeNutrition && (
              <button
                onClick={() => setActiveTab('nutrition')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                  activeTab === 'nutrition'
                    ? 'bg-white/10 text-white font-bold shadow-inner'
                    : 'text-blue-200 hover:bg-white/5 hover:text-white'
                }`}
              >
                <Apple size={20} /> Nutrición
              </button>
            )}
            {canSeeStats && (
              <button
                onClick={() => setActiveTab('stats')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all mt-4 border-t border-blue-800/50 pt-4 ${
                  activeTab === 'stats'
                    ? 'bg-white/10 text-white font-bold shadow-inner'
                    : 'text-blue-200 hover:bg-white/5 hover:text-white'
                }`}
              >
                <BarChart3 size={20} /> Epidemiología
              </button>
            )}
          </nav>
        </div>

        <div className="p-4 bg-black/20 m-4 rounded-xl border border-white/10">
          <div className="flex items-center gap-3 mb-4">
            <UserCircle className="text-blue-300" size={24} />
            <div>
              <p className="text-sm font-bold text-white leading-tight">
                {currentUser.name}
              </p>
              <p className="text-xs text-blue-300">{currentUser.role}</p>
            </div>
          </div>
          <button
            onClick={() => setCurrentUser(null)}
            className="w-full bg-red-500/20 text-red-200 py-2 rounded-lg text-sm font-bold hover:bg-red-500 hover:text-white transition-colors flex items-center justify-center gap-2"
          >
            <LogOut size={16} /> Salir
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="bg-white h-16 shadow-sm flex items-center px-8 justify-between z-10">
          <h2 className="text-xl font-bold text-gray-700 capitalize">
            {activeTab === 'pharmacy'
              ? 'Kardex y Farmacia'
              : activeTab === 'nutrition'
              ? 'Cineantropometría'
              : activeTab === 'roster'
              ? `Roster Clínico: ${activeCategory}`
              : activeTab.replace('-', ' ')}
          </h2>
          <span className="bg-blue-50 text-[#000080] px-3 py-1 rounded-full text-sm font-bold border border-blue-100">
            Modo Activo: {currentUser.role}
          </span>
        </header>

        <main className="flex-1 overflow-y-auto bg-gray-50">
          {activeTab === 'roster' && canSeeRoster && (
            <Roster user={currentUser} categoryFilter={activeCategory} />
          )}
          {activeTab === 'matrix' && canSeeMatrix && (
            <Matriz user={currentUser} categoryFilter={activeCategory} />
          )}
          {activeTab === 'triage' && canSeeTriage && (
            <Triage user={currentUser} />
          )}
          {activeTab === 'pharmacy' && canSeePharmacy && (
            <Kardex user={currentUser} />
          )}
          {activeTab === 'nutrition' && canSeeNutrition && (
            <Nutricion user={currentUser} categoryFilter={activeCategory} />
          )}

          {/* CORRECCIÓN 2: Inyectar user y categoryFilter en Estadísticas */}
          {activeTab === 'stats' && canSeeStats && (
            <Estadisticas user={currentUser} categoryFilter={activeCategory} />
          )}
        </main>
      </div>
    </div>
  );
}
