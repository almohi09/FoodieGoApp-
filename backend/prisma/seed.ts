import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const customer = await prisma.user.upsert({
    where: { phone: "+919000000001" },
    update: {},
    create: {
      phone: "+919000000001",
      name: "Aarav",
      email: "aarav@example.com",
      role: "customer",
      status: "active",
      addresses: {
        create: {
          label: "home",
          address: "123 MG Road, Bengaluru",
          lat: 12.9716,
          lng: 77.5946,
          isDefault: true,
        },
      },
    },
  });

  const seller = await prisma.seller.upsert({
    where: { email: "seller@foodiego.in" },
    update: {},
    create: {
      phone: "+919000000010",
      name: "Karan",
      email: "seller@foodiego.in",
      businessName: "Pizza Palace LLP",
      businessType: "restaurant",
      status: "approved",
      totalOrders: 1200,
      totalRevenue: 340000,
    },
  });

  const restaurant = await prisma.restaurant.upsert({
    where: { sellerId: seller.id },
    update: {},
    create: {
      name: "Pizza Palace",
      image: "https://images.example.com/pizza-palace.jpg",
      rating: 4.4,
      reviewCount: 520,
      deliveryTime: "25-35 mins",
      deliveryFee: 35,
      cuisines: ["Italian", "Fast Food"],
      isOpen: true,
      sellerId: seller.id,
    },
  });

  await prisma.menuItem.createMany({
    data: [
      {
        restaurantId: restaurant.id,
        name: "Margherita Pizza",
        description: "Classic mozzarella and tomato",
        price: 249,
        image: "https://images.example.com/margherita.jpg",
        category: "Pizza",
        isVeg: true,
        isCustomizable: true,
        isAvailable: true,
        popular: true,
        stock: 20,
      },
      {
        restaurantId: restaurant.id,
        name: "Farmhouse Pizza",
        description: "Loaded with veggies and cheese",
        price: 329,
        image: "https://images.example.com/farmhouse.jpg",
        category: "Pizza",
        isVeg: true,
        isCustomizable: true,
        isAvailable: true,
        popular: false,
        stock: 14,
      },
    ],
    skipDuplicates: true,
  });

  await prisma.admin.upsert({
    where: { email: "admin@foodiego.in" },
    update: {},
    create: {
      email: "admin@foodiego.in",
      name: "Operations Admin",
      role: "operations",
      permissions: ["users:manage", "sellers:manage", "payouts:manage", "dispatch:manage"],
    },
  });

  await prisma.payout.upsert({
    where: { id: "payout_1" },
    update: {},
    create: {
      id: "payout_1",
      sellerId: seller.id,
      sellerName: seller.businessName,
      amount: 12500,
      status: "pending",
      cycle: "weekly",
    },
  });

  await prisma.dispatchRider.upsert({
    where: { id: "rider_1" },
    update: {},
    create: {
      id: "rider_1",
      name: "Amit Rider",
      phone: "+919000000021",
      isAvailable: true,
    },
  });

  await prisma.dispatchRider.upsert({
    where: { id: "rider_2" },
    update: {},
    create: {
      id: "rider_2",
      name: "Riya Rider",
      phone: "+919000000022",
      isAvailable: true,
    },
  });

  await prisma.dispatchOrder.upsert({
    where: { id: "pilot_o_1001" },
    update: {},
    create: {
      id: "pilot_o_1001",
      restaurantName: "Pizza Palace",
      amount: 420,
      status: "ready_for_pickup",
    },
  });

  console.log("Seed completed", { customerId: customer.id, sellerId: seller.id, restaurantId: restaurant.id });
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
