type Valid<T> = { ok: true; data: T; message?: never; details?: never };
type Invalid = { ok: false; data?: never; message: string; details?: Record<string, unknown> };
type ValidationResult<T> = Valid<T> | Invalid;

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

export const validatePhoneInput = (body: any): ValidationResult<{ phone: string }> => {
  const phone = body?.phone;
  if (!isNonEmptyString(phone)) {
    return { ok: false, message: "Phone is required", details: { field: "phone" } };
  }
  const normalized = phone.trim();
  if (normalized.length < 8 || normalized.length > 16) {
    return { ok: false, message: "Invalid phone format", details: { field: "phone" } };
  }
  return { ok: true, data: { phone: normalized } };
};

export const validateVerifyOtpInput = (body: any): ValidationResult<{ phone: string; otp: string }> => {
  const phoneCheck = validatePhoneInput(body);
  if (!phoneCheck.ok) {
    return { ok: false, message: phoneCheck.message, details: phoneCheck.details };
  }
  const otp = String(body?.otp || "");
  if (!/^\d{6}$/.test(otp)) {
    return { ok: false, message: "OTP must be 6 digits", details: { field: "otp" } };
  }
  return { ok: true, data: { phone: phoneCheck.data.phone, otp } };
};

export const validateRefreshTokenInput = (body: any): ValidationResult<{ refreshToken: string }> => {
  const refreshToken = body?.refreshToken;
  if (!isNonEmptyString(refreshToken)) {
    return { ok: false, message: "Refresh token is required", details: { field: "refreshToken" } };
  }
  if (!String(refreshToken).startsWith("rtk_")) {
    return { ok: false, message: "Invalid refresh token format", details: { field: "refreshToken" } };
  }
  return { ok: true, data: { refreshToken: String(refreshToken) } };
};

export const validatePlaceOrderInput = (
  body: any,
): ValidationResult<{
  restaurantId: string;
  deliveryAddressId: string;
  paymentMethod: string;
  items: Array<{ menuItemId: string; quantity: number; customizations?: string }>;
  foodieCoinsUsed: number;
}> => {
  const restaurantId = String(body?.restaurantId || "").trim();
  const deliveryAddressId = String(body?.deliveryAddressId || "").trim();
  const paymentMethod = String(body?.paymentMethod || "cod").trim();
  const items = Array.isArray(body?.items) ? body.items : [];
  if (!restaurantId) {
    return { ok: false, message: "restaurantId is required", details: { field: "restaurantId" } };
  }
  if (!deliveryAddressId) {
    return { ok: false, message: "deliveryAddressId is required", details: { field: "deliveryAddressId" } };
  }
  if (!items.length) {
    return { ok: false, message: "At least one item is required", details: { field: "items" } };
  }
  const normalizedItems: Array<{ menuItemId: string; quantity: number; customizations?: string }> = [];
  for (let i = 0; i < items.length; i += 1) {
    const raw = items[i];
    const menuItemId = String(raw?.menuItemId || "").trim();
    const quantity = Number(raw?.quantity || 1);
    if (!menuItemId) {
      return { ok: false, message: "menuItemId is required", details: { field: `items[${i}].menuItemId` } };
    }
    if (!Number.isFinite(quantity) || quantity <= 0 || quantity > 20) {
      return { ok: false, message: "quantity must be between 1 and 20", details: { field: `items[${i}].quantity` } };
    }
    normalizedItems.push({
      menuItemId,
      quantity,
      customizations: raw?.customizations,
    });
  }
  return {
    ok: true,
    data: {
      restaurantId,
      deliveryAddressId,
      paymentMethod: paymentMethod || "cod",
      items: normalizedItems,
      foodieCoinsUsed: Number(body?.foodieCoinsUsed || 0),
    },
  };
};

export const validatePaymentInitiateInput = (
  body: any,
): ValidationResult<{
  orderId: string;
  amount?: number;
}> => {
  const orderId = String(body?.orderId || "").trim();
  if (!orderId) {
    return { ok: false, message: "orderId is required", details: { field: "orderId" } };
  }
  const amountRaw = body?.amount;
  if (amountRaw === undefined || amountRaw === null || amountRaw === "") {
    return { ok: true, data: { orderId } };
  }
  const amount = Number(amountRaw);
  if (!Number.isFinite(amount) || amount <= 0) {
    return { ok: false, message: "amount must be a positive number", details: { field: "amount" } };
  }
  return { ok: true, data: { orderId, amount } };
};
