import React from 'react';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';

interface ProfessionSelectorProps {
  onProfessionSelect: (profession: string) => void;
}

const ProfessionSchema = Yup.object().shape({
  profession: Yup.string()
    .required('Selecione uma profissão')
});

const ProfessionSelector: React.FC<ProfessionSelectorProps> = ({ onProfessionSelect }) => {
  return (
    <div className="max-w-2xl mx-auto">
      <div className="card">
        <div className="card-header">
          <h2 className="text-center text-xl font-bold text-gray-800">
            Selecione sua Área de Atuação
          </h2>
        </div>
        <div className="card-body">
          <p className="text-gray-600 mb-6">
            Esta seleção ajudará a personalizar o plano gerado de acordo com seu escopo de atuação profissional.
          </p>

          <Formik
            initialValues={{ profession: '' }}
            validationSchema={ProfessionSchema}
            onSubmit={(values) => {
              onProfessionSelect(values.profession);
            }}
          >
            {({ isSubmitting }) => (
              <Form className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center">
                    <Field
                      type="radio"
                      name="profession"
                      id="medical_nutritionist"
                      value="medical_nutritionist"
                      className="h-5 w-5 text-primary-600"
                    />
                    <label htmlFor="medical_nutritionist" className="ml-3 block text-gray-700">
                      <span className="font-medium">Médico/Nutricionista</span>
                      <p className="text-sm text-gray-500">
                        Plano incluirá recomendações de suplementação com dosagens específicas.
                      </p>
                    </label>
                  </div>

                  <div className="flex items-center">
                    <Field
                      type="radio"
                      name="profession"
                      id="other_professional"
                      value="other_professional"
                      className="h-5 w-5 text-primary-600"
                    />
                    <label htmlFor="other_professional" className="ml-3 block text-gray-700">
                      <span className="font-medium">Outro Profissional</span>
                      <p className="text-sm text-gray-500">
                        Plano incluirá recomendações gerais sem dosagens específicas de suplementação.
                      </p>
                    </label>
                  </div>

                  <ErrorMessage name="profession" component="div" className="error-message" />
                </div>

                <div className="flex justify-center">
                  <button
                    type="submit"
                    className="btn-primary px-8"
                    disabled={isSubmitting}
                  >
                    Continuar
                  </button>
                </div>
              </Form>
            )}
          </Formik>
        </div>
      </div>
    </div>
  );
};

export default ProfessionSelector;
