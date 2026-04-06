/* eslint-env jest */
/* global device, expect, element, by, waitFor */

describe('FoodieGo Detox Smoke (template)', () => {
  beforeAll(async () => {
    await device.launchApp({ delete: true });
  });

  it('navigates onboarding -> home -> restaurant -> cart -> checkout -> tracking', async () => {
    await expect(element(by.id('onboarding-skip-button'))).toBeVisible();
    await element(by.id('onboarding-skip-button')).tap();

    await expect(element(by.id('login-continue-guest'))).toBeVisible();
    await element(by.id('login-continue-guest')).tap();

    await expect(element(by.id('home-screen-root'))).toBeVisible();

    await waitFor(element(by.id('home-featured-restaurant-0')))
      .toBeVisible()
      .withTimeout(20000);
    await element(by.id('home-featured-restaurant-0')).tap();

    await expect(element(by.id('restaurant-detail-screen'))).toBeVisible();
    await waitFor(element(by.id('menu-item-add-m1')))
      .toBeVisible()
      .withTimeout(20000);
    await element(by.id('menu-item-add-m1')).tap();

    await waitFor(element(by.id('restaurant-view-cart-button')))
      .toBeVisible()
      .withTimeout(10000);
    await element(by.id('restaurant-view-cart-button')).tap();

    await expect(element(by.id('cart-screen'))).toBeVisible();
    await element(by.id('cart-proceed-checkout-button')).tap();

    await expect(element(by.id('checkout-screen'))).toBeVisible();
    await waitFor(element(by.id('checkout-simulate-success-button')))
      .toBeVisible()
      .withTimeout(10000);
    await element(by.id('checkout-simulate-success-button')).tap();

    await expect(element(by.id('order-confirmed-screen'))).toBeVisible();
    await element(by.id('order-confirmed-track-order-button')).tap();

    await expect(element(by.id('order-tracking-screen'))).toBeVisible();
  });
});
