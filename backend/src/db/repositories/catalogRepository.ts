import { prisma, usePostgres } from "../prismaClient.js";

const toRestaurantDto = (row: any) => ({
  id: row.id,
  name: row.name,
  image: row.image,
  rating: row.rating,
  reviewCount: row.reviewCount,
  deliveryTime: row.deliveryTime,
  deliveryFee: row.deliveryFee,
  cuisines: row.cuisines,
  isOpen: row.isOpen,
  sellerId: row.sellerId || undefined,
});

const toMenuItemDto = (row: any) => ({
  id: row.id,
  name: row.name,
  description: row.description,
  price: row.price,
  image: row.image,
  category: row.category,
  isVeg: row.isVeg,
  isCustomizable: row.isCustomizable,
  isAvailable: row.isAvailable,
  popular: row.popular || false,
  stock: row.stock ?? undefined,
});

export const catalogRepository = {
  isEnabled(): boolean {
    return usePostgres;
  },

  async getRestaurants() {
    if (!usePostgres) {
      return null;
    }
    const rows = await prisma.restaurant.findMany({
      orderBy: { createdAt: "desc" },
    });
    return rows.map(toRestaurantDto);
  },

  async getRestaurantById(restaurantId: string) {
    if (!usePostgres) {
      return null;
    }
    const row = await prisma.restaurant.findUnique({ where: { id: restaurantId } });
    return row ? toRestaurantDto(row) : null;
  },

  async getMenuByRestaurant(restaurantId: string) {
    if (!usePostgres) {
      return null;
    }
    const rows = await prisma.menuItem.findMany({
      where: { restaurantId },
      orderBy: [{ category: "asc" }, { name: "asc" }],
    });
    return rows.map(toMenuItemDto);
  },
};

export default catalogRepository;
