import React, { useState } from 'react';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import { authAPI } from '../../lib/api';
import Link from 'next/link';

const ForgotPasswordSchema = Yup.object().shape({
  email: Yup.string()
    .email('Email inválido')
    .required('Email é obrigatório')
});

const ForgotPasswordForm: React.FC = () => {
  const [step, setStep] = useState<'email' | 'new-password' | 'success'>('email');
  const [validatedEmail, setValidatedEmail] = useState<string>('');
  const [cursEducaData, setCursEducaData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleEmailValidation = async (values: { email: string }) => {
    setLoading(true);
    setError(null);

    try {
      // Usar a API de validação com purpose específico para reset de senha
      const response = await authAPI.validateEmail(values.email, 'reset-password');
      
      if (response.data.userData) {
        setValidatedEmail(values.email);
        setCursEducaData(response.data.userData);
        setStep('new-password');
      }
    } catch (err: any) {
      const message = err.response?.data?.message || 'Email não encontrado no sistema Curseduca';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async (values: { password: string; confirmPassword: string }) => {
    setLoading(true);
    setError(null);

    try {
      // Chamar API de reset de senha
      await authAPI.resetPassword({
        email: validatedEmail,
        newPassword: values.password,
        cursEducaData: cursEducaData
      });
      
      setStep('success');
    } catch (err: any) {
      const message = err.response?.data?.message || 'Erro ao redefinir senha. Tente novamente.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  if (step === 'email') {
    return (
      <div className="card max-w-md w-full mx-auto">
        <div className="card-header">
          <h2 className="text-center text-xl font-bold text-gray-800">Recuperar Senha</h2>
        </div>
        <div className="card-body">
          <p className="text-gray-600 text-sm mb-4">
            Informe o email cadastrado no Curseduca para redefinir sua senha.
          </p>
          
          <Formik
            initialValues={{ email: '' }}
            validationSchema={ForgotPasswordSchema}
            onSubmit={handleEmailValidation}
            enableReinitialize={true}
          >
            {({ isSubmitting }) => (
              <Form className="space-y-6">
                <div>
                  <label htmlFor="email" className="form-label">Email do Curseduca</label>
                  <Field
                    type="email"
                    name="email"
                    id="email"
                    className="input-field"
                    placeholder="seu.email@exemplo.com"
                  />
                  <ErrorMessage name="email" component="div" className="error-message" />
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 p-3 rounded-md">
                    <p className="text-red-600 text-sm font-medium">{error}</p>
                  </div>
                )}

                <div>
                  <button
                    type="submit"
                    className="btn-primary w-full"
                    disabled={loading || isSubmitting}
                  >
                    {loading ? 'Verificando...' : 'Verificar Email'}
                  </button>
                </div>

                <div className="text-center">
                  <Link 
                    href="/auth/login" 
                    className="text-sm text-gray-600 hover:text-gray-800"
                  >
                    ← Voltar para o login
                  </Link>
                </div>
              </Form>
            )}
          </Formik>
        </div>
      </div>
    );
  }

  if (step === 'new-password') {
    const NewPasswordSchema = Yup.object().shape({
      password: Yup.string()
        .min(6, 'Senha deve ter pelo menos 6 caracteres')
        .required('Nova senha é obrigatória'),
      confirmPassword: Yup.string()
        .oneOf([Yup.ref('password')], 'Senhas não coincidem')
        .required('Confirmação de senha é obrigatória')
    });

    return (
      <div className="card max-w-md w-full mx-auto">
        <div className="card-header">
          <h2 className="text-center text-xl font-bold text-gray-800">Nova Senha</h2>
        </div>
        <div className="card-body">
          <div className="bg-green-50 border border-green-200 p-3 rounded-md mb-4">
            <p className="text-green-700 text-sm">
              Email validado: <strong>{validatedEmail}</strong>
            </p>
          </div>
          
          <Formik
            initialValues={{ password: '', confirmPassword: '' }}
            validationSchema={NewPasswordSchema}
            onSubmit={handlePasswordReset}
            enableReinitialize={true}
          >
            {({ isSubmitting }) => (
              <Form className="space-y-6">
                <div>
                  <label htmlFor="password" className="form-label">Nova Senha</label>
                  <Field
                    type="password"
                    name="password"
                    id="password"
                    className="input-field"
                    placeholder="••••••••"
                  />
                  <ErrorMessage name="password" component="div" className="error-message" />
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="form-label">Confirmar Nova Senha</label>
                  <Field
                    type="password"
                    name="confirmPassword"
                    id="confirmPassword"
                    className="input-field"
                    placeholder="••••••••"
                  />
                  <ErrorMessage name="confirmPassword" component="div" className="error-message" />
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 p-3 rounded-md">
                    <p className="text-red-600 text-sm font-medium">{error}</p>
                  </div>
                )}

                <div>
                  <button
                    type="submit"
                    className="btn-primary w-full"
                    disabled={loading || isSubmitting}
                  >
                    {loading ? 'Redefinindo...' : 'Redefinir Senha'}
                  </button>
                </div>

                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setStep('email');
                      setError(null);
                    }}
                    className="text-sm text-gray-600 hover:text-gray-800"
                  >
                    ← Voltar
                  </button>
                </div>
              </Form>
            )}
          </Formik>
        </div>
      </div>
    );
  }

  if (step === 'success') {
    return (
      <div className="card max-w-md w-full mx-auto">
        <div className="card-header">
          <h2 className="text-center text-xl font-bold text-gray-800">Senha Redefinida</h2>
        </div>
        <div className="card-body text-center space-y-4">
          <div className="bg-green-50 border border-green-200 p-4 rounded-md">
            <p className="text-green-700 font-medium">
              ✅ Senha redefinida com sucesso!
            </p>
          </div>
          
          <p className="text-gray-600 text-sm">
            Sua senha foi alterada. Agora você pode fazer login com a nova senha.
          </p>

          <Link
            href="/auth/login"
            className="btn-primary inline-block w-full text-center"
          >
            Ir para o Login
          </Link>
        </div>
      </div>
    );
  }

  return null;
};

export default ForgotPasswordForm; 