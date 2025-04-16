import React, { useState } from 'react';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import { useAuth } from '../../contexts/AuthContext';
import Link from 'next/link';

// Step 1: Email validation schema
const EmailValidationSchema = Yup.object().shape({
  email: Yup.string()
    .email('Email inválido')
    .required('Email é obrigatório'),
});

// Step 2: Registration schema
const RegistrationSchema = Yup.object().shape({
  name: Yup.string().required('Nome é obrigatório'),
  email: Yup.string()
    .email('Email inválido')
    .required('Email é obrigatório'),
  password: Yup.string()
    .min(8, 'Senha deve ter pelo menos 8 caracteres')
    .matches(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
      'Senha deve conter pelo menos uma letra maiúscula, uma minúscula, um número e um caractere especial'
    )
    .required('Senha é obrigatória'),
  confirmPassword: Yup.string()
    .oneOf([Yup.ref('password')], 'Senhas não conferem')
    .required('Confirmação de senha é obrigatória'),
});

const RegisterForm: React.FC = () => {
  const { validateEmail, register, loading } = useAuth();
  const [step, setStep] = useState<number>(1);
  const [serverError, setServerError] = useState<string | null>(null);
  const [validatedUser, setValidatedUser] = useState<any>(null);

  const handleEmailValidation = async (values: { email: string }) => {
    setServerError(null);
    try {
      const response = await validateEmail(values.email);
      // Store validated user data from API response
      setValidatedUser({
        ...response.userData,
        email: values.email
      });
      setStep(2);
    } catch (err: any) {
      setServerError(
        err.response?.data?.message || 
        'Falha na validação do email. Verifique se está cadastrado no Curseduca.'
      );
    }
  };

  const handleRegistration = async (values: any) => {
    setServerError(null);
    try {
      // Verificar se temos os dados do usuário validado
      if (!validatedUser || !validatedUser.id) {
        throw new Error('Dados de usuário inválidos. Por favor, volte e valide seu email novamente.');
      }
      
      // Register with validated user data
      await register({
        curseduca_id: validatedUser.id,
        name: validatedUser.name || values.name,
        email: validatedUser.email || values.email,
        password: values.password,
      });
    } catch (err: any) {
      setServerError(
        err.response?.data?.message || 
        'Falha no registro. Tente novamente.'
      );
    }
  };

  return (
    <div className="card max-w-md w-full mx-auto">
      <div className="card-header">
        <h2 className="text-center text-xl font-bold text-gray-800">
          {step === 1 ? 'Validação de Email' : 'Complete seu Registro'}
        </h2>
      </div>
      <div className="card-body">
        {step === 1 ? (
          // Step 1: Email validation form
          <Formik
            initialValues={{ email: '' }}
            validationSchema={EmailValidationSchema}
            onSubmit={handleEmailValidation}
          >
            {({ isSubmitting }) => (
              <Form className="space-y-6">
                <div>
                  <p className="text-sm text-gray-600 mb-4">
                    Digite seu email para validarmos seu cadastro no Curseduca.
                  </p>
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
                    {loading ? 'Validando...' : 'Validar Email'}
                  </button>
                </div>

                <div className="text-center text-sm">
                  <p className="text-gray-600">
                    Já possui conta?{' '}
                    <Link href="/auth/login" className="text-primary-600 hover:text-primary-700 font-medium">
                      Entrar
                    </Link>
                  </p>
                </div>
              </Form>
            )}
          </Formik>
        ) : (
          // Step 2: Registration form
          <Formik
            initialValues={{
              name: validatedUser?.name || '',
              email: validatedUser?.email || '',
              password: '',
              confirmPassword: '',
            }}
            enableReinitialize={true}
            validationSchema={RegistrationSchema}
            onSubmit={handleRegistration}
          >
            {({ isSubmitting }) => (
              <Form className="space-y-6">
                <div>
                  <label htmlFor="name" className="form-label">Nome</label>
                  <Field
                    type="text"
                    name="name"
                    id="name"
                    className="input-field bg-gray-100"
                    disabled
                  />
                  <ErrorMessage name="name" component="div" className="error-message" />
                </div>

                <div>
                  <label htmlFor="email" className="form-label">Email</label>
                  <Field
                    type="email"
                    name="email"
                    id="email"
                    className="input-field bg-gray-100"
                    disabled
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
                  />
                  <ErrorMessage name="password" component="div" className="error-message" />
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="form-label">Confirmar Senha</label>
                  <Field
                    type="password"
                    name="confirmPassword"
                    id="confirmPassword"
                    className="input-field"
                  />
                  <ErrorMessage name="confirmPassword" component="div" className="error-message" />
                </div>

                {serverError && (
                  <div className="bg-red-50 p-3 rounded-md">
                    <p className="text-red-600 text-sm">{serverError}</p>
                  </div>
                )}

                <div className="flex space-x-3">
                  <button
                    type="button"
                    className="btn-secondary w-1/2"
                    onClick={() => setStep(1)}
                  >
                    Voltar
                  </button>
                  <button
                    type="submit"
                    className="btn-primary w-1/2"
                    disabled={loading || isSubmitting}
                  >
                    {loading ? 'Registrando...' : 'Registrar'}
                  </button>
                </div>
              </Form>
            )}
          </Formik>
        )}
      </div>
    </div>
  );
};

export default RegisterForm;
