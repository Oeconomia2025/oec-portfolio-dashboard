import { db } from './db';
import { tokens } from '@shared/schema';
import { eq } from 'drizzle-orm';

// Initial token data for OEC and ELOQ
const initialTokens = [
  {
    symbol: 'OEC',
    name: 'Oeconomia Token',
    address: '0x1234567890123456789012345678901234567890', // Placeholder address
    decimals: 18,
    logoUrl: null,
  },
  {
    symbol: 'ELOQ',
    name: 'Eloquent Token', 
    address: '0x0987654321098765432109876543210987654321', // Placeholder address
    decimals: 18,
    logoUrl: null,
  },
  {
    symbol: 'ETH',
    name: 'Ethereum',
    address: '0x0000000000000000000000000000000000000000', // ETH native token
    decimals: 18,
    logoUrl: null,
  }
];

export async function seedDatabase() {
  console.log('🌱 Seeding database with initial token data...');
  
  try {
    // Check if tokens already exist and insert only if they don't
    for (const tokenData of initialTokens) {
      const existingToken = await db
        .select()
        .from(tokens)
        .where(eq(tokens.symbol, tokenData.symbol))
        .limit(1);

      if (existingToken.length === 0) {
        await db.insert(tokens).values(tokenData);
        console.log(`✅ Inserted ${tokenData.symbol} token`);
      } else {
        console.log(`⏭️  ${tokenData.symbol} token already exists`);
      }
    }

    console.log('🎉 Database seeding completed successfully!');
    return true;
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    return false;
  }
}

// Auto-run seeding (ES module compatible)
seedDatabase();