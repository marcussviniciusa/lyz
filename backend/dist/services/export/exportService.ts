import * as fs from 'fs';
import * as path from 'path';
import * as util from 'util';
import { minioClient } from '../../config/minio';
import { PatientPlan } from '../../models';

// Helper function to generate formatted HTML for the plan
const generatePlanHTML = (plan: any) => {
  try {
    // Extract plan data
    const { patientData, generalPlan, cyclicalPlan } = plan.final_plan;
    
    // Create HTML content
    let html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Plano Personalizado - Lyz</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          h1 { color: #6a1b9a; }
          h2 { color: #9c27b0; border-bottom: 1px solid #e0e0e0; padding-bottom: 10px; }
          h3 { color: #ab47bc; }
          .header { text-align: center; margin-bottom: 30px; }
          .section { margin-bottom: 30px; }
          .patient-info { background-color: #f3e5f5; padding: 15px; border-radius: 5px; }
          .recommendations { margin-left: 20px; }
          .footer { text-align: center; margin-top: 50px; font-size: 0.8em; color: #9e9e9e; }
          .phase { background-color: #faf3fb; padding: 15px; margin-bottom: 15px; border-radius: 5px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Plano Personalizado</h1>
          <p>Gerado por Lyz - Especialista em Ciclicidade Feminina</p>
          <p>${new Date().toLocaleDateString()}</p>
        </div>
        
        <div class="section patient-info">
          <h2>Informações da Paciente</h2>
          <p><strong>Nome:</strong> ${patientData.name || 'Não informado'}</p>
          <p><strong>Idade:</strong> ${patientData.age || 'Não informada'}</p>
        </div>
        
        <div class="section">
          <h2>Plano Geral</h2>
    `;
    
    // Add general plan sections
    if (generalPlan.dietaryRecommendations) {
      html += `
        <div class="subsection">
          <h3>Recomendações Alimentares</h3>
          <div class="recommendations">
            ${generalPlan.dietaryRecommendations}
          </div>
        </div>
      `;
    }
    
    if (generalPlan.supplementation) {
      html += `
        <div class="subsection">
          <h3>Suplementação</h3>
          <div class="recommendations">
            ${generalPlan.supplementation}
          </div>
        </div>
      `;
    }
    
    if (generalPlan.lifestyleChanges) {
      html += `
        <div class="subsection">
          <h3>Modificações de Estilo de Vida</h3>
          <div class="recommendations">
            ${generalPlan.lifestyleChanges}
          </div>
        </div>
      `;
    }
    
    if (generalPlan.stressManagement) {
      html += `
        <div class="subsection">
          <h3>Gerenciamento de Estresse</h3>
          <div class="recommendations">
            ${generalPlan.stressManagement}
          </div>
        </div>
      `;
    }
    
    // Add cyclical plan
    html += `
      </div>
      
      <div class="section">
        <h2>Plano Cíclico</h2>
    `;
    
    // Add each phase
    const phases = [
      { key: 'follicular', title: 'Fase Folicular' },
      { key: 'ovulatory', title: 'Fase Ovulatória' },
      { key: 'luteal', title: 'Fase Lútea' },
      { key: 'menstrual', title: 'Fase Menstrual' }
    ];
    
    phases.forEach(phase => {
      if (cyclicalPlan[phase.key]) {
        html += `
          <div class="phase">
            <h3>${phase.title}</h3>
            <div class="recommendations">
              ${cyclicalPlan[phase.key]}
            </div>
          </div>
        `;
      }
    });
    
    // If there's menopausal recommendations
    if (cyclicalPlan.menopausal) {
      html += `
        <div class="phase">
          <h3>Recomendações para Climatério/Menopausa</h3>
          <div class="recommendations">
            ${cyclicalPlan.menopausal}
          </div>
        </div>
      `;
    }
    
    // Close HTML
    html += `
        </div>
        
        <div class="footer">
          <p>Este plano foi gerado automaticamente pelo sistema Lyz e deve ser utilizado sob supervisão de um profissional de saúde.</p>
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

// Generate and export plan as PDF
export const exportPlanAsPDF = async (planId: number) => {
  try {
    // Fetch the plan
    const plan = await PatientPlan.findByPk(planId);
    
    if (!plan) {
      throw new Error('Plan not found');
    }
    
    // Generate HTML
    const html = generatePlanHTML(plan);
    
    // TODO: Use a PDF generation library like puppeteer to convert HTML to PDF
    // For now, we'll just return the HTML as placeholder
    
    // Generate a unique filename
    const fileName = `plan_${planId}_${Date.now()}.html`;
    const filePath = path.join(__dirname, '../../../temp', fileName);
    
    // Ensure temp directory exists
    const tempDir = path.join(__dirname, '../../../temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    // Write HTML to file
    await util.promisify(fs.writeFile)(filePath, html);
    
    // Upload to Minio
    const bucketName = process.env.MINIO_BUCKET || 'lyz-files';
    await minioClient.fPutObject(bucketName, `plans/${fileName}`, filePath);
    
    // Generate presigned URL for download
    const presignedUrl = await minioClient.presignedGetObject(bucketName, `plans/${fileName}`, 24 * 60 * 60); // 24 hours expiry
    
    // Delete temp file
    await util.promisify(fs.unlink)(filePath);
    
    return {
      success: true,
      url: presignedUrl,
      fileName
    };
  } catch (error) {
    console.error('Error exporting plan:', error);
    return {
      success: false,
      message: 'Failed to export plan'
    };
  }
};

// Generate and export plan as DOCX
export const exportPlanAsDOCX = async (planId: number) => {
  // Similar to PDF but with DOCX generation
  // For now, return the same as PDF as a placeholder
  return exportPlanAsPDF(planId);
};
