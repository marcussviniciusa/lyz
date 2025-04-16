import { Model, DataTypes } from 'sequelize';
import sequelize from '../config/database';
import User from './User';

class Prompt extends Model {
  public id!: number;
  public step_key!: string;
  public content!: string;
  public temperature!: number;
  public max_tokens!: number;
  public updated_at!: Date;
  public updated_by!: number;
}

Prompt.init({
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  step_key: {
    type: DataTypes.STRING(50),
    allowNull: false,
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  temperature: {
    type: DataTypes.FLOAT,
    defaultValue: 0.7,
  },
  max_tokens: {
    type: DataTypes.INTEGER,
    defaultValue: 2000,
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
  tableName: 'prompts',
  timestamps: false,
  hooks: {
    beforeUpdate: (prompt: Prompt) => {
      prompt.updated_at = new Date();
    },
  },
});

// Define association
Prompt.belongsTo(User, { foreignKey: 'updated_by', as: 'updatedBy' });

export default Prompt;
