import { Model, DataTypes } from 'sequelize';
import sequelize from '../config/database';
import User from './User';
import Company from './Company';
import Prompt from './Prompt';

class TokenUsage extends Model {
  public id!: number;
  public user_id!: number;
  public company_id!: number;
  public prompt_id!: number;
  public tokens_used!: number;
  public cost!: number;
  public timestamp!: Date;
}

TokenUsage.init({
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
  prompt_id: {
    type: DataTypes.INTEGER,
    references: {
      model: 'prompts',
      key: 'id',
    },
  },
  tokens_used: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  cost: {
    type: DataTypes.DECIMAL(10, 6),
    allowNull: false,
  },
  timestamp: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
}, {
  sequelize,
  tableName: 'token_usage',
  timestamps: false,
});

// Define associations
TokenUsage.belongsTo(User, { foreignKey: 'user_id' });
TokenUsage.belongsTo(Company, { foreignKey: 'company_id' });
TokenUsage.belongsTo(Prompt, { foreignKey: 'prompt_id' });

export default TokenUsage;
