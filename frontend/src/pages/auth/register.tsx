import React from 'react';
import Layout from '../../components/Layout';
import RegisterForm from '../../components/auth/RegisterForm';
import { useAuth } from '../../contexts/AuthContext';
import { useRouter } from 'next/router';

const RegisterPage: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const router = useRouter();

  // Redirect if already authenticated
  React.useEffect(() => {
    if (isAuthenticated) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, router]);

  return (
    <Layout title="Cadastro - Lyz">
      <div className="bg-gray-50 min-h-[calc(100vh-136px)] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-primary-800">Lyz</h1>
            <p className="mt-2 text-gray-600">
              Crie sua conta para acessar o sistema
            </p>
          </div>
          <RegisterForm />
        </div>
      </div>
    </Layout>
  );
};

export default RegisterPage;
