// Aplicación Principal
// Configuración de rutas y proveedores

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';

// Componentes
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';

// Páginas
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Vehiculos from './pages/Vehiculos';
import Choferes from './pages/Choferes';
import Clientes from './pages/Clientes';
import Materiales from './pages/Materiales';
import Auditoria from './pages/Auditoria';
import Viajes from './pages/Viajes';
import Mantenimientos from './pages/Mantenimientos';
import PagosChoferes from './pages/PagosChoferes';
import Analitica from './pages/Analitica';
import Documentos from './pages/Documentos';
import Liquidacion from './pages/Liquidacion';
import Neumaticos from './pages/Neumaticos';
import CuentasPorCobrar from './pages/CuentasPorCobrar';
import Repuestos from './pages/Repuestos';
import EmpresaTenant from './pages/EmpresaTenant';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Ruta pública */}
          <Route path="/login" element={<Login />} />

          {/* Rutas protegidas */}
          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/vehiculos" element={<Vehiculos />} />
              <Route path="/neumaticos" element={<Neumaticos />} />
              <Route path="/mantenimientos" element={<Mantenimientos />} />
              <Route path="/repuestos" element={<Repuestos />} />
              <Route path="/choferes" element={<Choferes />} />
              <Route path="/pagos-choferes" element={<PagosChoferes />} />
              <Route path="/clientes" element={<Clientes />} />
              <Route path="/cuentas-cobrar" element={<CuentasPorCobrar />} />
              <Route path="/materiales" element={<Materiales />} />
              <Route path="/viajes" element={<Viajes />} />
              <Route path="/viajes/:id/liquidacion" element={<Liquidacion />} />
              <Route path="/analitica" element={<Analitica />} />
              <Route path="/documentos" element={<Documentos />} />
              <Route path="/empresa" element={<EmpresaTenant />} />
              <Route path="/auditoria" element={<Auditoria />} />
            </Route>
          </Route>

          {/* Redirigir rutas no encontradas */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>

      {/* Notificaciones Toast */}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#ffffff',
            color: '#232b3b',
            border: '1px solid #c2cad7',
            borderRadius: '4px',
            boxShadow: '0 4px 12px rgba(15, 23, 42, 0.10)',
            fontSize: '0.875rem',
            padding: '10px 14px',
          },
          success: {
            iconTheme: {
              primary: '#206d4d',
              secondary: '#ffffff',
            },
          },
          error: {
            iconTheme: {
              primary: '#9b2d2d',
              secondary: '#ffffff',
            },
          },
        }}
      />
    </AuthProvider>
  );
}

export default App;
