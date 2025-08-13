import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  await prisma.role.createMany({
    data: [
      { id:"61c4815d-9b78-4493-911b-126ec6fe291d", name: 'admin', description: 'Administrator with full access' },
      { id:"34fa9429-f7ef-4dcc-8b8d-06b3734456cb", name: 'user', description: 'Regular user with limited access' },
      { id:"e7002028-f6a1-4c2f-b783-7132f8a9e540", name: 'anonymous', description: 'Guest user with minimal access' },
    ],
    skipDuplicates: true, // Không insert lại nếu đã tồn tại
  });
  console.log('✅ Roles seeded successfully');

  const adminRole = await prisma.role.findUnique({
    where: { name: 'admin' },
  });

  if (!adminRole) {
    throw new Error('Admin role not found. Cannot seed admin user.');
  }

  // 3. Mã hóa mật khẩu admin
  const hashedPassword = await bcrypt.hash('admin@6688', 10);

  // 4. Tạo tài khoản admin nếu chưa có
  const existingAdmin = await prisma.user.findUnique({
    where: { username: 'admin' },
  });

  if (!existingAdmin) {
    await prisma.user.create({
      data: {
        username: 'admin',
        email: 'admin@admin.com',
        firstName: 'Super',
        lastName: 'Admin',
        role: { connect: { id: adminRole.id } },
        accounts: {
          create: {
            provider: 'local',
            providerAccountId: 'admin@admin.com',
            password: hashedPassword,
          },
        },
      },
    });

    console.log('✅ Admin user seeded successfully');
  } else {
    console.log('ℹ️ Admin user already exists, skipping.');
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
