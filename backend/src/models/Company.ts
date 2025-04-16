import { Model, DataTypes } from 'sequelize';
import sequelize from '../config/database';

class Company extends Model {
  public id!: number;
  public name!: string;
  public token_limit!: number;
  public created_at!: Date;
}

Company.init({
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  token_limit: {
    type: DataTypes.INTEGER,
    defaultValue: 10000,
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  }
}, {
  sequelize,
  tableName: 'companies',
  timestamps: false,
});

export default Company;
