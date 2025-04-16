import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../components/Layout';
import ProfessionSelector from '../../components/flow/ProfessionSelector';
import PatientDataForm from '../../components/flow/PatientDataForm';
import { useAuth } from '../../contexts/AuthContext';
import { planAPI } from '../../lib/api';

enum PlanCreationStep {
  PROFESSION_SELECTION = 1,
  PATIENT_DATA = 2,
}

const NewPlanPage: React.FC = () => {
  const [currentStep, setCurrentStep] = useState<PlanCreationStep>(PlanCreationStep.PROFESSION_SELECTION);
  const [profession, setProfession] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const { isAuthenticated, loading: authLoading } = useAuth();
  const router = useRouter();

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/auth/login');
    }
  }, [isAuthenticated, authLoading, router]);

  const handleProfessionSelect = (selectedProfession: string) => {
    setProfession(selectedProfession);
    setCurrentStep(PlanCreationStep.PATIENT_DATA);
  };

  const handleBack = () => {
    if (currentStep === PlanCreationStep.PATIENT_DATA) {
      setCurrentStep(PlanCreationStep.PROFESSION_SELECTION);
    }
  };

  const handlePatientDataSubmit = async (patientData: any) => {
    setLoading(true);
    setError(null);

    try {
      // Start new plan
      const response = await planAPI.startPlan({
        professional_type: profession,
        patient_data: patientData,
      });

      // Redirect to the newly created plan
      router.push(`/plans/${response.data.plan_id}`);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao criar plano. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return <div className="flex justify-center items-center h-screen">Carregando...</div>;
  }

  return (
    <Layout title="Novo Plano - Lyz">
      <div className="bg-gray-50 min-h-[calc(100vh-136px)] py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Novo Plano</h1>
            <p className="mt-2 text-gray-600">
              Criação de plano cíclico personalizado para sua paciente
            </p>
          </div>

          {/* Progress Steps */}
          <div className="mb-8">
            <div className="flex items-center justify-center">
              <ol className="flex items-center w-full max-w-3xl">
                <li className={`flex items-center text-primary-600 ${currentStep >= PlanCreationStep.PROFESSION_SELECTION ? 'font-semibold' : ''}`}>
                  <span className={`flex items-center justify-center w-8 h-8 rounded-full ${
                    currentStep >= PlanCreationStep.PROFESSION_SELECTION ? 'bg-primary-100' : 'bg-gray-100'
                  } ${
                    currentStep > PlanCreationStep.PROFESSION_SELECTION ? 'text-primary-600' : ''
                  }`}>
                    1
                  </span>
                  <span className="ml-2">Área de Atuação</span>
                </li>
                <div className="w-16 h-0.5 mx-2 bg-gray-200"></div>
                <li className={`flex items-center ${currentStep >= PlanCreationStep.PATIENT_DATA ? 'text-primary-600 font-semibold' : 'text-gray-500'}`}>
                  <span className={`flex items-center justify-center w-8 h-8 rounded-full ${
                    currentStep >= PlanCreationStep.PATIENT_DATA ? 'bg-primary-100' : 'bg-gray-100'
                  }`}>
                    2
                  </span>
                  <span className="ml-2">Dados da Paciente</span>
                </li>
                <div className="w-16 h-0.5 mx-2 bg-gray-200"></div>
                <li className="flex items-center text-gray-500">
                  <span className="flex items-center justify-center w-8 h-8 bg-gray-100 rounded-full">
                    3
                  </span>
                  <span className="ml-2">Questionário</span>
                </li>
                <div className="w-16 h-0.5 mx-2 bg-gray-200"></div>
                <li className="flex items-center text-gray-500">
                  <span className="flex items-center justify-center w-8 h-8 bg-gray-100 rounded-full">
                    4
                  </span>
                  <span className="ml-2">Exames</span>
                </li>
              </ol>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-8 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative">
              <strong className="font-bold">Erro:</strong>
              <span className="block sm:inline"> {error}</span>
            </div>
          )}

          {/* Current Step Content */}
          {currentStep === PlanCreationStep.PROFESSION_SELECTION && (
            <ProfessionSelector onProfessionSelect={handleProfessionSelect} />
          )}

          {currentStep === PlanCreationStep.PATIENT_DATA && (
            <PatientDataForm 
              onSubmit={handlePatientDataSubmit} 
              onBack={handleBack} 
            />
          )}
        </div>
      </div>
    </Layout>
  );
};

export default NewPlanPage;
