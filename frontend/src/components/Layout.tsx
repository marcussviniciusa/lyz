import React from 'react';
import Head from 'next/head';
import { useAuth } from '../contexts/AuthContext';
import Link from 'next/link';
import { useRouter } from 'next/router';

interface LayoutProps {
  children: React.ReactNode;
  title?: string;
}

const Layout: React.FC<LayoutProps> = ({ 
  children, 
  title = 'Lyz - Planos Cíclicos Personalizados' 
}) => {
  const { user, logout, isAuthenticated, isSuperadmin } = useAuth();
  const router = useRouter();

  return (
    <>
      <Head>
        <title>{title}</title>
        <meta name="description" content="Sistema Lyz para planos personalizados baseados em ciclicidade feminina" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="min-h-screen flex flex-col">
        {/* Header */}
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex">
                <div className="flex-shrink-0 flex items-center">
                  <Link href="/" className="text-2xl font-bold text-primary-600">
                    Lyz
                  </Link>
                </div>
                
                {isAuthenticated && (
                  <nav className="ml-6 flex space-x-8">
                    <Link 
                      href="/dashboard" 
                      className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                        router.pathname === '/dashboard' 
                          ? 'border-primary-500 text-gray-900' 
                          : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                      }`}
                    >
                      Dashboard
                    </Link>
                    
                    <Link 
                      href="/plans" 
                      className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                        router.pathname.startsWith('/plans') 
                          ? 'border-primary-500 text-gray-900' 
                          : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                      }`}
                    >
                      Meus Planos
                    </Link>

                    {isSuperadmin && (
                      <Link 
                        href="/admin/dashboard" 
                        className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                          router.pathname.startsWith('/admin') 
                            ? 'border-primary-500 text-gray-900' 
                            : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                        }`}
                      >
                        Administração
                      </Link>
                    )}
                  </nav>
                )}
              </div>
              
              <div className="flex items-center">
                {isAuthenticated ? (
                  <div className="flex items-center space-x-4">
                    <span className="text-sm text-gray-700">
                      Olá, {user?.name.split(' ')[0]}
                    </span>
                    <button
                      onClick={logout}
                      className="text-sm text-gray-700 hover:text-primary-600"
                    >
                      Sair
                    </button>
                  </div>
                ) : (
                  <div className="flex space-x-4">
                    <Link 
                      href="/auth/login"
                      className="text-sm font-medium text-gray-700 hover:text-primary-600"
                    >
                      Entrar
                    </Link>
                    <Link 
                      href="/auth/register"
                      className="text-sm font-medium bg-primary-600 text-white px-3 py-1 rounded-md hover:bg-primary-700"
                    >
                      Registrar
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Main content */}
        <main className="flex-grow">
          {children}
        </main>

        {/* Footer */}
        <footer className="bg-white border-t border-gray-200 py-4 mt-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <p className="text-center text-sm text-gray-500">
              &copy; {new Date().getFullYear()} Lyz Healthcare. Todos os direitos reservados.
            </p>
          </div>
        </footer>
      </div>
    </>
  );
};

export default Layout;
