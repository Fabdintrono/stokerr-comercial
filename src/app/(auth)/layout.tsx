import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Login - Stocker",
  description: "Iniciar sesión en Stocker - Sistema de Gestión de Inventario",
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2">
      {/* Left side - Image/Branding */}
      <div className="hidden lg:flex flex-col justify-center items-center bg-gradient-to-br from-emerald-900/50 via-zinc-950 to-zinc-950 p-12 relative overflow-hidden">
        {/* Background effects */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-500/20 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />
        
        <div className="relative z-10 text-center">
          <div className="w-20 h-20 rounded-2xl bg-emerald-500 shadow-lg shadow-emerald-500/25 flex items-center justify-center mx-auto mb-8">
            <svg className="w-10 h-10 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
              <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
              <line x1="12" y1="22.08" x2="12" y2="12" />
            </svg>
          </div>
          <h1 className="text-4xl font-bold text-white mb-4">Stocker</h1>
          <p className="text-zinc-400 text-lg max-w-md mb-6">
            Sistema de gestión de inventario y POS para restaurantes
          </p>
          <p className="text-zinc-600 text-sm">
            By Tecnocom USA Corp
          </p>
        </div>
      </div>
      
      {/* Right side - Auth form */}
      <div className="flex items-center justify-center p-8 bg-zinc-950">
        {children}
      </div>
    </div>
  );
}