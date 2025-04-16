import React, { useState } from 'react';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import { useAuth } from '../../contexts/AuthContext';
import Link from 'next/link';

const LoginSchema = Yup.object().shape({
  email: Yup.string()
    .email('Email inválido')
    .required('Email é obrigatório'),
  password: Yup.string()
    .required('Senha é obrigatória')
});

const LoginForm: React.FC = () => {
  const { login, loading, error } = useAuth();
  const [serverError, setServerError] = useState<string | null>(error);

  const handleSubmit = async (values: { email: string; password: string }) => {
    setServerError(null);
    try {
      await login(values.email, values.password);
    } catch (err: any) {
      setServerError(err.message || 'Falha no login. Tente novamente.');
    }
  };

  return (
    <div className="card max-w-md w-full mx-auto">
      <div className="card-header">
        <h2 className="text-center text-xl font-bold text-gray-800">Entrar no Sistema Lyz</h2>
      </div>
      <div className="card-body">
        <Formik
          initialValues={{ email: '', password: '' }}
          validationSchema={LoginSchema}
          onSubmit={handleSubmit}
        >
          {({ isSubmitting }) => (
            <Form className="space-y-6">
              <div>
                <label htmlFor="email" className="form-label">Email</label>
                <Field
                  type="email"
                  name="email"
                  id="email"
                  className="input-field"
                  placeholder="seu.email@exemplo.com"
                />
                <ErrorMessage name="email" component="div" className="error-message" />
              </div>

              <div>
                <label htmlFor="password" className="form-label">Senha</label>
                <Field
                  type="password"
                  name="password"
                  id="password"
                  className="input-field"
                  placeholder="••••••••"
                />
                <ErrorMessage name="password" component="div" className="error-message" />
              </div>

              {serverError && (
                <div className="bg-red-50 p-3 rounded-md">
                  <p className="text-red-600 text-sm">{serverError}</p>
                </div>
              )}

              <div>
                <button
                  type="submit"
                  className="btn-primary w-full"
                  disabled={loading || isSubmitting}
                >
                  {loading ? 'Entrando...' : 'Entrar'}
                </button>
              </div>

              <div className="text-center text-sm">
                <p className="text-gray-600">
                  Não possui conta?{' '}
                  <Link href="/auth/register" className="text-primary-600 hover:text-primary-700 font-medium">
                    Registre-se
                  </Link>
                </p>
              </div>
            </Form>
          )}
        </Formik>
      </div>
    </div>
  );
};

export default LoginForm;
