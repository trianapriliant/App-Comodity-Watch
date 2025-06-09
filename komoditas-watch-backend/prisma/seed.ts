import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // Create Indonesian regions (provinces)
  console.log('📍 Creating regions...');
  const regions = await Promise.all([
    prisma.region.upsert({
      where: { code: '11' },
      update: {},
      create: {
        name: 'Aceh',
        code: '11',
        type: 'province',
        latitude: 4.695135,
        longitude: 96.7493993,
      },
    }),
    prisma.region.upsert({
      where: { code: '12' },
      update: {},
      create: {
        name: 'Sumatera Utara',
        code: '12',
        type: 'province',
        latitude: 2.1153547,
        longitude: 99.5450974,
      },
    }),
    prisma.region.upsert({
      where: { code: '13' },
      update: {},
      create: {
        name: 'Sumatera Barat',
        code: '13',
        type: 'province',
        latitude: -0.7399397,
        longitude: 100.8000051,
      },
    }),
    prisma.region.upsert({
      where: { code: '14' },
      update: {},
      create: {
        name: 'Riau',
        code: '14',
        type: 'province',
        latitude: 0.2933469,
        longitude: 101.7068294,
      },
    }),
    prisma.region.upsert({
      where: { code: '15' },
      update: {},
      create: {
        name: 'Jambi',
        code: '15',
        type: 'province',
        latitude: -1.4851831,
        longitude: 102.4380581,
      },
    }),
    prisma.region.upsert({
      where: { code: '16' },
      update: {},
      create: {
        name: 'Sumatera Selatan',
        code: '16',
        type: 'province',
        latitude: -3.3194374,
        longitude: 103.914399,
      },
    }),
    prisma.region.upsert({
      where: { code: '31' },
      update: {},
      create: {
        name: 'DKI Jakarta',
        code: '31',
        type: 'province',
        latitude: -6.200000,
        longitude: 106.816666,
      },
    }),
    prisma.region.upsert({
      where: { code: '32' },
      update: {},
      create: {
        name: 'Jawa Barat',
        code: '32',
        type: 'province',
        latitude: -6.914744,
        longitude: 107.609810,
      },
    }),
    prisma.region.upsert({
      where: { code: '33' },
      update: {},
      create: {
        name: 'Jawa Tengah',
        code: '33',
        type: 'province',
        latitude: -7.150975,
        longitude: 110.140259,
      },
    }),
    prisma.region.upsert({
      where: { code: '34' },
      update: {},
      create: {
        name: 'DI Yogyakarta',
        code: '34',
        type: 'province',
        latitude: -7.797068,
        longitude: 110.370529,
      },
    }),
    prisma.region.upsert({
      where: { code: '35' },
      update: {},
      create: {
        name: 'Jawa Timur',
        code: '35',
        type: 'province',
        latitude: -7.250445,
        longitude: 112.768845,
      },
    }),
    prisma.region.upsert({
      where: { code: '51' },
      update: {},
      create: {
        name: 'Bali',
        code: '51',
        type: 'province',
        latitude: -8.409518,
        longitude: 115.188919,
      },
    }),
  ]);

  console.log(`✅ Created ${regions.length} regions`);

  // Create commodities
  console.log('🌾 Creating commodities...');
  const commodities = await Promise.all([
    prisma.commodity.upsert({
      where: { code: 'BERAS' },
      update: {},
      create: {
        name: 'Beras',
        type: 'BERAS',
        code: 'BERAS',
        unit: 'kg',
        description: 'Beras merupakan makanan pokok utama penduduk Indonesia',
        category: 'Pangan Pokok',
        isStrategic: true,
      },
    }),
    prisma.commodity.upsert({
      where: { code: 'JAGUNG' },
      update: {},
      create: {
        name: 'Jagung',
        type: 'JAGUNG',
        code: 'JAGUNG',
        unit: 'kg',
        description: 'Jagung sebagai sumber karbohidrat alternatif dan pakan ternak',
        category: 'Pangan Pokok',
        isStrategic: true,
      },
    }),
    prisma.commodity.upsert({
      where: { code: 'KEDELAI' },
      update: {},
      create: {
        name: 'Kedelai',
        type: 'KEDELAI',
        code: 'KEDELAI',
        unit: 'kg',
        description: 'Kedelai sebagai sumber protein nabati',
        category: 'Protein Nabati',
        isStrategic: true,
      },
    }),
    prisma.commodity.upsert({
      where: { code: 'GULA_PASIR' },
      update: {},
      create: {
        name: 'Gula Pasir',
        type: 'GULA_PASIR',
        code: 'GULA_PASIR',
        unit: 'kg',
        description: 'Gula pasir sebagai pemanis utama',
        category: 'Bumbu dan Pemanis',
        isStrategic: true,
      },
    }),
    prisma.commodity.upsert({
      where: { code: 'MINYAK_GORENG' },
      update: {},
      create: {
        name: 'Minyak Goreng',
        type: 'MINYAK_GORENG',
        code: 'MINYAK_GORENG',
        unit: 'liter',
        description: 'Minyak goreng untuk kebutuhan memasak',
        category: 'Minyak dan Lemak',
        isStrategic: true,
      },
    }),
    prisma.commodity.upsert({
      where: { code: 'DAGING_SAPI' },
      update: {},
      create: {
        name: 'Daging Sapi',
        type: 'DAGING_SAPI',
        code: 'DAGING_SAPI',
        unit: 'kg',
        description: 'Daging sapi sebagai sumber protein hewani',
        category: 'Protein Hewani',
        isStrategic: true,
      },
    }),
    prisma.commodity.upsert({
      where: { code: 'DAGING_AYAM' },
      update: {},
      create: {
        name: 'Daging Ayam',
        type: 'DAGING_AYAM',
        code: 'DAGING_AYAM',
        unit: 'kg',
        description: 'Daging ayam sebagai sumber protein hewani yang terjangkau',
        category: 'Protein Hewani',
        isStrategic: true,
      },
    }),
    prisma.commodity.upsert({
      where: { code: 'TELUR_AYAM' },
      update: {},
      create: {
        name: 'Telur Ayam',
        type: 'TELUR_AYAM',
        code: 'TELUR_AYAM',
        unit: 'kg',
        description: 'Telur ayam sebagai sumber protein hewani yang murah',
        category: 'Protein Hewani',
        isStrategic: true,
      },
    }),
    prisma.commodity.upsert({
      where: { code: 'CABAI_MERAH' },
      update: {},
      create: {
        name: 'Cabai Merah',
        type: 'CABAI_MERAH',
        code: 'CABAI_MERAH',
        unit: 'kg',
        description: 'Cabai merah sebagai bumbu masakan',
        category: 'Sayuran dan Bumbu',
        isStrategic: false,
      },
    }),
    prisma.commodity.upsert({
      where: { code: 'BAWANG_MERAH' },
      update: {},
      create: {
        name: 'Bawang Merah',
        type: 'BAWANG_MERAH',
        code: 'BAWANG_MERAH',
        unit: 'kg',
        description: 'Bawang merah sebagai bumbu dasar masakan Indonesia',
        category: 'Sayuran dan Bumbu',
        isStrategic: false,
      },
    }),
    prisma.commodity.upsert({
      where: { code: 'BAWANG_PUTIH' },
      update: {},
      create: {
        name: 'Bawang Putih',
        type: 'BAWANG_PUTIH',
        code: 'BAWANG_PUTIH',
        unit: 'kg',
        description: 'Bawang putih sebagai bumbu dasar masakan Indonesia',
        category: 'Sayuran dan Bumbu',
        isStrategic: false,
      },
    }),
    prisma.commodity.upsert({
      where: { code: 'TOMAT' },
      update: {},
      create: {
        name: 'Tomat',
        type: 'TOMAT',
        code: 'TOMAT',
        unit: 'kg',
        description: 'Tomat sebagai sayuran dan bumbu masakan',
        category: 'Sayuran dan Bumbu',
        isStrategic: false,
      },
    }),
  ]);

  console.log(`✅ Created ${commodities.length} commodities`);

  // Create admin user
  console.log('👤 Creating admin user...');
  const hashedPassword = await bcrypt.hash('admin123', 12);
  
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@komoditaswatch.id' },
    update: {},
    create: {
      email: 'admin@komoditaswatch.id',
      username: 'admin',
      password: hashedPassword,
      fullName: 'Administrator',
      role: 'ADMIN',
      isActive: true,
      emailVerified: true,
      profile: {
        create: {
          organization: 'Komoditas Watch',
          position: 'System Administrator',
          regionId: regions.find(r => r.code === '31')?.id, // Jakarta
        },
      },
    },
  });

  console.log('✅ Created admin user');

  // Create regulator user
  console.log('👤 Creating regulator user...');
  const regulatorPassword = await bcrypt.hash('regulator123', 12);
  
  const regulatorUser = await prisma.user.upsert({
    where: { email: 'regulator@kemendag.go.id' },
    update: {},
    create: {
      email: 'regulator@kemendag.go.id',
      username: 'regulator',
      password: regulatorPassword,
      fullName: 'Regulator Kemendag',
      role: 'REGULATOR',
      isActive: true,
      emailVerified: true,
      profile: {
        create: {
          organization: 'Kementerian Perdagangan',
          position: 'Analis Harga',
          regionId: regions.find(r => r.code === '31')?.id, // Jakarta
        },
      },
    },
  });

  console.log('✅ Created regulator user');

  // Create sample price data
  console.log('💰 Creating sample price data...');
  const now = new Date();
  const samplePrices = [];

  for (const commodity of commodities.slice(0, 5)) { // First 5 commodities
    for (const region of regions.slice(0, 3)) { // First 3 regions
      // Create price data for the last 30 days
      for (let i = 0; i < 30; i++) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);

        const basePrice = {
          'BERAS': 12000,
          'JAGUNG': 5000,
          'KEDELAI': 8000,
          'GULA_PASIR': 14000,
          'MINYAK_GORENG': 16000,
        }[commodity.code] || 10000;

        // Add some random variation (±20%)
        const variation = (Math.random() - 0.5) * 0.4;
        const price = Math.round(basePrice * (1 + variation));

        samplePrices.push({
          commodityId: commodity.id,
          regionId: region.id,
          priceType: 'KONSUMEN' as const,
          price: price,
          currency: 'IDR',
          date: date,
          source: 'Seed Data',
          isValidated: true,
        });
      }
    }
  }

  await prisma.price.createMany({
    data: samplePrices,
    skipDuplicates: true,
  });

  console.log(`✅ Created ${samplePrices.length} sample price records`);

  // Create system configurations
  console.log('⚙️ Creating system configurations...');
  const configs = await Promise.all([
    prisma.systemConfig.upsert({
      where: { key: 'scraping_enabled' },
      update: {},
      create: {
        key: 'scraping_enabled',
        value: 'true',
        dataType: 'boolean',
        category: 'scraping',
      },
    }),
    prisma.systemConfig.upsert({
      where: { key: 'scraping_interval_minutes' },
      update: {},
      create: {
        key: 'scraping_interval_minutes',
        value: '360',
        dataType: 'number',
        category: 'scraping',
      },
    }),
    prisma.systemConfig.upsert({
      where: { key: 'alert_price_threshold_percent' },
      update: {},
      create: {
        key: 'alert_price_threshold_percent',
        value: '20',
        dataType: 'number',
        category: 'alerts',
      },
    }),
    prisma.systemConfig.upsert({
      where: { key: 'email_notifications_enabled' },
      update: {},
      create: {
        key: 'email_notifications_enabled',
        value: 'false',
        dataType: 'boolean',
        category: 'notifications',
      },
    }),
  ]);

  console.log(`✅ Created ${configs.length} system configurations`);

  console.log('🎉 Database seeding completed successfully!');
  console.log('');
  console.log('📋 Test credentials:');
  console.log('Admin: admin@komoditaswatch.id / admin123');
  console.log('Regulator: regulator@kemendag.go.id / regulator123');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
