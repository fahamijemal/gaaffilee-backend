import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // ── Streams ──────────────────────────────────────────────────────────────
  const natural = await prisma.stream.upsert({
    where: { slug: 'natural' },
    update: {},
    create: { id: 'clx_stream_nat', name: 'Natural Science', slug: 'natural', color_hex: '#0E7490' },
  });
  const social = await prisma.stream.upsert({
    where: { slug: 'social' },
    update: {},
    create: { id: 'clx_stream_soc', name: 'Social Science', slug: 'social', color_hex: '#166534' },
  });

  // ── Subjects ─────────────────────────────────────────────────────────────
  const subjectData = [
    { stream_id: natural.id, name: 'Mathematics', slug: 'mathematics', grade_min: 9, grade_max: 12 },
    { stream_id: natural.id, name: 'Physics', slug: 'physics', grade_min: 9, grade_max: 12 },
    { stream_id: natural.id, name: 'Chemistry', slug: 'chemistry', grade_min: 9, grade_max: 12 },
    { stream_id: natural.id, name: 'Biology', slug: 'biology', grade_min: 9, grade_max: 12 },
    { stream_id: natural.id, name: 'English', slug: 'english-nat', grade_min: 9, grade_max: 12 },
    { stream_id: natural.id, name: 'Civics & Ethical Education', slug: 'civics-nat', grade_min: 9, grade_max: 12 },
    { stream_id: social.id, name: 'History', slug: 'history', grade_min: 9, grade_max: 12 },
    { stream_id: social.id, name: 'Geography', slug: 'geography', grade_min: 9, grade_max: 12 },
    { stream_id: social.id, name: 'Economics', slug: 'economics', grade_min: 9, grade_max: 12 },
    { stream_id: social.id, name: 'Civics & Ethical Education', slug: 'civics-soc', grade_min: 9, grade_max: 12 },
    { stream_id: social.id, name: 'English', slug: 'english-soc', grade_min: 9, grade_max: 12 },
    { stream_id: social.id, name: 'Basic Mathematics', slug: 'basic-maths', grade_min: 9, grade_max: 12 },
  ];

  for (const s of subjectData) {
    await prisma.subject.upsert({ where: { slug: s.slug }, update: {}, create: s });
  }

  // ── Admin user ────────────────────────────────────────────────────────────
  const adminHash = process.env.SEED_ADMIN_HASH;
  if (adminHash) {
    await prisma.user.upsert({
      where: { email: 'admin@gaaffilee.et' },
      update: {},
      create: {
        name: 'Platform Admin',
        email: 'admin@gaaffilee.et',
        password_hash: adminHash,
        role: 'admin',
      },
    });
    console.log('✓ Admin user seeded');
  } else {
    console.warn('⚠  SEED_ADMIN_HASH not set — admin user skipped');
  }

  console.log('✓ Seed complete: 2 streams, 12 subjects');
}

main().catch(console.error).finally(() => prisma.$disconnect());
