import React from 'react';
import Layout from '../components/Layout';
import Link from 'next/link';
import { useAuth } from '../contexts/AuthContext';

const HomePage: React.FC = () => {
  const { isAuthenticated } = useAuth();

  return (
    <Layout title="Lyz - Planos Cíclicos Personalizados">
      {/* Hero Section */}
      <div className="bg-gradient-to-b from-primary-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div>
              <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 leading-tight">
                Planos Personalizados de <span className="text-primary-600">Ciclicidade Feminina</span>
              </h1>
              <p className="mt-6 text-xl text-gray-600">
                Lyz é a primeira assistente especializada em criar planos personalizados baseados na ciclicidade feminina, auxiliando profissionais de saúde a fornecerem recomendações precisas e eficazes.
              </p>
              <div className="mt-10 flex flex-col sm:flex-row gap-4">
                {isAuthenticated ? (
                  <Link href="/dashboard" className="btn-primary px-8 py-3 text-center text-lg">
                    Acessar Dashboard
                  </Link>
                ) : (
                  <>
                    <Link href="/auth/register" className="btn-primary px-8 py-3 text-center text-lg">
                      Começar Agora
                    </Link>
                    <Link href="/auth/login" className="btn-secondary px-8 py-3 text-center text-lg">
                      Fazer Login
                    </Link>
                  </>
                )}
              </div>
            </div>
            <div className="flex justify-center">
              <div className="w-full max-w-md h-96 bg-primary-100 rounded-lg flex items-center justify-center">
                <p className="text-primary-500 text-lg font-medium">Imagem ilustrativa aqui</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900">Desenvolvido para Profissionais de Saúde</h2>
            <p className="mt-4 text-xl text-gray-600 max-w-3xl mx-auto">
              Ofereça atendimento personalizado baseado na ciclicidade feminina com o apoio da inteligência artificial.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-gray-50 p-6 rounded-lg">
              <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Planos Personalizados</h3>
              <p className="text-gray-600">
                Crie planos específicos respeitando as diferentes fases do ciclo menstrual, garantindo uma abordagem verdadeiramente personalizada.
              </p>
            </div>

            <div className="bg-gray-50 p-6 rounded-lg">
              <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Análise de Exames</h3>
              <p className="text-gray-600">
                Faça upload de exames laboratoriais para análise automática e integração com as recomendações para cada fase do ciclo.
              </p>
            </div>

            <div className="bg-gray-50 p-6 rounded-lg">
              <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Matriz IFM</h3>
              <p className="text-gray-600">
                Preencha a matriz do Instituto de Medicina Funcional de forma assistida, integrando dados da paciente automaticamente.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* How It Works Section */}
      <div className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900">Como Funciona</h2>
            <p className="mt-4 text-xl text-gray-600 max-w-3xl mx-auto">
              Um processo simples e eficiente para criar planos cíclicos personalizados para suas pacientes.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-primary-600">1</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Cadastro de Dados</h3>
              <p className="text-gray-600">
                Insira os dados da paciente e informações relevantes sobre seu ciclo e saúde.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-primary-600">2</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Análise de Exames</h3>
              <p className="text-gray-600">
                Upload e análise de exames laboratoriais para entendimento completo da saúde da paciente.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-primary-600">3</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Geração do Plano</h3>
              <p className="text-gray-600">
                A IA processa todas as informações e cria um plano personalizado para cada fase do ciclo.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-primary-600">4</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Compartilhamento</h3>
              <p className="text-gray-600">
                Envie o plano para sua paciente em formato PDF ou DOCX, pronto para implementação.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-primary-700 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white">Pronto para Começar?</h2>
          <p className="mt-4 text-xl text-primary-100 max-w-3xl mx-auto">
            Junte-se aos profissionais que já estão transformando o atendimento em saúde feminina.
          </p>
          <div className="mt-8">
            {isAuthenticated ? (
              <Link href="/dashboard" className="btn-primary bg-white text-primary-700 px-8 py-3 text-lg">
                Acessar Dashboard
              </Link>
            ) : (
              <Link href="/auth/register" className="btn-primary bg-white text-primary-700 px-8 py-3 text-lg">
                Criar Conta Gratuita
              </Link>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default HomePage;
