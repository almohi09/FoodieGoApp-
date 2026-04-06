import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import crypto from "node:crypto";
import { prisma, usePostgres } from "../src/db/prismaClient.js";

const nowIso = () => new Date().toISOString();
const id = (prefix: string) => `${prefix}_${crypto.randomUUID().slice(0, 10)}`;

const run = async () => {
  if (!usePostgres) {
    throw new Error("backup:restore:drill requires USE_POSTGRES=true");
  }

  const createdAt = new Date();
  const userId = id("drill_user");
  const addressId = id("drill_addr");
  const orderId = id("drill_order");
  const orderItemId = id("drill_item");
  const trackId = id("drill_track");
  const paymentId = id("drill_pay");

  const phone = `+9188${Date.now().toString().slice(-8)}`;

  await prisma.user.create({
    data: {
      id: userId,
      phone,
      role: "customer",
      status: "active",
      createdAt,
      updatedAt: createdAt,
      orderCount: 1,
      totalSpend: 199,
    },
  });

  await prisma.address.create({
    data: {
      id: addressId,
      userId,
      label: "drill",
      address: "Backup Restore Drill Street",
      landmark: "Near Reliability Gate",
      lat: 12.9716,
      lng: 77.5946,
      isDefault: true,
      createdAt,
      updatedAt: createdAt,
    },
  });

  await prisma.order.create({
    data: {
      id: orderId,
      userId,
      restaurantId: "cmnnahc600004hwbchctveu7c",
      restaurantName: "Pizza Palace",
      restaurantImage: "https://images.example.com/pizza-palace.jpg",
      status: "pending",
      subtotal: 164,
      deliveryFee: 35,
      discount: 0,
      foodieCoinsUsed: 0,
      foodieCoinsEarned: 8,
      finalAmount: 199,
      deliveryAddress: {
        id: addressId,
        label: "drill",
        address: "Backup Restore Drill Street",
        lat: 12.9716,
        lng: 77.5946,
      } as any,
      paymentMethod: "upi",
      estimatedDelivery: new Date(Date.now() + 40 * 60 * 1000),
      sellerId: "cmnnahc5r0002hwbcu7uyibhc",
      createdAt,
      updatedAt: createdAt,
    },
  });

  await prisma.orderItem.create({
    data: {
      id: orderItemId,
      orderId,
      menuItemId: "cmnnahc63000ahwbc5w95v8r8",
      name: "Margherita Pizza",
      quantity: 1,
      price: 164,
      createdAt,
    },
  });

  await prisma.trackingEvent.create({
    data: {
      id: trackId,
      orderId,
      status: "placed",
      message: "Order placed for backup/restore drill",
      timestamp: createdAt,
    },
  });

  await prisma.paymentTransaction.create({
    data: {
      id: paymentId,
      orderId,
      method: "upi",
      status: "pending",
      transactionId: `upi_${crypto.randomUUID().slice(0, 10)}`,
      source: "unknown",
      amount: 199,
      createdAt,
      updatedAt: createdAt,
    },
  });

  const backup = {
    metadata: {
      capturedAt: nowIso(),
      drill: "backup_restore_validation",
    },
    user: await prisma.user.findUnique({ where: { id: userId } }),
    addresses: await prisma.address.findMany({ where: { userId } }),
    order: await prisma.order.findUnique({ where: { id: orderId } }),
    items: await prisma.orderItem.findMany({ where: { orderId } }),
    tracking: await prisma.trackingEvent.findMany({ where: { orderId } }),
    payments: await prisma.paymentTransaction.findMany({ where: { orderId } }),
  };

  const outDir = join(process.cwd(), "artifacts", "backups");
  await mkdir(outDir, { recursive: true });
  const backupFile = join(outDir, `backup-restore-drill-${new Date().toISOString().replaceAll(":", "-")}.json`);
  await writeFile(backupFile, JSON.stringify(backup, null, 2), "utf8");

  await prisma.order.delete({ where: { id: orderId } });
  await prisma.user.delete({ where: { id: userId } });

  const existsAfterDelete = {
    user: await prisma.user.findUnique({ where: { id: userId } }),
    order: await prisma.order.findUnique({ where: { id: orderId } }),
  };

  if (existsAfterDelete.user || existsAfterDelete.order) {
    throw new Error("Delete verification failed during backup/restore drill");
  }

  await prisma.user.create({
    data: {
      id: backup.user!.id,
      phone: backup.user!.phone,
      name: backup.user!.name,
      email: backup.user!.email,
      role: backup.user!.role,
      status: backup.user!.status,
      createdAt: backup.user!.createdAt,
      updatedAt: new Date(),
      orderCount: backup.user!.orderCount,
      totalSpend: backup.user!.totalSpend,
    },
  });

  for (const address of backup.addresses) {
    await prisma.address.create({
      data: {
        id: address.id,
        userId: address.userId,
        label: address.label,
        address: address.address,
        landmark: address.landmark,
        lat: address.lat,
        lng: address.lng,
        isDefault: address.isDefault,
        createdAt: address.createdAt,
        updatedAt: new Date(),
      },
    });
  }

  await prisma.order.create({
    data: {
      id: backup.order!.id,
      userId: backup.order!.userId,
      restaurantId: backup.order!.restaurantId,
      restaurantName: backup.order!.restaurantName,
      restaurantImage: backup.order!.restaurantImage,
      status: backup.order!.status,
      subtotal: backup.order!.subtotal,
      deliveryFee: backup.order!.deliveryFee,
      discount: backup.order!.discount,
      foodieCoinsUsed: backup.order!.foodieCoinsUsed,
      foodieCoinsEarned: backup.order!.foodieCoinsEarned,
      finalAmount: backup.order!.finalAmount,
      deliveryAddress: backup.order!.deliveryAddress as any,
      paymentMethod: backup.order!.paymentMethod,
      estimatedDelivery: backup.order!.estimatedDelivery,
      deliveredAt: backup.order!.deliveredAt,
      sellerId: backup.order!.sellerId,
      acceptedAt: backup.order!.acceptedAt,
      startedPrepAt: backup.order!.startedPrepAt,
      readyAt: backup.order!.readyAt,
      createdAt: backup.order!.createdAt,
      updatedAt: new Date(),
    },
  });

  for (const item of backup.items) {
    await prisma.orderItem.create({
      data: {
        id: item.id,
        orderId: item.orderId,
        menuItemId: item.menuItemId,
        name: item.name,
        quantity: item.quantity,
        price: item.price,
        customizations: item.customizations,
        createdAt: item.createdAt,
      },
    });
  }

  for (const event of backup.tracking) {
    await prisma.trackingEvent.create({
      data: {
        id: event.id,
        orderId: event.orderId,
        status: event.status,
        message: event.message,
        location: event.location as any,
        timestamp: event.timestamp,
      },
    });
  }

  for (const payment of backup.payments) {
    await prisma.paymentTransaction.create({
      data: {
        id: payment.id,
        orderId: payment.orderId,
        method: payment.method,
        status: payment.status,
        transactionId: payment.transactionId,
        source: payment.source,
        amount: payment.amount,
        metadata: payment.metadata as any,
        createdAt: payment.createdAt,
        updatedAt: new Date(),
      },
    });
  }

  const restored = {
    user: await prisma.user.findUnique({ where: { id: userId } }),
    addresses: await prisma.address.findMany({ where: { userId } }),
    order: await prisma.order.findUnique({ where: { id: orderId } }),
    items: await prisma.orderItem.findMany({ where: { orderId } }),
    tracking: await prisma.trackingEvent.findMany({ where: { orderId } }),
    payments: await prisma.paymentTransaction.findMany({ where: { orderId } }),
  };

  const pass =
    Boolean(restored.user) &&
    Boolean(restored.order) &&
    restored.addresses.length === backup.addresses.length &&
    restored.items.length === backup.items.length &&
    restored.tracking.length === backup.tracking.length &&
    restored.payments.length === backup.payments.length;

  console.log(
    JSON.stringify(
      {
        pass,
        backupFile,
        entities: {
          userId,
          orderId,
          addressCount: restored.addresses.length,
          itemCount: restored.items.length,
          trackingCount: restored.tracking.length,
          paymentCount: restored.payments.length,
        },
      },
      null,
      2,
    ),
  );
};

run().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(JSON.stringify({ pass: false, error: message }, null, 2));
  process.exit(1);
});
