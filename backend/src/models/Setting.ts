import { Model, DataTypes } from 'sequelize';
import sequelize from '../config/database';

interface SettingAttributes {
  id?: number;
  key: string;
  value: string | null;
  created_at?: Date;
  updated_at?: Date;
}

class Setting extends Model<SettingAttributes> {
  public id!: number;
  public key!: string;
  public value!: string | null;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

Setting.init({
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  key: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  value: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
}, {
  sequelize,
  modelName: 'Setting',
  tableName: 'settings',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
});

export default Setting;
