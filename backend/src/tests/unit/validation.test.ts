import assert from "node:assert/strict";
import test from "node:test";
import {
  validatePaymentInitiateInput,
  validatePhoneInput,
  validatePlaceOrderInput,
  validateRefreshTokenInput,
  validateVerifyOtpInput,
} from "../../lib/validation.js";

test("validatePhoneInput trims valid phone", () => {
  const parsed = validatePhoneInput({ phone: "  +919000000001  " });
  assert.equal(parsed.ok, true);
  if (parsed.ok) {
    assert.equal(parsed.data.phone, "+919000000001");
  }
});

test("validateVerifyOtpInput rejects non-6-digit otp", () => {
  const parsed = validateVerifyOtpInput({ phone: "+919000000001", otp: "12345" });
  assert.equal(parsed.ok, false);
  if (!parsed.ok) {
    assert.equal(parsed.message, "OTP must be 6 digits");
  }
});

test("validateRefreshTokenInput rejects invalid format", () => {
  const parsed = validateRefreshTokenInput({ refreshToken: "abc" });
  assert.equal(parsed.ok, false);
  if (!parsed.ok) {
    assert.equal(parsed.message, "Invalid refresh token format");
  }
});

test("validatePlaceOrderInput normalizes payload", () => {
  const parsed = validatePlaceOrderInput({
    restaurantId: "r1",
    deliveryAddressId: "a1",
    paymentMethod: "upi",
    items: [{ menuItemId: "m1", quantity: 2 }],
    foodieCoinsUsed: 10,
  });
  assert.equal(parsed.ok, true);
  if (parsed.ok) {
    assert.equal(parsed.data.paymentMethod, "upi");
    assert.equal(parsed.data.items.length, 1);
    assert.equal(parsed.data.items[0].menuItemId, "m1");
    assert.equal(parsed.data.items[0].quantity, 2);
    assert.equal(parsed.data.foodieCoinsUsed, 10);
  }
});

test("validatePaymentInitiateInput accepts missing amount", () => {
  const parsed = validatePaymentInitiateInput({ orderId: "ord_1" });
  assert.equal(parsed.ok, true);
  if (parsed.ok) {
    assert.equal(parsed.data.orderId, "ord_1");
    assert.equal(parsed.data.amount, undefined);
  }
});

