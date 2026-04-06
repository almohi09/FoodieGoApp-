import { Router } from "express";
import catalogRepository from "../../db/repositories/catalogRepository.js";
import { getRestaurantMenuItem } from "../../lib/core.js";
import { db } from "../../store.js";

const router = Router();

router.get("/restaurants", async (_req, res) => {
  if (catalogRepository.isEnabled()) {
    const restaurants = await catalogRepository.getRestaurants();
    if (restaurants) {
      return res.json({ restaurants });
    }
  }
  return res.json({ restaurants: Array.from(db.restaurants.values()) });
});

router.get("/restaurants/featured", async (_req, res) => {
  if (catalogRepository.isEnabled()) {
    const restaurants = await catalogRepository.getRestaurants();
    if (restaurants) {
      return res.json({ restaurants: restaurants.slice(0, 5) });
    }
  }
  return res.json({ restaurants: Array.from(db.restaurants.values()).slice(0, 5) });
});

router.get("/restaurants/search", async (req, res) => {
  const q = String(req.query.q || "").toLowerCase();
  let source = Array.from(db.restaurants.values());
  if (catalogRepository.isEnabled()) {
    const pgRestaurants = await catalogRepository.getRestaurants();
    if (pgRestaurants) {
      source = pgRestaurants as any;
    }
  }
  const restaurants = source.filter((restaurant: any) => {
    if (!q) {
      return true;
    }
    return restaurant.name.toLowerCase().includes(q) || restaurant.cuisines.some((c) => c.toLowerCase().includes(q));
  });
  res.json({ restaurants, total: restaurants.length });
});

router.get("/restaurants/nearby", (_req, res) => {
  res.json({ restaurants: Array.from(db.restaurants.values()) });
});

router.get("/restaurants/:restaurantId", async (req, res) => {
  let restaurant = db.restaurants.get(req.params.restaurantId) as any;
  if (catalogRepository.isEnabled()) {
    const pgRestaurant = await catalogRepository.getRestaurantById(req.params.restaurantId);
    if (pgRestaurant) {
      restaurant = pgRestaurant;
    }
  }
  if (!restaurant) {
    return res.status(404).json({ message: "Restaurant not found" });
  }
  return res.json({ restaurant });
});

router.get("/restaurants/:restaurantId/menu", async (req, res) => {
  let menu = (db.menuByRestaurant.get(req.params.restaurantId) || []) as any[];
  if (catalogRepository.isEnabled()) {
    const pgMenu = await catalogRepository.getMenuByRestaurant(req.params.restaurantId);
    if (pgMenu) {
      menu = pgMenu as any[];
    }
  }
  const categories = Array.from(new Set(menu.map((m) => m.category)));
  res.json({ menu, categories, items: menu });
});

router.get("/restaurants/:restaurantId/status", (req, res) => {
  const restaurant = db.restaurants.get(req.params.restaurantId);
  res.json({ isOpen: Boolean(restaurant?.isOpen) });
});

router.get("/restaurants/:restaurantId/hours", (req, res) => {
  const restaurant = db.restaurants.get(req.params.restaurantId);
  res.json({
    isOpen: Boolean(restaurant?.isOpen),
    nextOpensAt: restaurant?.isOpen ? undefined : new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
    nextClosesAt: restaurant?.isOpen ? new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString() : undefined,
  });
});

router.get("/restaurants/:restaurantId/delivery-info", (_req, res) => {
  res.json({ estimatedMinutes: 35, deliveryFee: 35, packagingFee: 10, canDeliver: true });
});

router.post("/restaurants/:restaurantId/check-availability", (req, res) => {
  const items = Array.isArray(req.body?.items) ? req.body.items : [];
  const unavailableItems: string[] = [];
  for (const item of items) {
    const menuItemId = String(item?.menuItemId || "");
    const found = getRestaurantMenuItem(req.params.restaurantId, menuItemId);
    if (!found || !found.isAvailable || (found.stock ?? 1) <= 0) {
      unavailableItems.push(menuItemId);
    }
  }
  return res.json({ available: unavailableItems.length === 0, unavailableItems });
});

router.get("/cuisines", (_req, res) => {
  const set = new Set(Array.from(db.restaurants.values()).flatMap((r) => r.cuisines));
  res.json({ cuisines: Array.from(set) });
});

export default router;
