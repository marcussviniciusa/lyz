import { Model, DataTypes } from 'sequelize';
import sequelize from '../config/database';
import User from './User';
import Company from './Company';

class PatientPlan extends Model {
  public id!: number;
  public user_id!: number;
  public company_id!: number;
  public patient_data!: any;
  public questionnaire_data!: any;
  public lab_results!: any;
  public tcm_observations!: any;
  public timeline_data!: any;
  public ifm_matrix!: any;
  public final_plan!: any;
  public professional_type!: string;
  public created_at!: Date;
  public updated_at!: Date;
}

PatientPlan.init({
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  user_id: {
    type: DataTypes.INTEGER,
    references: {
      model: 'users',
      key: 'id',
    },
  },
  company_id: {
    type: DataTypes.INTEGER,
    references: {
      model: 'companies',
      key: 'id',
    },
  },
  patient_data: {
    type: DataTypes.JSONB,
    allowNull: false,
  },
  questionnaire_data: {
    type: DataTypes.JSONB,
    allowNull: true,
  },
  lab_results: {
    type: DataTypes.JSONB,
    allowNull: true,
  },
  tcm_observations: {
    type: DataTypes.JSONB,
    allowNull: true,
  },
  timeline_data: {
    type: DataTypes.JSONB,
    allowNull: true,
  },
  ifm_matrix: {
    type: DataTypes.JSONB,
    allowNull: true,
  },
  final_plan: {
    type: DataTypes.JSONB,
    allowNull: true,
  },
  professional_type: {
    type: DataTypes.STRING(50),
    allowNull: false,
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
  updated_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
}, {
  sequelize,
  tableName: 'patient_plans',
  timestamps: false,
  hooks: {
    beforeUpdate: (plan: PatientPlan) => {
      plan.updated_at = new Date();
    },
  },
});

// Define associations
PatientPlan.belongsTo(User, { foreignKey: 'user_id' });
PatientPlan.belongsTo(Company, { foreignKey: 'company_id' });

export default PatientPlan;
