import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';
import bcrypt from 'bcrypt';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const sequelize = new Sequelize(
  process.env.DB_NAME || 'dev_lyz',
  process.env.DB_USER || 'postgres',
  process.env.DB_PASSWORD || 'postgres',
  {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    dialect: 'postgres',
    logging: false,
  }
);

async function createTestUser() {
  try {
    // Connect to the database
    await sequelize.authenticate();
    console.log('Database connection established successfully.');

    // Hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('teste123', salt);

    // Check if user already exists
    const [results] = await sequelize.query(
      "SELECT id FROM users WHERE email = 'test@example.com'"
    );

    if ((results as any[]).length > 0) {
      console.log('Test user already exists. Updating password...');
      await sequelize.query(
        "UPDATE users SET password = :password WHERE email = 'test@example.com'",
        {
          replacements: { password: hashedPassword },
          type: 'UPDATE',
        }
      );
    } else {
      // Create a test user with a known password
      await sequelize.query(
        `INSERT INTO users (name, email, password, role, created_at) 
         VALUES ('Test User', 'test@example.com', :password, 'admin', NOW())`,
        {
          replacements: { password: hashedPassword },
          type: 'INSERT',
        }
      );
    }

    console.log('Test user created/updated successfully!');
    console.log('Email: test@example.com');
    console.log('Password: teste123');

    // Close the connection
    await sequelize.close();
  } catch (error) {
    console.error('Error creating test user:', error);
  }
}

// Run the function
createTestUser();
