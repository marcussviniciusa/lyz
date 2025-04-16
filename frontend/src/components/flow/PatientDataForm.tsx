import React, { useState } from 'react';
import { Formik, Form, Field, ErrorMessage, FormikProps, FormikHelpers } from 'formik';
import * as Yup from 'yup';

interface PatientDataFormProps {
  onSubmit: (data: any) => void;
  onBack: () => void;
}

interface PatientDataValues {
  name: string;
  age: string;
  height: string;
  weight: string;
  menarche_age: string;
  cycle_length: string;
  period_length: string;
  is_menopausal: boolean;
  uses_contraceptive: boolean;
  last_period_date: string;
  symptoms: string[];
  medical_history: string;
  family_history: string;
  allergies: string;
  previous_treatments: string;
  current_medications: string;
  current_supplements: string;
  sleep_quality: string;
  sleep_hours: string;
  exercise_frequency: string;
  exercise_type: string;
  stress_level: string;
  nutrition_quality: string;
  relationship_quality: string;
  treatment_goals: string;
  additional_notes?: string;
}

const PatientDataSchema = Yup.object().shape({
  name: Yup.string().required('Nome da paciente é obrigatório'),
  age: Yup.number()
    .required('Idade é obrigatória')
    .positive('Idade deve ser um número positivo')
    .integer('Idade deve ser um número inteiro'),
  height: Yup.number()
    .positive('Altura deve ser um número positivo'),
  weight: Yup.number()
    .positive('Peso deve ser um número positivo'),
  menarche_age: Yup.number()
    .positive('Idade da menarca deve ser um número positivo')
    .integer('Idade da menarca deve ser um número inteiro'),
  cycle_length: Yup.number()
    .positive('Duração do ciclo deve ser um número positivo')
    .integer('Duração do ciclo deve ser um número inteiro'),
  period_length: Yup.number()
    .positive('Duração do período menstrual deve ser um número positivo')
    .integer('Duração do período menstrual deve ser um número inteiro'),
  is_menopausal: Yup.boolean(),
  uses_contraceptive: Yup.boolean(),
  last_period_date: Yup.date().nullable(),
  symptoms: Yup.array()
    .of(Yup.string())
    .min(1, 'Adicione pelo menos um sintoma principal')
    .max(5, 'Limite máximo de 5 sintomas atingido'),
  medical_history: Yup.string(),
  family_history: Yup.string(),
  allergies: Yup.string(),
  previous_treatments: Yup.string(),
  current_medications: Yup.string(),
  current_supplements: Yup.string(),
  sleep_quality: Yup.string(),
  sleep_hours: Yup.number().positive('Horas de sono deve ser um número positivo'),
  exercise_frequency: Yup.string(),
  exercise_type: Yup.string(),
  stress_level: Yup.string(),
  nutrition_quality: Yup.string(),
  relationship_quality: Yup.string(),
  treatment_goals: Yup.string().required('Objetivos do tratamento são obrigatórios'),
  additional_notes: Yup.string(),
});

const PatientDataForm: React.FC<PatientDataFormProps> = ({ onSubmit, onBack }) => {
  const [showExtraInfoModal, setShowExtraInfoModal] = useState(false);
  const [showExtraInfoField, setShowExtraInfoField] = useState(false);
  const [formValues, setFormValues] = useState<PatientDataValues | null>(null);
  
  const handleFormSubmit = (values: any, actions: FormikHelpers<any>) => {
    setFormValues(values);
    setShowExtraInfoModal(true);
    actions.setSubmitting(false);
  };
  
  const handleExtraInfoSubmit = (includeExtra: boolean) => {
    if (!formValues) return;
    
    if (includeExtra) {
      // Mostrar o campo para inserir informações adicionais
      setShowExtraInfoField(true);
    } else {
      // Prosseguir diretamente sem informações extras
      onSubmit(formValues);
      setShowExtraInfoModal(false);
    }
  };
  
  const handleFinalSubmit = () => {
    if (!formValues) return;
    onSubmit(formValues);
    setShowExtraInfoModal(false);
    setShowExtraInfoField(false);
  };
  return (
    <div className="max-w-3xl mx-auto">
      <div className="card">
        <div className="card-header">
          <h2 className="text-center text-xl font-bold text-gray-800">
            Dados da Paciente
          </h2>
        </div>
        <div className="card-body">
          <p className="text-gray-600 mb-6">
            Preencha as informações da paciente para personalização do plano cíclico.
          </p>

          <Formik
            initialValues={{
              name: '',
              age: '',
              height: '',
              weight: '',
              menarche_age: '',
              cycle_length: '',
              period_length: '',
              is_menopausal: false,
              uses_contraceptive: false,
              last_period_date: '',
              symptoms: [],
              medical_history: '',
              family_history: '',
              allergies: '',
              previous_treatments: '',
              current_medications: '',
              current_supplements: '',
              sleep_quality: '',
              sleep_hours: '',
              exercise_frequency: '',
              exercise_type: '',
              stress_level: '',
              nutrition_quality: '',
              relationship_quality: '',
              treatment_goals: '',
              additional_notes: '',
            }}
            validationSchema={PatientDataSchema}
            onSubmit={handleFormSubmit}
          >
            {({ isSubmitting }) => (
              <Form className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Informações Básicas */}
                  <div className="col-span-2">
                    <h3 className="text-lg font-medium text-gray-800 mb-4 border-b pb-2">
                      Informações Básicas
                    </h3>
                  </div>
                  
                  <div>
                    <label htmlFor="name" className="form-label">Nome Completo *</label>
                    <Field type="text" name="name" id="name" className="input-field" />
                    <ErrorMessage name="name" component="div" className="error-message" />
                  </div>
                  
                  <div>
                    <label htmlFor="age" className="form-label">Idade *</label>
                    <Field type="number" name="age" id="age" className="input-field" />
                    <ErrorMessage name="age" component="div" className="error-message" />
                  </div>
                  
                  <div>
                    <label htmlFor="height" className="form-label">Altura (cm)</label>
                    <Field type="number" name="height" id="height" className="input-field" />
                    <ErrorMessage name="height" component="div" className="error-message" />
                  </div>
                  
                  <div>
                    <label htmlFor="weight" className="form-label">Peso (kg)</label>
                    <Field type="number" name="weight" id="weight" className="input-field" />
                    <ErrorMessage name="weight" component="div" className="error-message" />
                  </div>
                  
                  {/* Histórico Menstrual */}
                  <div className="col-span-2">
                    <h3 className="text-lg font-medium text-gray-800 mb-4 border-b pb-2 mt-4">
                      Histórico Menstrual
                    </h3>
                  </div>
                  
                  <div>
                    <label htmlFor="menarche_age" className="form-label">Idade da Menarca</label>
                    <Field type="number" name="menarche_age" id="menarche_age" className="input-field" />
                    <ErrorMessage name="menarche_age" component="div" className="error-message" />
                  </div>
                  
                  <div>
                    <label htmlFor="cycle_length" className="form-label">Duração do Ciclo (dias)</label>
                    <Field type="number" name="cycle_length" id="cycle_length" className="input-field" />
                    <ErrorMessage name="cycle_length" component="div" className="error-message" />
                  </div>
                  
                  <div>
                    <label htmlFor="period_length" className="form-label">Duração da Menstruação (dias)</label>
                    <Field type="number" name="period_length" id="period_length" className="input-field" />
                    <ErrorMessage name="period_length" component="div" className="error-message" />
                  </div>
                  
                  <div className="flex items-center">
                    <Field 
                      type="checkbox" 
                      name="is_menopausal" 
                      id="is_menopausal"
                      className="h-4 w-4 text-primary-600 rounded" 
                    />
                    <label htmlFor="is_menopausal" className="ml-2 form-label">
                      Está em Climatério/Menopausa
                    </label>
                  </div>
                  
                  <div>
                    <label htmlFor="last_period_date" className="form-label">Data da Última Menstruação</label>
                    <Field type="date" name="last_period_date" id="last_period_date" className="input-field" />
                    <ErrorMessage name="last_period_date" component="div" className="error-message" />
                  </div>
                  
                  <div className="flex items-center">
                    <Field 
                      type="checkbox" 
                      name="uses_contraceptive" 
                      id="uses_contraceptive"
                      className="h-4 w-4 text-primary-600 rounded" 
                    />
                    <label htmlFor="uses_contraceptive" className="ml-2 form-label">
                      Uso de Contraceptivos
                    </label>
                  </div>
                  
                  {/* Sintomas Principais */}
                  <div className="col-span-2">
                    <h3 className="text-lg font-medium text-gray-800 mb-4 border-b pb-2 mt-4">
                      Sintomas Principais
                    </h3>
                    <p className="text-sm text-gray-600 mb-4">
                      Adicione até 5 sintomas principais apresentados pela paciente, em ordem de urgência/importância. 
                      O primeiro sintoma adicionado será considerado o mais urgente/importante.
                    </p>
                  </div>
                  
                  <div className="col-span-2">
                    <Field>
                      {({ form }: { form: FormikProps<any> }) => {
                        const { values, setFieldValue } = form;
                        const [currentSymptom, setCurrentSymptom] = useState('');
                        
                        const addSymptom = () => {
                          if (!currentSymptom.trim()) return;
                          if (values.symptoms.length >= 5) return;
                          
                          setFieldValue('symptoms', [...values.symptoms, currentSymptom.trim()]);
                          setCurrentSymptom('');
                        };
                        
                        const removeSymptom = (index: number) => {
                          const newSymptoms = [...values.symptoms];
                          newSymptoms.splice(index, 1);
                          setFieldValue('symptoms', newSymptoms);
                        };
                        
                        const moveSymptom = (index: number, direction: 'up' | 'down') => {
                          if (
                            (direction === 'up' && index === 0) || 
                            (direction === 'down' && index === values.symptoms.length - 1)
                          ) return;
                          
                          const newSymptoms = [...values.symptoms];
                          const targetIndex = direction === 'up' ? index - 1 : index + 1;
                          
                          [newSymptoms[index], newSymptoms[targetIndex]] = 
                            [newSymptoms[targetIndex], newSymptoms[index]];
                          
                          setFieldValue('symptoms', newSymptoms);
                        };
                        
                        return (
                          <div>
                            <div className="flex mb-4">
                              <input
                                type="text"
                                value={currentSymptom}
                                onChange={(e) => setCurrentSymptom(e.target.value)}
                                className="input-field flex-grow mr-2"
                                placeholder="Descreva o sintoma"
                                disabled={values.symptoms.length >= 5}
                              />
                              <button
                                type="button"
                                onClick={addSymptom}
                                disabled={!currentSymptom.trim() || values.symptoms.length >= 5}
                                className="btn-primary whitespace-nowrap"
                              >
                                Adicionar
                              </button>
                            </div>
                            
                            {values.symptoms.length === 0 && (
                              <div className="text-red-500 text-sm mb-2">
                                Adicione pelo menos um sintoma principal
                              </div>
                            )}
                            
                            {values.symptoms.length >= 5 && (
                              <div className="text-amber-600 text-sm mb-2">
                                Limite máximo de 5 sintomas atingido
                              </div>
                            )}
                            
                            <div className="space-y-2">
                              {values.symptoms.map((symptom: string, index: number) => (
                                <div key={index} className="flex items-center bg-gray-50 p-2 rounded border text-gray-800">
                                  <span className="font-medium mr-2 text-gray-800">#{index + 1}</span>
                                  <span className="flex-grow text-gray-800">{symptom}</span>
                                  <div className="flex space-x-1">
                                    <button
                                      type="button"
                                      onClick={() => moveSymptom(index, 'up')}
                                      disabled={index === 0}
                                      className="text-gray-500 hover:text-gray-700 disabled:opacity-30 p-1"
                                      title="Mover para cima"
                                    >
                                      ↑
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => moveSymptom(index, 'down')}
                                      disabled={index === values.symptoms.length - 1}
                                      className="text-gray-500 hover:text-gray-700 disabled:opacity-30 p-1"
                                      title="Mover para baixo"
                                    >
                                      ↓
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => removeSymptom(index)}
                                      className="text-red-500 hover:text-red-700 p-1"
                                      title="Remover"
                                    >
                                      ×
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                            
                            <ErrorMessage name="symptoms" component="div" className="error-message mt-2" />
                          </div>
                        );
                      }}
                    </Field>
                  </div>
                  
                  {/* Histórico de Saúde */}
                  <div className="col-span-2">
                    <h3 className="text-lg font-medium text-gray-800 mb-4 border-b pb-2 mt-4">
                      Histórico de Saúde
                    </h3>
                  </div>
                  
                  <div>
                    <label htmlFor="medical_history" className="form-label">Histórico Médico</label>
                    <Field 
                      as="textarea" 
                      name="medical_history" 
                      id="medical_history" 
                      rows={3}
                      className="input-field" 
                      placeholder="Descreva condições médicas prévias e atuais"
                    />
                    <ErrorMessage name="medical_history" component="div" className="error-message" />
                  </div>
                  
                  <div>
                    <label htmlFor="family_history" className="form-label">Histórico Familiar</label>
                    <Field 
                      as="textarea" 
                      name="family_history" 
                      id="family_history" 
                      rows={3}
                      className="input-field" 
                      placeholder="Histórico de doenças na família"
                    />
                    <ErrorMessage name="family_history" component="div" className="error-message" />
                  </div>
                  
                  <div>
                    <label htmlFor="allergies" className="form-label">Alergias e Intolerâncias</label>
                    <Field 
                      as="textarea" 
                      name="allergies" 
                      id="allergies" 
                      rows={2}
                      className="input-field" 
                      placeholder="Alergias alimentares, medicamentosas, etc."
                    />
                    <ErrorMessage name="allergies" component="div" className="error-message" />
                  </div>
                  
                  <div>
                    <label htmlFor="previous_treatments" className="form-label">Tratamentos Anteriores</label>
                    <Field 
                      as="textarea" 
                      name="previous_treatments" 
                      id="previous_treatments" 
                      rows={2}
                      className="input-field" 
                      placeholder="Procedimentos ou tratamentos relevantes"
                    />
                    <ErrorMessage name="previous_treatments" component="div" className="error-message" />
                  </div>
                  
                  <div>
                    <label htmlFor="current_medications" className="form-label">Medicamentos Atuais</label>
                    <Field 
                      as="textarea" 
                      name="current_medications" 
                      id="current_medications" 
                      rows={2}
                      className="input-field" 
                      placeholder="Nome, dosagem e frequência"
                    />
                    <ErrorMessage name="current_medications" component="div" className="error-message" />
                  </div>
                  
                  <div>
                    <label htmlFor="current_supplements" className="form-label">Suplementos Atuais</label>
                    <Field 
                      as="textarea" 
                      name="current_supplements" 
                      id="current_supplements" 
                      rows={2}
                      className="input-field" 
                      placeholder="Nome, dosagem e frequência"
                    />
                    <ErrorMessage name="current_supplements" component="div" className="error-message" />
                  </div>
                  
                  {/* Estilo de Vida */}
                  <div className="col-span-2">
                    <h3 className="text-lg font-medium text-gray-800 mb-4 border-b pb-2 mt-4">
                      Estilo de Vida
                    </h3>
                  </div>
                  
                  <div>
                    <label htmlFor="sleep_quality" className="form-label">Qualidade do Sono</label>
                    <Field as="select" name="sleep_quality" id="sleep_quality" className="input-field">
                      <option value="">Selecione</option>
                      <option value="bom">Bom</option>
                      <option value="regular">Regular</option>
                      <option value="ruim">Ruim</option>
                    </Field>
                    <ErrorMessage name="sleep_quality" component="div" className="error-message" />
                  </div>
                  
                  <div>
                    <label htmlFor="sleep_hours" className="form-label">Horas de Sono por Noite</label>
                    <Field type="number" name="sleep_hours" id="sleep_hours" className="input-field" />
                    <ErrorMessage name="sleep_hours" component="div" className="error-message" />
                  </div>
                  
                  <div>
                    <label htmlFor="exercise_frequency" className="form-label">Frequência de Exercícios</label>
                    <Field as="select" name="exercise_frequency" id="exercise_frequency" className="input-field">
                      <option value="">Selecione</option>
                      <option value="diario">Diário</option>
                      <option value="2-3x semana">2-3 vezes por semana</option>
                      <option value="1x semana">1 vez por semana</option>
                      <option value="raramente">Raramente</option>
                      <option value="nunca">Nunca</option>
                    </Field>
                    <ErrorMessage name="exercise_frequency" component="div" className="error-message" />
                  </div>
                  
                  <div>
                    <label htmlFor="exercise_type" className="form-label">Tipo de Exercício</label>
                    <Field type="text" name="exercise_type" id="exercise_type" className="input-field" />
                    <ErrorMessage name="exercise_type" component="div" className="error-message" />
                  </div>
                  
                  <div>
                    <label htmlFor="stress_level" className="form-label">Nível de Estresse</label>
                    <Field as="select" name="stress_level" id="stress_level" className="input-field">
                      <option value="">Selecione</option>
                      <option value="baixo">Baixo</option>
                      <option value="moderado">Moderado</option>
                      <option value="alto">Alto</option>
                    </Field>
                    <ErrorMessage name="stress_level" component="div" className="error-message" />
                  </div>
                  
                  <div>
                    <label htmlFor="nutrition_quality" className="form-label">Nutrição</label>
                    <Field as="select" name="nutrition_quality" id="nutrition_quality" className="input-field">
                      <option value="">Selecione</option>
                      <option value="bom">Bom</option>
                      <option value="regular">Regular</option>
                      <option value="ruim">Ruim</option>
                    </Field>
                    <ErrorMessage name="nutrition_quality" component="div" className="error-message" />
                  </div>
                  
                  <div>
                    <label htmlFor="relationship_quality" className="form-label">Relacionamentos</label>
                    <Field as="select" name="relationship_quality" id="relationship_quality" className="input-field">
                      <option value="">Selecione</option>
                      <option value="bom">Bom</option>
                      <option value="regular">Regular</option>
                      <option value="ruim">Ruim</option>
                    </Field>
                    <ErrorMessage name="relationship_quality" component="div" className="error-message" />
                  </div>
                  
                  <div className="col-span-2">
                    <label htmlFor="treatment_goals" className="form-label">Objetivos do Tratamento *</label>
                    <Field 
                      as="textarea" 
                      name="treatment_goals" 
                      id="treatment_goals" 
                      rows={4}
                      className="input-field" 
                    />
                    <ErrorMessage name="treatment_goals" component="div" className="error-message" />
                  </div>
                </div>

                <div className="flex justify-between pt-4">
                  <button
                    type="button"
                    onClick={onBack}
                    className="btn-secondary"
                  >
                    Voltar
                  </button>
                  <button
                    type="submit"
                    className="btn-primary"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? 'Salvando...' : 'Continuar'}
                  </button>
                </div>
              </Form>
            )}
          </Formik>
          
          {/* Modal para Informações Extras */}
          {showExtraInfoModal && (
            <div className="fixed inset-0 bg-gray-600 bg-opacity-70 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Informações Adicionais
                </h3>
                <p className="text-gray-600 mb-6">
                  Deseja adicionar alguma informação extra relevante sobre a paciente?
                </p>
                
                {showExtraInfoField ? (
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Informações Adicionais
                    </label>
                    <textarea
                      value={formValues?.additional_notes || ''}
                      onChange={(e) => setFormValues(prev => prev ? {...prev, additional_notes: e.target.value} : null)}
                      className="w-full p-2 border border-gray-300 rounded-md"
                      rows={4}
                      placeholder="Informe detalhes adicionais relevantes sobre o caso"
                      autoFocus
                    />
                    
                    <div className="flex justify-end space-x-3 mt-6">
                      <button
                        type="button"
                        onClick={() => {
                          setShowExtraInfoField(false);
                          setShowExtraInfoModal(false);
                        }}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        onClick={handleFinalSubmit}
                        className="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-md"
                      >
                        Salvar e Continuar
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-center space-x-4">
                    <button
                      type="button"
                      onClick={() => handleExtraInfoSubmit(false)}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
                    >
                      Não, continuar
                    </button>
                    <button
                      type="button"
                      onClick={() => handleExtraInfoSubmit(true)}
                      className="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-md"
                    >
                      Sim, adicionar
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PatientDataForm;
