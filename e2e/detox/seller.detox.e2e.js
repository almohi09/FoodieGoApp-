/* eslint-env jest */
/* global device, expect, element, by, waitFor */

describe('FoodieGo Seller E2E Tests', () => {
  beforeAll(async () => {
    await device.launchApp({ delete: true });
  });

  it('seller can navigate to dashboard from login options', async () => {
    await waitFor(element(by.id('onboarding-skip-button')))
      .toBeVisible()
      .withTimeout(10000);
    await element(by.id('onboarding-skip-button')).tap();

    await waitFor(element(by.id('login-continue-guest')))
      .toBeVisible()
      .withTimeout(10000);

    await element(by.id('login-options-seller-button')).tap();

    await expect(element(by.id('seller-login-screen'))).toBeVisible();
  });

  it('seller login flow renders correctly', async () => {
    await waitFor(element(by.id('seller-login-screen')))
      .toBeVisible()
      .withTimeout(10000);

    await expect(element(by.text('Partner Login'))).toBeVisible();
    await expect(element(by.id('seller-login-phone-input'))).toBeVisible();
    await expect(element(by.id('seller-login-continue-button'))).toBeVisible();
  });

  it('seller can navigate to registration', async () => {
    await element(by.text('Register as Partner')).tap();

    await expect(element(by.id('seller-register-screen'))).toBeVisible();
  });
});

describe('FoodieGo Seller Dashboard Flow', () => {
  beforeAll(async () => {
    await device.launchApp({ delete: true });
  });

  it('seller dashboard renders with all sections', async () => {
    await waitFor(element(by.id('onboarding-skip-button')))
      .toBeVisible()
      .withTimeout(10000);
    await element(by.id('onboarding-skip-button')).tap();

    await waitFor(element(by.id('login-continue-guest')))
      .toBeVisible()
      .withTimeout(10000);
    await element(by.id('login-continue-guest')).tap();

    await waitFor(element(by.id('home-screen-root')))
      .toBeVisible()
      .withTimeout(20000);

    await element(by.id('profile-tab')).tap();

    await waitFor(element(by.text('Seller Dashboard')))
      .toBeVisible()
      .withTimeout(10000);
    await element(by.text('Seller Dashboard')).tap();

    await waitFor(element(by.id('seller-dashboard-screen')))
      .toBeVisible()
      .withTimeout(15000);

    await expect(element(by.id('seller-dashboard-screen'))).toBeVisible();
  });

  it('seller can access menu management', async () => {
    await waitFor(element(by.id('seller-dashboard-screen')))
      .toBeVisible()
      .withTimeout(15000);

    await waitFor(element(by.id('seller-menu-management-button')))
      .toBeVisible()
      .withTimeout(10000);
    await element(by.id('seller-menu-management-button')).tap();

    await expect(element(by.id('seller-menu-screen'))).toBeVisible();
  });

  it('menu screen has add item button', async () => {
    await expect(element(by.id('seller-menu-screen'))).toBeVisible();
    await expect(element(by.id('seller-menu-add-item-button'))).toBeVisible();
  });
});
