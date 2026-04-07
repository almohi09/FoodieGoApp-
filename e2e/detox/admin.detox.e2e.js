/* eslint-env jest */
/* global device, expect, element, by, waitFor */

describe('FoodieGo Admin Login Flow', () => {
  beforeAll(async () => {
    await device.launchApp({ delete: true });
  });

  it('admin can navigate to admin login from login options', async () => {
    await waitFor(element(by.id('onboarding-skip-button')))
      .toBeVisible()
      .withTimeout(10000);
    await element(by.id('onboarding-skip-button')).tap();

    await waitFor(element(by.id('login-continue-guest')))
      .toBeVisible()
      .withTimeout(10000);

    await element(by.id('login-options-admin-button')).tap();

    await expect(element(by.id('admin-login-screen'))).toBeVisible();
  });

  it('admin login screen renders correctly', async () => {
    await expect(element(by.text('Admin Portal'))).toBeVisible();
    await expect(element(by.id('admin-login-email-input'))).toBeVisible();
    await expect(element(by.id('admin-login-password-input'))).toBeVisible();
    await expect(element(by.id('admin-login-submit-button'))).toBeVisible();
  });

  it('admin login validates empty fields', async () => {
    await element(by.id('admin-login-submit-button')).tap();

    await expect(element(by.text('Email is required'))).toBeVisible();
  });

  it('admin can go back to customer login', async () => {
    await element(by.text('Back to Customer Login')).tap();

    await expect(element(by.id('login-options-screen'))).toBeVisible();
  });
});

describe('FoodieGo Admin Dashboard Flow', () => {
  beforeAll(async () => {
    await device.launchApp({ delete: true });
  });

  it('admin dashboard renders with all sections', async () => {
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

    await waitFor(element(by.text('Admin Dashboard')))
      .toBeVisible()
      .withTimeout(10000);
    await element(by.text('Admin Dashboard')).tap();

    await waitFor(element(by.id('admin-dashboard-screen')))
      .toBeVisible()
      .withTimeout(15000);

    await expect(element(by.id('admin-dashboard-screen'))).toBeVisible();
  });

  it('admin dashboard has moderation buttons', async () => {
    await waitFor(element(by.id('admin-dashboard-screen')))
      .toBeVisible()
      .withTimeout(15000);

    await expect(element(by.id('admin-moderation-button'))).toBeVisible();
    await expect(element(by.text('Reports & Approvals'))).toBeVisible();
  });

  it('admin can navigate to moderation screen', async () => {
    await waitFor(element(by.id('admin-moderation-button')))
      .toBeVisible()
      .withTimeout(10000);
    await element(by.id('admin-moderation-button')).tap();

    await expect(element(by.id('admin-moderation-screen'))).toBeVisible();
  });

  it('moderation screen has tabs for reports and approvals', async () => {
    await expect(element(by.text('Reports'))).toBeVisible();
    await expect(element(by.text('Approvals'))).toBeVisible();
  });

  it('admin can navigate to error center', async () => {
    await waitFor(element(by.id('admin-error-center-button')))
      .toBeVisible()
      .withTimeout(10000);
    await element(by.id('admin-error-center-button')).tap();

    await expect(element(by.id('error-center-screen'))).toBeVisible();
  });
});

describe('FoodieGo Admin Dispatch Flow', () => {
  beforeAll(async () => {
    await device.launchApp({ delete: true });
  });

  it('admin dashboard has dispatch queue section', async () => {
    await waitFor(element(by.id('admin-dashboard-screen')))
      .toBeVisible()
      .withTimeout(15000);

    await expect(element(by.text('Dispatch Queue'))).toBeVisible();
  });
});

describe('FoodieGo Admin User Controls', () => {
  beforeAll(async () => {
    await device.launchApp({ delete: true });
  });

  it('admin dashboard has user controls section', async () => {
    await waitFor(element(by.id('admin-dashboard-screen')))
      .toBeVisible()
      .withTimeout(15000);

    await expect(element(by.text('User Controls'))).toBeVisible();
    await expect(element(by.text('Seller Controls'))).toBeVisible();
  });

  it('admin dashboard has payout monitoring section', async () => {
    await waitFor(element(by.id('admin-dashboard-screen')))
      .toBeVisible()
      .withTimeout(15000);

    await expect(element(by.text('Payout Monitoring'))).toBeVisible();
  });

  it('admin dashboard has audit logs section', async () => {
    await waitFor(element(by.id('admin-dashboard-screen')))
      .toBeVisible()
      .withTimeout(15000);

    await expect(element(by.text('Security Audit Logs'))).toBeVisible();
  });
});
