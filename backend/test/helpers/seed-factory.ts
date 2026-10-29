import { PrismaClient } from '@prisma/client';

export async function resetDatabase(prisma: PrismaClient) {
  await prisma.$transaction([
    prisma.orderItem.deleteMany(),
    prisma.order.deleteMany(),
    prisma.product.deleteMany(),
    prisma.customer.deleteMany(),
  ]);
}

/**
 * Generates a random HW-XX-XXXX SKU and checks PostgreSQL
 * to guarantee it does not collide with an existing row.
 */
async function generateUniqueTestSku(
  prisma: PrismaClient,
  nameHint: string,
): Promise<string> {
  const prefix =
    nameHint
      .replace(/[^a-zA-Z]/g, '')
      .substring(0, 2)
      .toUpperCase() || 'GN';

  while (true) {
    const randomCode = Math.random().toString(36).substring(2, 6).toUpperCase();
    const candidateSku = `HW-${prefix}-${randomCode}`;

    const existing = await prisma.product.findFirst({
      where: { sku: { equals: candidateSku, mode: 'insensitive' } },
    });

    if (!existing) {
      return candidateSku;
    }
  }
}

export async function createTestScenario(
  prisma: PrismaClient,
  overrides?: {
    sku?: string;
    buyer_name?: string;
    email?: string;
    country?: string;
    product_name?: string;
    price?: number;
    stockQuantity?: number;
    reorderLevel?: number;
  },
) {
  const uniqueId = `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

  const customerEmail = overrides?.email ?? `buyer-${uniqueId}@test.io`;
  const customer = await prisma.customer.upsert({
    where: { email: customerEmail },
    update: {}, // Ignore if customer email already exists
    create: {
      name: overrides?.buyer_name ?? 'Test Buyer',
      email: customerEmail,
      country: overrides?.country ?? 'USA',
    },
  });

  const productName = overrides?.product_name ?? 'Test Hardware';
  const finalSku =
    overrides?.sku?.trim().toUpperCase() ??
    (await generateUniqueTestSku(prisma, productName));

  // upsert prevents unique constraint crashes if the SKU is already in the DB
  const product = await prisma.product.upsert({
    where: { sku: finalSku },
    // Use update: {} to keep the existing product untouched, OR pass the fields
    // below so the test scenario's stockQuantity/price overrides are enforced:
    update: {
      name: productName,
      price: overrides?.price ?? 100.0,
      stockQuantity: overrides?.stockQuantity ?? 10,
      reorderLevel: overrides?.reorderLevel ?? 3,
    },
    create: {
      sku: finalSku,
      name: productName,
      price: overrides?.price ?? 100.0,
      stockQuantity: overrides?.stockQuantity ?? 10,
      reorderLevel: overrides?.reorderLevel ?? 3,
    },
  });

  return { customer, product };
}