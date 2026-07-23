import argon2 from 'argon2';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const permissions = [
  'products.read','products.create','products.update','products.archive','inventory.read','inventory.adjust',
  'orders.read','orders.update_status','orders.cancel','orders.refund','customers.read','customers.suspend',
  'coupons.manage','reviews.moderate','banners.manage','settings.manage','admins.manage','audit.read',
];
const rolePermissions: Record<string, string[]> = {
  SUPER_ADMIN: permissions,
  ADMIN: permissions.filter((p) => p !== 'admins.manage'),
  ORDER_MANAGER: ['orders.read','orders.update_status','orders.cancel','orders.refund','customers.read'],
  INVENTORY_MANAGER: ['products.read','products.create','products.update','products.archive','inventory.read','inventory.adjust'],
  CONTENT_MANAGER: ['products.read','products.update','reviews.moderate','banners.manage','settings.manage'],
  SUPPORT_AGENT: ['orders.read','customers.read','reviews.moderate'],
};

async function main() {
  const permissionRows = new Map<string, string>();
  for (const code of permissions) {
    const row = await prisma.permission.upsert({ where: { code }, update: {}, create: { code } });
    permissionRows.set(code, row.id);
  }
  const roles = new Map<string, string>();
  for (const [code, grants] of Object.entries(rolePermissions)) {
    const role = await prisma.role.upsert({
      where: { code },
      update: { name: code.replaceAll('_', ' ') },
      create: { code, name: code.replaceAll('_', ' '), isSystem: true },
    });
    roles.set(code, role.id);
    await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });
    await prisma.rolePermission.createMany({ data: grants.map((grant) => ({ roleId: role.id, permissionId: permissionRows.get(grant)! })) });
  }

  const adminEmail = (process.env.INITIAL_ADMIN_EMAIL ?? 'admin@swoosh.local').toLowerCase();
  const adminPassword = process.env.INITIAL_ADMIN_PASSWORD ?? 'ChangeMeNow!2026';
  if (process.env.NODE_ENV === 'production' && !process.env.INITIAL_ADMIN_PASSWORD) {
    throw new Error('INITIAL_ADMIN_PASSWORD is required when seeding production');
  }
  const admin = await prisma.adminUser.upsert({
    where: { email: adminEmail },
    update: {},
    create: { email: adminEmail, name: 'Development Super Admin', passwordHash: await argon2.hash(adminPassword, { type: argon2.argon2id }) },
  });
  await prisma.adminRole.upsert({
    where: { adminId_roleId: { adminId: admin.id, roleId: roles.get('SUPER_ADMIN')! } },
    update: {}, create: { adminId: admin.id, roleId: roles.get('SUPER_ADMIN')! },
  });

  const category = await prisma.category.upsert({
    where: { slug: 't-shirts' }, update: {}, create: { name: 'T-Shirts', slug: 't-shirts', description: 'Everyday premium cotton t-shirts' },
  });
  const collection = await prisma.collection.upsert({
    where: { slug: 'new-arrivals' }, update: {}, create: { name: 'New Arrivals', slug: 'new-arrivals', isFeatured: true },
  });
  const product = await prisma.product.upsert({
    where: { slug: 'essential-cotton-tee' },
    update: {},
    create: {
      categoryId: category.id, name: 'Essential Cotton Tee', slug: 'essential-cotton-tee', skuPrefix: 'ECT',
      shortDescription: 'Soft combed-cotton everyday tee.', description: 'A breathable, durable premium cotton t-shirt.',
      regularPrice: '1200.00', salePrice: '990.00', status: 'ACTIVE', isFeatured: true, isNewArrival: true,
      tags: ['cotton','unisex'], createdByAdminId: admin.id,
    },
  });
  await prisma.collectionProduct.upsert({
    where: { collectionId_productId: { collectionId: collection.id, productId: product.id } },
    update: {}, create: { collectionId: collection.id, productId: product.id },
  });
  const color = await prisma.productOption.upsert({
    where: { productId_name: { productId: product.id, name: 'Color' } }, update: {}, create: { productId: product.id, name: 'Color', sortOrder: 0 },
  });
  const size = await prisma.productOption.upsert({
    where: { productId_name: { productId: product.id, name: 'Size' } }, update: {}, create: { productId: product.id, name: 'Size', sortOrder: 1 },
  });
  const black = await prisma.productOptionValue.upsert({
    where: { optionId_value: { optionId: color.id, value: 'Black' } }, update: {}, create: { optionId: color.id, value: 'Black', metadata: { hex: '#111111' } },
  });
  const medium = await prisma.productOptionValue.upsert({
    where: { optionId_value: { optionId: size.id, value: 'M' } }, update: {}, create: { optionId: size.id, value: 'M' },
  });
  const variant = await prisma.productVariant.upsert({
    where: { sku: 'ECT-BLK-M' }, update: {}, create: { productId: product.id, sku: 'ECT-BLK-M', stock: 25, lowStockThreshold: 5 },
  });
  for (const valueId of [black.id, medium.id]) {
    await prisma.variantOptionValue.upsert({ where: { variantId_valueId: { variantId: variant.id, valueId } }, update: {}, create: { variantId: variant.id, valueId } });
  }
  if (!await prisma.inventoryMovement.findFirst({ where: { variantId: variant.id, type: 'RESTOCK' } })) {
    await prisma.inventoryMovement.create({ data: { variantId: variant.id, type: 'RESTOCK', quantity: 25, previousStock: 0, newStock: 25, reason: 'Development seed', adminId: admin.id } });
  }
  await prisma.coupon.upsert({
    where: { code: 'WELCOME10' }, update: {}, create: {
      code: 'WELCOME10', type: 'PERCENTAGE', value: '10.00', minimumSpend: '500.00', maximumDiscount: '300.00',
      totalUsageLimit: 1000, perCustomerUsageLimit: 1, startsAt: new Date('2025-01-01T00:00:00Z'), expiresAt: new Date('2030-12-31T23:59:59Z'),
      firstOrderOnly: true, createdByAdminId: admin.id,
    },
  });
  await prisma.banner.upsert({
    where: { id: 'seed-home-hero' }, update: {}, create: { id: 'seed-home-hero', title: 'New essentials', imageUrl: 'https://images.example.invalid/banner.jpg', location: 'HOME_HERO' },
  });
  const settings: Array<[string, unknown, boolean]> = [
    ['store.name','Swoosh',true], ['currency',{ code: 'BDT', symbol: '৳' },true],
    ['delivery.dhaka_inside',{ charge: 100, active: true },true], ['delivery.outside_dhaka',{ charge: 150, active: true },true],
    ['payment.cod',{ active: true },true], ['maintenance',{ active: false },true],
  ];
  for (const [key, value, isPublic] of settings) {
    await prisma.siteSetting.upsert({ where: { key }, update: { value: value as never, isPublic }, create: { key, value: value as never, isPublic, updatedByAdminId: admin.id } });
  }

  const customer = await prisma.user.upsert({
    where: { email: 'customer@example.com' }, update: {}, create: {
      email: 'customer@example.com', name: 'Example Customer', phone: '+8801712345678',
      passwordHash: await argon2.hash('CustomerPass!2026', { type: argon2.argon2id }), emailVerifiedAt: new Date(),
    },
  });
  const order = await prisma.order.findUnique({ where: { orderNumber: 'SW-SEED-0001' } });
  if (!order) {
    await prisma.order.create({
      data: {
        orderNumber: 'SW-SEED-0001', customerId: customer.id, customerName: customer.name, customerPhone: customer.phone!,
        customerEmail: customer.email, addressSnapshot: { division: 'Dhaka', district: 'Dhaka', area: 'Dhanmondi', addressLine: 'Development address' },
        deliveryZone: 'DHAKA_INSIDE', deliveryCharge: '100.00', subtotal: '990.00', productDiscount: '210.00',
        grandTotal: '1090.00', paymentMethod: 'COD', paymentStatus: 'PENDING', status: 'DELIVERED',
        publicTrackingTokenHash: 'seed000000000000000000000000000000000000000000000000000000000000',
        items: { create: {
          productId: product.id, variantId: variant.id, productNameSnapshot: product.name, productSlugSnapshot: product.slug,
          productSkuSnapshot: product.skuPrefix, variantSkuSnapshot: variant.sku, variantDetailsSnapshot: [{ option: 'Color', value: 'Black' }, { option: 'Size', value: 'M' }],
          regularUnitPrice: '1200.00', unitPrice: '990.00', unitDiscount: '210.00', quantity: 1, lineTotal: '990.00',
        } },
        statusHistory: { create: { newStatus: 'DELIVERED', actorType: 'SYSTEM', note: 'Development seed example' } },
        payments: { create: { method: 'COD', provider: 'CASH_ON_DELIVERY', amount: '1090.00', status: 'PENDING' } },
      },
    });
  }
  console.log(`Seed complete. Development admin: ${adminEmail}`);
}

main().finally(() => prisma.$disconnect());
