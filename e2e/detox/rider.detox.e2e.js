/* eslint-env jest */
/* global device, expect, element, by, waitFor */

describe('FoodieGo Rider Login Flow', () => {
  beforeAll(async () => {
    await device.launchApp({ delete: true });
  });

  it('rider can navigate to rider login from login options', async () => {
    await waitFor(element(by.id('onboarding-skip-button')))
      .toBeVisible()
      .withTimeout(10000);
    await element(by.id('onboarding-skip-button')).tap();

    await waitFor(element(by.id('login-continue-guest')))
      .toBeVisible()
      .withTimeout(10000);

    await element(by.id('login-options-rider-button')).tap();

    await expect(element(by.id('rider-login-screen'))).toBeVisible();
  });

  it('rider login screen renders correctly', async () => {
    await expect(element(by.text('Rider Login'))).toBeVisible();
    await expect(
      element(by.text('Enter your phone number to continue')),
    ).toBeVisible();
    await expect(element(by.id('rider-login-get-otp-button'))).toBeVisible();
  });

  it('rider can go back to customer login', async () => {
    await element(by.text('Are you a customer? Login here')).tap();

    await expect(element(by.id('login-options-screen'))).toBeVisible();
  });

  it('rider login validates phone input', async () => {
    await element(by.id('login-options-rider-button')).tap();

    await waitFor(element(by.id('rider-login-screen')))
      .toBeVisible()
      .withTimeout(10000);

    await element(by.id('rider-login-get-otp-button')).tap();

    await expect(
      element(by.text('Please enter a valid phone number')),
    ).toBeVisible();
  });
});

describe('FoodieGo Rider Dashboard Flow', () => {
  beforeAll(async () => {
    await device.launchApp({ delete: true });
  });

  it('rider dashboard renders with all sections', async () => {
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

    await waitFor(element(by.text('Rider Dashboard')))
      .toBeVisible()
      .withTimeout(10000);
    await element(by.text('Rider Dashboard')).tap();

    await waitFor(element(by.id('rider-dashboard-screen')))
      .toBeVisible()
      .withTimeout(15000);

    await expect(element(by.id('rider-dashboard-screen'))).toBeVisible();
  });

  it('rider dashboard has online toggle', async () => {
    await waitFor(element(by.id('rider-dashboard-screen')))
      .toBeVisible()
      .withTimeout(15000);

    await waitFor(element(by.id('rider-online-toggle')))
      .toBeVisible()
      .withTimeout(10000);
    await expect(element(by.id('rider-online-toggle'))).toBeVisible();
  });

  it('rider can navigate to earnings', async () => {
    await waitFor(element(by.id('rider-dashboard-screen')))
      .toBeVisible()
      .withTimeout(15000);

    await element(by.text('Earnings')).tap();

    await expect(element(by.id('rider-earnings-screen'))).toBeVisible();
  });

  it('rider can navigate to history', async () => {
    await element(by.id('rider-dashboard-screen')).tap();

    await waitFor(element(by.id('rider-dashboard-screen')))
      .toBeVisible()
      .withTimeout(15000);

    await element(by.text('History')).tap();

    await expect(element(by.id('rider-history-screen'))).toBeVisible();
  });
});
