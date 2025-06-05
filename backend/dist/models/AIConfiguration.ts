import { Model, DataTypes } from 'sequelize';
import sequelize from '../config/database';
import User from './User';

class AIConfiguration extends Model {
  public id!: number;
  public page_key!: string;
  public model!: string;
  public prompt!: string;
  public temperature!: number;
  public max_tokens!: number;
  public is_active!: boolean;
  public created_at!: Date;
  public updated_at!: Date;
  public updated_by!: number;
}

AIConfiguration.init({
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  page_key: {
    type: DataTypes.ENUM(
      'lab_analysis',
      'tcm_analysis', 
      'timeline_generation',
      'ifm_matrix',
      'final_plan'
    ),
    allowNull: false,
    unique: true,
  },
  model: {
    type: DataTypes.ENUM(
      'gpt-4o-mini',
      'gpt-4.5',
      'gpt-4.1-mini',
      'claude-sonnet-3.7',
      'claude-sonnet-4',
      'gemini-2.5-pro'
    ),
    allowNull: false,
    defaultValue: 'gpt-4o-mini',
  },
  prompt: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  temperature: {
    type: DataTypes.FLOAT,
    defaultValue: 0.7,
    validate: {
      min: 0.0,
      max: 2.0,
    },
  },
  max_tokens: {
    type: DataTypes.INTEGER,
    defaultValue: 2000,
    validate: {
      min: 1,
      max: 8000,
    },
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
  updated_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
  updated_by: {
    type: DataTypes.INTEGER,
    references: {
      model: 'users',
      key: 'id',
    },
  },
}, {
  sequelize,
  tableName: 'ai_configurations',
  timestamps: false,
  hooks: {
    beforeUpdate: (config: AIConfiguration) => {
      config.updated_at = new Date();
    },
  },
});

// Define association
AIConfiguration.belongsTo(User, { foreignKey: 'updated_by', as: 'updatedBy' });

export default AIConfiguration; 