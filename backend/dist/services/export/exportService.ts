import * as fs from 'fs';
import * as path from 'path';
import * as util from 'util';
import { minioClient } from '../../config/minio';
import { PatientPlan } from '../../models';
import nodemailer from 'nodemailer';
import * as docx from 'docx';
import { Document, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, BorderStyle } from 'docx';

// Importar puppeteer de forma segura usando uma função que tenta importá-lo apenas quando necessário
let puppeteerLoaded = false;
let puppeteer: any = null;

const loadPuppeteer = async () => {
  if (puppeteerLoaded) return puppeteer;
  
  try {
    puppeteer = await import('puppeteer');
    puppeteerLoaded = true;
    return puppeteer;
  } catch (error) {
    console.error('Erro ao carregar puppeteer:', error);
    return null;
  }
}

// Helper function to generate formatted HTML for the plan
const generatePlanHTML = (plan: any): string => {
  try {
    // Verificar se o plano existe
    if (!plan) {
      throw new Error('Plano não encontrado');
    }

    // Garantir que temos objetos válidos, mesmo que vazios
    const patientData = plan.patient_data || {};
    const finalPlan = plan.final_plan || {};

    // Criar o conteúdo HTML
    let html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Plano Personalizado - Lyz</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.4; color: #333; margin: 0; padding: 20px; }
          h1 { color: #6a1b9a; margin-top: 0; margin-bottom: 15px; }
          h2 { color: #9c27b0; border-bottom: 1px solid #e0e0e0; padding-bottom: 8px; margin-top: 25px; margin-bottom: 15px; }
          h3 { color: #ab47bc; margin-top: 20px; margin-bottom: 12px; }
          h4 { color: #7b1fa2; margin-top: 15px; margin-bottom: 8px; }
          p { margin: 8px 0; line-height: 1.5; }
          ul, ol { margin: 10px 0; padding-left: 25px; }
          li { margin-bottom: 6px; }
          .header { text-align: center; margin-bottom: 25px; padding: 15px; background-color: #f9f4fc; border-radius: 8px; }
          .section { margin-bottom: 30px; }
          .subsection { margin-bottom: 20px; }
          .patient-info { background-color: #f3e5f5; padding: 15px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); margin-bottom: 25px; }
          .recommendations { margin-left: 0; background-color: #fff; padding: 12px; border-radius: 5px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
          .recommendations h4 { margin-top: 12px; }
          .recommendations p { margin: 6px 0; }
          .footer { text-align: center; margin-top: 40px; padding-top: 15px; border-top: 1px solid #eee; font-size: 0.8em; color: #9e9e9e; }
          .phase { background-color: #faf3fb; padding: 15px; margin-bottom: 15px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
          .page-break { page-break-after: always; }
          strong { color: #333; font-weight: 600; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Plano Personalizado</h1>
          <p>Gerado por Lyz - Especialista em Saúde Integrativa</p>
          <p>${new Date().toLocaleDateString('pt-BR')}</p>
        </div>
        
        <div class="section patient-info">
          <h2 style="margin-top: 0; margin-bottom: 12px;">Informações do Paciente</h2>
          <div style="display: flex; flex-wrap: wrap; gap: 12px;">
            <div style="flex: 1; min-width: 200px;"><strong>Nome:</strong> ${patientData.name || 'Não informado'}</div>
            <div style="min-width: 100px;"><strong>Idade:</strong> ${patientData.age || 'Não informada'}</div>
            ${(patientData.birthdate || patientData.birth_date || patientData.birthday || patientData.dob) ? `<div style="min-width: 200px;"><strong>Data de Nascimento:</strong> ${patientData.birthdate || patientData.birth_date || patientData.birthday || patientData.dob}</div>` : ''}
            ${(patientData.gender || patientData.sex || patientData.female || patientData.male) ? `<div style="min-width: 120px;"><strong>Gênero:</strong> ${patientData.gender || patientData.sex || (patientData.female ? 'Feminino' : patientData.male ? 'Masculino' : '')}</div>` : ''}
          </div>
        </div>
        
        <div class="section">
          <h2>Plano Terapêutico</h2>
    `;
    
    // Adicionar seção de diagnóstico se disponível
    if (finalPlan.diagnosis) {
      let diagnosisContent = '';
      
      // Verificar se o conteúdo é um objeto e formatá-lo adequadamente
      if (typeof finalPlan.diagnosis === 'object') {
        try {
          diagnosisContent = JSON.stringify(finalPlan.diagnosis, null, 2)
            .replace(/[{}",\[\]]/g, '')
            .replace(/:/g, ': ')
            .replace(/\n\s*/g, '<br>');
        } catch (e) {
          diagnosisContent = finalPlan.diagnosis?.toString() || 'Não informado';
        }
      } else {
        diagnosisContent = finalPlan.diagnosis;
      }
      
      html += `
        <div class="subsection">
          <h3>Diagnóstico</h3>
          <div class="recommendations">
            ${diagnosisContent}
          </div>
        </div>
      `;
    }

    // Adicionar seção de tratamento se disponível
    if (finalPlan.treatment_plan) {
      let treatmentContent = '';
      
      // Verificar se o conteúdo é um objeto ou array e formatá-lo adequadamente
      if (typeof finalPlan.treatment_plan === 'object') {
        try {
          if (Array.isArray(finalPlan.treatment_plan)) {
            treatmentContent = '<ol>'
              + finalPlan.treatment_plan.map(item => `<li>${item}</li>`).join('')
              + '</ol>';
          } else {
            // Plano de tratamento deve ter itens numerados um abaixo do outro
            treatmentContent = '<ol>'
              + Object.entries(finalPlan.treatment_plan)
                .map(([key, value], index) => `<li>${value}</li>`)
                .join('')
              + '</ol>';
          }
        } catch (e) {
          treatmentContent = finalPlan.treatment_plan?.toString() || 'Não informado';
        }
      } else {
        treatmentContent = finalPlan.treatment_plan;
      }
      
      html += `
        <div class="subsection">
          <h3>Plano de Tratamento</h3>
          <div class="recommendations">
            ${treatmentContent}
          </div>
        </div>
      `;
    }

    // Adicionar recomendações nutricionais se disponíveis
    if (finalPlan.nutritional_recommendations || finalPlan.dietary_recommendations) {
      const nutritionalRecs = finalPlan.nutritional_recommendations || finalPlan.dietary_recommendations || {};
      
      html += `
        <div class="subsection">
          <h3>Recomendações Nutricionais</h3>
          <div class="recommendations">
      `;
      
      // Alimentos a Incluir
      if (nutritionalRecs.foods_to_include) {
        html += `
          <h4>Alimentos a Incluir</h4>
          <p>${nutritionalRecs.foods_to_include}</p>
        `;
      }
      
      // Alimentos a Evitar
      if (nutritionalRecs.foods_to_avoid) {
        html += `
          <h4>Alimentos a Evitar</h4>
          <p>${nutritionalRecs.foods_to_avoid}</p>
        `;
      }
      
      // Horários das Refeições
      if (nutritionalRecs.meal_timing) {
        html += `
          <h4>Horários das Refeições</h4>
          <p>${nutritionalRecs.meal_timing}</p>
        `;
      }
      
      // Suplementação
      if (nutritionalRecs.supplements) {
        html += `
          <h4>Suplementação</h4>
          <p>${nutritionalRecs.supplements}</p>
        `;
      }
      
      // Caso seja um formato antigo ou diferente
      if (typeof nutritionalRecs === 'string' || !Object.keys(nutritionalRecs).some(k => ['foods_to_include', 'foods_to_avoid', 'meal_timing', 'supplements'].includes(k))) {
        let dietaryContent = '';
        
        if (typeof nutritionalRecs === 'object') {
          try {
            if (Array.isArray(nutritionalRecs)) {
              dietaryContent = '<ul>'
                + nutritionalRecs.map(item => `<li>${item}</li>`).join('')
                + '</ul>';
            } else {
              dietaryContent = Object.entries(nutritionalRecs)
                .map(([key, value]) => `<p><strong>${key}:</strong> ${value}</p>`)
                .join('');
            }
          } catch (e) {
            dietaryContent = String(nutritionalRecs) || 'Não informado';
          }
        } else {
          dietaryContent = String(nutritionalRecs);
        }
        
        html += dietaryContent;
      }
      
      html += `
          </div>
        </div>
      `;
    }

    // Adicionar recomendações de estilo de vida se disponíveis
    if (finalPlan.lifestyle_recommendations) {
      const recommendations = finalPlan.lifestyle_recommendations;
      
      html += `
        <div class="subsection">
          <h3>Recomendações de Estilo de Vida</h3>
          <div class="recommendations">
      `;
      
      // Exercícios Físicos
      if (recommendations.exercise) {
        html += `
          <h4>Exercícios Físicos</h4>
          <p>${recommendations.exercise}</p>
        `;
      }
      
      // Sono
      if (recommendations.sleep) {
        html += `
          <h4>Sono</h4>
          <p>${recommendations.sleep}</p>
        `;
      }
      
      // Gerenciamento de Estresse
      if (recommendations.stress_management) {
        html += `
          <h4>Gerenciamento de Estresse</h4>
          <p>${recommendations.stress_management}</p>
        `;
      }
      
      // Outras Recomendações
      if (recommendations.other) {
        html += `
          <h4>Outras Recomendações</h4>
          <p>${recommendations.other}</p>
        `;
      }
      
      // Qualquer outra chave que pode existir
      const handledKeys = ['exercise', 'sleep', 'stress_management', 'other'];
      Object.entries(recommendations).forEach(([key, value]) => {
        if (!handledKeys.includes(key) && value) {
          // Traduzir as chaves de inglês para português ou removê-las
          const translations = {
            'nutrition': 'Nutrição',
            'hydration': 'Hidratação',
            'mindfulness': 'Atenção Plena',
            'relaxation': 'Relaxamento',
            'social': 'Social'
          };
          
          const translatedKey = translations[key] || key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' ');
          
          html += `
            <h4>${translatedKey}</h4>
            <p>${value}</p>
          `;
        }
      });
      
      html += `
          </div>
        </div>
      `;
    }
    
    // Adicionar plano de acompanhamento se disponível
    if (finalPlan.follow_up) {
      let followUpContent = '';
      
      // Verificar se o conteúdo é um objeto e formatá-lo adequadamente
      if (typeof finalPlan.follow_up === 'object') {
        try {
          if (Array.isArray(finalPlan.follow_up)) {
            followUpContent = '<ul>'
              + finalPlan.follow_up.map(item => `<li>${item}</li>`).join('')
              + '</ul>';
          } else {
            followUpContent = Object.entries(finalPlan.follow_up)
              .map(([key, value]) => `<p><strong>${key}:</strong> ${value}</p>`)
              .join('');
          }
        } catch (e) {
          followUpContent = finalPlan.follow_up?.toString() || 'Não informado';
        }
      } else {
        followUpContent = finalPlan.follow_up;
      }
      
      html += `
        <div class="subsection">
          <h3>Plano de Acompanhamento</h3>
          <div class="recommendations">
            ${followUpContent}
          </div>
        </div>
      `;
    }

    // Adicionar observações adicionais se disponíveis
    if (finalPlan.additional_notes || finalPlan.notes) {
      const notes = finalPlan.additional_notes || finalPlan.notes;
      let notesContent = '';
      
      // Verificar se o conteúdo é um objeto e formatá-lo adequadamente
      if (typeof notes === 'object') {
        try {
          if (Array.isArray(notes)) {
            notesContent = '<ul>'
              + notes.map(item => `<li>${item}</li>`).join('')
              + '</ul>';
          } else {
            notesContent = Object.entries(notes)
              .map(([key, value]) => `<p><strong>${key}:</strong> ${value}</p>`)
              .join('');
          }
        } catch (e) {
          notesContent = String(notes) || 'Não informado';
        }
      } else {
        notesContent = String(notes);
      }
      
      html += `
        <div class="subsection">
          <h3>Observações Adicionais</h3>
          <div class="recommendations">
            ${notesContent}
          </div>
        </div>
      `;
    }
    
    // Adicionar seção de análises incorporadas
    if (plan.ifm_matrix?.analysis || plan.lab_results?.analysis || plan.tcm_observations?.analysis) {
      html += `
        <div class="subsection">
          <h3>Análises Incorporadas</h3>
          <div class="recommendations">
            <p>Este plano incorpora dados das seguintes análises:</p>
            <ul>
      `;
      
      if (plan.tcm_observations?.analysis) {
        html += `<li>Análise de Medicina Tradicional Chinesa</li>`;
      }
      
      if (plan.lab_results?.analysis) {
        html += `<li>Análise de Exames Laboratoriais</li>`;
      }
      
      if (plan.ifm_matrix?.analysis) {
        html += `<li>Análise da Matriz IFM</li>`;
      }
      
      html += `
            </ul>
          </div>
        </div>
      `;
    }

    // Adicionar quebra de página e iniciar seção do plano cíclico
    html += `
      </div>
      
      <div class="page-break"></div>
      
      <div class="section">
        <h2>Plano Cíclico</h2>
    `;
    
    // Adicionar cada fase
    const phases = [
      { key: 'follicular', title: 'Fase Folicular' },
      { key: 'ovulatory', title: 'Fase Ovulatória' },
      { key: 'luteal', title: 'Fase Lútea' },
      { key: 'menstrual', title: 'Fase Menstrual' }
    ];
    
    phases.forEach(phase => {
      if (plan.final_plan[phase.key]) {
        html += `
          <div class="phase">
            <h3>${phase.title}</h3>
            <div class="recommendations">
              ${plan.final_plan[phase.key]}
            </div>
          </div>
        `;
      }
    });
    
    // Se houver recomendações para climatério/menopausa
    if (plan.final_plan.menopausal) {
      html += `
        <div class="phase">
          <h3>Recomendações para Climatério/Menopausa</h3>
          <div class="recommendations">
            ${plan.final_plan.menopausal}
          </div>
        </div>
      `;
    }
    
    // Close HTML
    html += `
        </div>
        
        <div class="footer">
          <p>Este plano foi gerado automaticamente pelo sistema Lyz e deve ser utilizado sob supervisão de um profissional de saúde.</p>
          <p>&copy; ${new Date().getFullYear()} Lyz Health - Todos os direitos reservados</p>
        </div>
      </body>
      </html>
    `;
    
    return html;
  } catch (error) {
    console.error('Error generating HTML:', error);
    throw new Error('Failed to generate plan HTML');
  }
};

// Generate and export plan as PDF using Puppeteer
export const exportPlanAsPDF = async (planId: number) => {
  try {
    // Carregar puppeteer dinamicamente
    puppeteer = await loadPuppeteer();
    if (!puppeteer) {
      throw new Error('Puppeteer não está disponível. Por favor, instale o pacote com: npm install puppeteer');
    }
    
    // Fetch the plan
    const plan = await PatientPlan.findByPk(planId);
    
    if (!plan) {
      throw new Error('Plan not found');
    }
    
    // Generate HTML
    const html = generatePlanHTML(plan);
    
    // Create temp directory if it doesn't exist
    const tempDir = path.join(__dirname, '../../../temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    // Generate unique filenames
    const htmlFileName = `plan_${planId}_${Date.now()}.html`;
    const pdfFileName = `plan_${planId}_${Date.now()}.pdf`;
    const htmlFilePath = path.join(tempDir, htmlFileName);
    const pdfFilePath = path.join(tempDir, pdfFileName);
    
    // Write HTML to temporary file
    await util.promisify(fs.writeFile)(htmlFilePath, html);
    

    
    // Use Puppeteer to convert HTML to PDF
    // Puppeteer pode ser o módulo ou a propriedade 'default' do módulo (dependendo de como foi importado)
    const puppeteerModule = puppeteer.default || puppeteer;
    
    // Iniciar o navegador com opções que funcionam em ambientes restritos
    const browser = await puppeteerModule.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
        '--disable-gpu'
      ]
    });
    const page = await browser.newPage();
    await page.goto(`file://${htmlFilePath}`, { waitUntil: 'networkidle0' });
    
    // Add page headers and footers
    await page.pdf({
      path: pdfFilePath,
      format: 'A4',
      printBackground: true,
      margin: { top: '1cm', right: '1cm', bottom: '1cm', left: '1cm' },
      displayHeaderFooter: true,
      headerTemplate: '<div style="font-size: 8px; width: 100%; text-align: center; color: #777;">Plano Terapêutico Lyz</div>',
      footerTemplate: '<div style="font-size: 8px; width: 100%; text-align: center; color: #777;">Página <span class="pageNumber"></span> de <span class="totalPages"></span></div>',
    });
    
    await browser.close();
    
    // Upload to Minio
    const bucketName = process.env.MINIO_BUCKET || 'lyz-files';
    const objectName = `plans/${planId}/exports/plan_${Date.now()}.pdf`;
    
    await minioClient.fPutObject(bucketName, objectName, pdfFilePath);
    
    // Generate presigned URL for download (valid for 24 hours)
    const presignedUrl = await minioClient.presignedGetObject(bucketName, objectName, 24 * 60 * 60);
    
    // Delete temp files
    await util.promisify(fs.unlink)(htmlFilePath);
    
    return {
      success: true,
      url: presignedUrl,
      fileName: pdfFileName,
      format: 'pdf'
    };
  } catch (error) {
    console.error('Error exporting plan as PDF:', error);
    return {
      success: false,
      message: 'Failed to export plan as PDF',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

// Generate and export plan as HTML
export const exportPlanAsHTML = async (planId: number) => {
  try {
    // Fetch the plan
    const plan = await PatientPlan.findByPk(planId);
    
    if (!plan) {
      throw new Error('Plan not found');
    }
    
    // Generate HTML
    const html = generatePlanHTML(plan);
    
    // Generate a unique filename
    const minioPath = `plans/${planId}/exports/plan_${Date.now()}.html`;
    
    // Ensure temp directory exists
    const tempDir = path.join(__dirname, '../../../temp');
    if (!fs.existsSync(tempDir)) {
      await util.promisify(fs.mkdir)(tempDir, { recursive: true });
    }
    
    // Write HTML to file
    const filePath = path.join(tempDir, `plan_${planId}_${Date.now()}.html`);
    await util.promisify(fs.writeFile)(filePath, html);
    
    // Upload to Minio
    const bucketName = process.env.MINIO_BUCKET || 'lyz-files';
    const objectName = `plans/${planId}/exports/plan_${Date.now()}.html`;
    
    await minioClient.fPutObject(bucketName, objectName, filePath);
    
    // Generate presigned URL for download (valid for 24 hours)
    const presignedUrl = await minioClient.presignedGetObject(bucketName, objectName, 24 * 60 * 60);
    
    // Delete temp file
    await util.promisify(fs.unlink)(filePath);
    
    return {
      success: true,
      url: presignedUrl,
      fileName: path.basename(filePath),
      format: 'html'
    };
  } catch (error) {
    console.error('Error exporting plan as HTML:', error);
    return {
      success: false,
      message: 'Failed to export plan as HTML',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

// Share plan via email
export const sharePlanViaEmail = async (planId: number, recipientEmail: string, recipientName: string = '', senderName: string = '', customMessage: string = '') => {
  try {
    // Fetch the plan
    const plan = await PatientPlan.findByPk(planId);
    
    if (!plan) {
      throw new Error('Plan not found');
    }
    
    // Get email configuration from environment variables
    const emailHost = process.env.EMAIL_HOST || '';
    const emailPort = parseInt(process.env.EMAIL_PORT || '587', 10);
    const emailUser = process.env.EMAIL_USER || '';
    const emailPass = process.env.EMAIL_PASS || '';
    const emailFrom = process.env.EMAIL_FROM || 'no-reply@lyz.saude.io';
    
    // Check if email configuration exists
    if (!emailHost || !emailUser || !emailPass) {
      throw new Error('Email configuration is not set up');
    }
    
    // Generate PDF for attachment
    const pdfExport = await exportPlanAsPDF(planId);
    
    if (!pdfExport.success) {
      throw new Error('Failed to generate PDF for email attachment');
    }
    
    // Create transporter
    const transporter = nodemailer.createTransport({
      host: emailHost,
      port: emailPort,
      secure: emailPort === 465, // true for 465, false for other ports
      auth: {
        user: emailUser,
        pass: emailPass,
      },
    });
    
    // Patient name
    const patientName = plan.patient_data?.name || 'Paciente';
    
    // Default message if none provided
    const messageText = customMessage || 
      `Olá ${recipientName || 'Paciente'},\n\nEstou compartilhando com você o plano terapêutico personalizado gerado pelo sistema Lyz. Este plano foi desenvolvido com base nas suas informações de saúde e visa proporcionar uma abordagem personalizada para o seu bem-estar.\n\nPor favor, revise as recomendações e entre em contato caso tenha alguma dúvida.\n\nAtenciosamente,\n${senderName || 'Profissional de Saúde'}`;
    
    // Send email
    const info = await transporter.sendMail({
      from: `"Lyz Saúde" <${emailFrom}>`,
      to: recipientEmail,
      subject: `Plano Terapêutico Personalizado - ${patientName}`,
      text: messageText,
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background-color: #6a1b9a; color: white; padding: 20px; text-align: center; margin-bottom: 20px;">
              <h1 style="margin: 0;">Plano Terapêutico Personalizado</h1>
              <p style="margin-top: 10px;">Sistema Lyz - Especialista em Ciclicidade Feminina</p>
            </div>
            
            <p style="color: #333;">${messageText.replace(/\n/g, '<br>')}</p>
            
            <p style="color: #666; margin-top: 30px; font-size: 0.9em;">
              O plano completo está anexado a este email em formato PDF.<br>
              Este documento contém recomendações personalizadas e deve ser utilizado sob supervisão profissional.
            </p>
            
            <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; color: #999; font-size: 0.8em; text-align: center;">
              <p>Este é um email automático enviado pelo sistema Lyz. Por favor, não responda a este email.</p>
            </div>
          </div>
        </div>
      `,
      attachments: [
        {
          filename: `Plano_Terapêutico_${patientName.replace(/\s+/g, '_')}.pdf`,
          path: pdfExport.url,
        },
      ],
    });
    
    return {
      success: true,
      messageId: info.messageId,
      message: 'Plan shared successfully via email'
    };
  } catch (error) {
    console.error('Error sharing plan via email:', error);
    return {
      success: false,
      message: 'Failed to share plan via email',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

// Generate and export plan as DOCX using docx library
export const exportPlanAsDOCX = async (planId: number) => {
  try {
    // Fetch the plan
    const plan = await PatientPlan.findByPk(planId);
    
    if (!plan) {
      throw new Error('Plan not found');
    }
    
    // Create a new document
    const doc = new Document({
      title: `Plano Terapêutico - ${plan.patient_data.name || 'Paciente'}`,
      description: 'Plano de tratamento personalizado gerado pelo sistema Lyz',
      sections: [],
      styles: {
        paragraphStyles: [
          {
            id: 'Heading1',
            name: 'Heading 1',
            basedOn: 'Normal',
            next: 'Normal',
            quickFormat: true,
            run: {
              size: 28,
              bold: true,
              color: '6a1b9a'
            },
            paragraph: {
              spacing: {
                after: 120
              }
            }
          },
          {
            id: 'Heading2',
            name: 'Heading 2',
            basedOn: 'Normal',
            next: 'Normal',
            quickFormat: true,
            run: {
              size: 24,
              bold: true,
              color: '9c27b0'
            },
            paragraph: {
              spacing: {
                before: 240,
                after: 120
              }
            }
          },
          {
            id: 'Heading3',
            name: 'Heading 3',
            basedOn: 'Normal',
            next: 'Normal',
            quickFormat: true,
            run: {
              size: 20,
              bold: true,
              color: 'ab47bc'
            },
            paragraph: {
              spacing: {
                before: 240,
                after: 120
              }
            }
          }
        ]
      }
    });

    // Extract plan data
    const { final_plan, patient_data } = plan;
    
    // Helper function to create paragraphs from text with line breaks
    const createParagraphs = (text: string) => {
      if (!text) return [new Paragraph({text: 'Não especificado'})];
      return text.split('\n').filter(line => line.trim()).map(line => 
        new Paragraph({
          text: line,
          spacing: {
            after: 120
          }
        })
      );
    };

    // Create a section for the document
    const section = {
      properties: {},
      children: [
        new Paragraph({
          text: 'Plano Terapêutico Personalizado',
          heading: HeadingLevel.HEADING_1,
          alignment: docx.AlignmentType.CENTER
        }),
        new Paragraph({
          text: `Paciente: ${patient_data.name || 'Não informado'}`,
          alignment: docx.AlignmentType.CENTER,
          spacing: {
            after: 200
          }
        }),
        new Paragraph({
          text: `Data: ${new Date().toLocaleDateString()}`,
          alignment: docx.AlignmentType.CENTER,
          spacing: {
            after: 400
          }
        }),
        
        // Diagnóstico
        new Paragraph({
          text: 'Diagnóstico',
          heading: HeadingLevel.HEADING_2
        }),
        ...createParagraphs(final_plan.diagnosis),
        
        // Plano de Tratamento
        new Paragraph({
          text: 'Plano de Tratamento',
          heading: HeadingLevel.HEADING_2
        }),
        ...createParagraphs(final_plan.treatment_plan),
        
        // Recomendações Nutricionais
        new Paragraph({
          text: 'Recomendações Nutricionais',
          heading: HeadingLevel.HEADING_2
        }),
        
        new Paragraph({
          text: 'Alimentos a Incluir',
          heading: HeadingLevel.HEADING_3
        }),
        ...createParagraphs(final_plan.nutritional_recommendations.foods_to_include),
        
        new Paragraph({
          text: 'Alimentos a Evitar',
          heading: HeadingLevel.HEADING_3
        }),
        ...createParagraphs(final_plan.nutritional_recommendations.foods_to_avoid),
        
        new Paragraph({
          text: 'Frequência e Horário das Refeições',
          heading: HeadingLevel.HEADING_3
        }),
        ...createParagraphs(final_plan.nutritional_recommendations.meal_timing),
        
        new Paragraph({
          text: 'Suplementos',
          heading: HeadingLevel.HEADING_3
        }),
        ...createParagraphs(final_plan.nutritional_recommendations.supplements),
        
        // Recomendações de Estilo de Vida
        new Paragraph({
          text: 'Recomendações de Estilo de Vida',
          heading: HeadingLevel.HEADING_2
        }),
        
        new Paragraph({
          text: 'Exercícios',
          heading: HeadingLevel.HEADING_3
        }),
        ...createParagraphs(final_plan.lifestyle_recommendations.exercise),
        
        new Paragraph({
          text: 'Sono',
          heading: HeadingLevel.HEADING_3
        }),
        ...createParagraphs(final_plan.lifestyle_recommendations.sleep),
        
        new Paragraph({
          text: 'Gerenciamento de Estresse',
          heading: HeadingLevel.HEADING_3
        }),
        ...createParagraphs(final_plan.lifestyle_recommendations.stress_management),
        
        new Paragraph({
          text: 'Outras Recomendações',
          heading: HeadingLevel.HEADING_3
        }),
        ...createParagraphs(final_plan.lifestyle_recommendations.other),
        
        // Acompanhamento
        new Paragraph({
          text: 'Acompanhamento',
          heading: HeadingLevel.HEADING_2
        }),
        ...createParagraphs(final_plan.follow_up),
        
        // Observações Adicionais
        new Paragraph({
          text: 'Observações Adicionais',
          heading: HeadingLevel.HEADING_2
        }),
        ...createParagraphs(final_plan.additional_notes),
        
        // Footer
        new Paragraph({
          text: '',
          spacing: {
            before: 400
          }
        }),
        new Paragraph({
          text: 'Este plano foi gerado pelo sistema Lyz e deve ser utilizado sob supervisão de um profissional de saúde.',
          alignment: docx.AlignmentType.CENTER,
          spacing: {
            before: 200
          }
        })
      ]
    };

    // Generate a unique filename
    const minioPath = `plans/${planId}/exports/plan_${Date.now()}.docx`;
    
    // Ensure temp directory exists
    const tempDir = path.join(__dirname, '../../../temp');
    if (!fs.existsSync(tempDir)) {
      await util.promisify(fs.mkdir)(tempDir, { recursive: true });
    }
    
    // Create buffer from document
    const buffer = await docx.Packer.toBuffer(doc);
    const filePath = path.join(tempDir, `plan_${planId}_${Date.now()}.docx`);
    await fs.promises.writeFile(filePath, buffer);
    
    // Upload to Minio
    const bucketName = process.env.MINIO_BUCKET || 'lyz-files';
    const objectName = `plans/${planId}/exports/plan_${Date.now()}.docx`;
    
    await minioClient.fPutObject(bucketName, objectName, filePath);
    
    // Generate presigned URL for download (valid for 24 hours)
    const presignedUrl = await minioClient.presignedGetObject(bucketName, objectName, 24 * 60 * 60);
    
    // Delete temp file
    await util.promisify(fs.unlink)(filePath);
    
    return {
      success: true,
      url: presignedUrl,
      fileName: path.basename(filePath),
      format: 'docx'
    };
  } catch (error) {
    console.error('Error exporting plan as DOCX:', error);
    return {
      success: false,
      message: 'Failed to export plan as DOCX',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};
