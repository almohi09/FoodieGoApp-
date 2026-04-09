export const API_BASE_URL = 'https://foodiegoapp-backend.onrender.com/api/v1';

export const APP_NAME = 'FoodieGo';
export const APP_TAGLINE = 'Delicious food, delivered fast';

export const DELIVERY_FEE_MIN = 20;
export const DELIVERY_FEE_MAX = 60;

export const FOODIE_PASS_PRICE = 99;

export const COIN_EARN_RATE = 10;
export const COIN_REDEEM_RATE = 100;
export const COIN_REDEEM_VALUE = 10;

export const STREAK_BONUS_COINS = 50;
export const STREAK_DAYS = 3;
export const BIRTHDAY_MULTIPLIER = 2;

export const MAX_DELIVERY_SCHEDULE_HOURS = 24;

export const DEFAULT_LOCATION = {
  lat: 28.6139,
  lng: 77.209,
  address: 'New Delhi, India',
};

export const CUISINES = [
  { id: '1', name: 'Pizza', icon: 'pizza' },
  { id: '2', name: 'Biryani', icon: 'food-variant' },
  { id: '3', name: 'Burger', icon: 'hamburger' },
  { id: '4', name: 'Chinese', icon: 'bowl-mix' },
  { id: '5', name: 'South Indian', icon: 'bowl-steam' },
  { id: '6', name: 'Desserts', icon: 'ice-cream' },
  { id: '7', name: 'Pasta', icon: 'noodles' },
  { id: '8', name: 'Salad', icon: 'leaf' },
  { id: '9', name: 'Sushi', icon: 'fish' },
  { id: '10', name: 'Street Food', icon: 'food' },
];

export const ONBOARDING_SLIDES = [
  {
    id: '1',
    title: 'Order from Best Restaurants',
    description:
      'Discover thousands of restaurants and order your favorite dishes with just a few taps.',
    icon: 'restaurant',
  },
  {
    id: '2',
    title: 'Fast Delivery',
    description:
      'Get your food delivered at your doorstep within 30-45 minutes or schedule for later.',
    icon: 'bicycle',
  },
  {
    id: '3',
    title: 'Earn Rewards',
    description:
      'Earn FoodieCoins on every order and redeem them for discounts. Get FoodiePass for exclusive benefits!',
    icon: 'gift',
  },
];
