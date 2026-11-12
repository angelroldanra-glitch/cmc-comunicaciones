import React, { useState } from 'react';
import { ShieldPlus, KeyRound, User } from 'lucide-react';

const usersDB = [
  // --- DIRECTIVA Y GERENCIA (Acceso Global) ---
  {
    username: 'c.caceres',
    password: 'comunicaciones2026',
    name: 'Cristian Caceres (Presidente)',
    role: 'DIRECTOR',
    categories: ['ALL'],
  },
  {
    username: 'jm.contreras',
    password: 'comunicaciones2026',
    name: 'Jose Manuel Contreras (Gerente)',
    role: 'DIRECTOR',
    categories: ['ALL'],
  },

  // --- DIRECCIÓN MÉDICA ---
  {
    username: 'dr.angel',
    password: 'Angel56057049',
    name: 'Dr. Angel Roldan (Dir. Médico)',
    role: 'DIRECTOR',
    categories: ['ALL'],
  },

  // --- FISIOTERAPIA (LFT) ---
  {
    username: 'lft.mayor1',
    password: 'cremas2026',
    name: 'Lic. Javier (LFT Mayor 1)', // Aquí luego pones el nombre real
    role: 'FISIO',
    categories: ['Mayor'],
  },
  {
    username: 'lft.mayor2',
    password: 'cremas2026',
    name: 'LFT Mayor 2 (Crio/Masajes)', // Este es el único autorizado para Crio/Masajes
    role: 'FISIO',
    categories: ['Mayor'],
  },
  {
    username: 'lft.especial',
    password: 'cremas2026',
    name: 'LFT Especial',
    role: 'FISIO',
    categories: ['Especial'],
  },
  {
    username: 'lft.cata',
    password: 'cremas2026',
    name: 'LFT Cat A',
    role: 'FISIO',
    categories: ['Cat A'],
  },
  {
    username: 'lft.catb',
    password: 'cremas2026',
    name: 'LFT Cat B',
    role: 'FISIO',
    categories: ['Cat B'],
  },
  {
    username: 'lft.sub15',
    password: 'cremas2026',
    name: 'LFT Sub-15',
    role: 'FISIO',
    categories: ['Sub-15'],
  },
  {
    username: 'lft.sub13',
    password: 'cremas2026',
    name: 'LFT Sub-13',
    role: 'FISIO',
    categories: ['Sub-13'],
  },

  // --- CUERPO TÉCNICO (Sin acceso a expedientes clínicos, solo Matriz y Roster básico) ---
  {
    username: 'ct.mayor',
    password: 'cremas2026',
    name: 'Cuerpo Técnico Mayor',
    role: 'CT', // IMPORTANTE: Cambiado a CT (Cuerpo Técnico) para evitar conflictos con PF
    categories: ['Mayor', 'Especial'], // ACCESO A ESPECIAL AGREGADO AQUÍ
  },
  {
    username: 'ct.especial',
    password: 'cremas2026',
    name: 'Cuerpo Técnico Especial',
    role: 'CT',
    categories: ['Especial'],
  },
  {
    username: 'ct.cata',
    password: 'cremas2026',
    name: 'Cuerpo Técnico Cat A',
    role: 'CT',
    categories: ['Cat A'],
  },
  {
    username: 'ct.catb',
    password: 'cremas2026',
    name: 'Cuerpo Técnico Cat B',
    role: 'CT',
    categories: ['Cat B'],
  },
  {
    username: 'ct.sub15',
    password: 'cremas2026',
    name: 'Cuerpo Técnico Sub-15',
    role: 'CT',
    categories: ['Sub-15'],
  },
  {
    username: 'ct.sub13',
    password: 'cremas2026',
    name: 'Cuerpo Técnico Sub-13',
    role: 'CT',
    categories: ['Sub-13'],
  },

  // --- PREPARACIÓN FÍSICA Y NUTRICIÓN ---
  {
    username: 'pf.general',
    password: 'cremas2026',
    name: 'Preparador Físico General',
    role: 'PF',
    categories: ['ALL'],
  },
  {
    username: 'lic.nutricion',
    password: 'cremas2026',
    name: 'Licda. Nutrición',
    role: 'NUTRI',
    categories: ['ALL'],
  },
];

export default function Login({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = (e) => {
    e.preventDefault();
    const user = usersDB.find(
      (u) => u.username === username.toLowerCase() && u.password === password
    );
    if (user) {
      onLogin(user);
    } else {
      setError('Credenciales incorrectas');
    }
  };

  return (
    <div className="flex h-screen bg-gray-100 items-center justify-center font-sans">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border-t-4 border-[#000080]">
        <div className="text-center mb-8">
          <ShieldPlus className="mx-auto text-[#000080] mb-3" size={48} />
          <h1 className="text-2xl font-black text-gray-800 tracking-tight">
            Comunicaciones F.C.
          </h1>
          <p className="text-sm text-gray-500 font-bold mt-1 uppercase tracking-widest">
            Plataforma Médica
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">
              Usuario
            </label>
            <div className="relative">
              <User className="absolute left-3 top-3 text-gray-400" size={18} />
              <input
                type="text"
                className="w-full pl-10 pr-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-[#000080] bg-gray-50 text-gray-800"
                placeholder="Ej. usuario"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">
              Contraseña
            </label>
            <div className="relative">
              <KeyRound
                className="absolute left-3 top-3 text-gray-400"
                size={18}
              />
              <input
                type="password"
                className="w-full pl-10 pr-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-[#000080] bg-gray-50 text-gray-800"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          {error && (
            <p className="text-red-500 text-sm font-bold text-center bg-red-50 py-2 rounded-lg">
              {error}
            </p>
          )}

          <button
            type="submit"
            className="w-full bg-[#000080] hover:bg-blue-900 text-white font-bold py-3 rounded-xl shadow-lg transition-all flex justify-center items-center gap-2"
          >
            Ingresar al Sistema
          </button>
        </form>
      </div>
    </div>
  );
}
