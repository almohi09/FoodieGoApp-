import "dotenv/config";

type JsonObject = Record<string, any>;

const baseUrl = (process.env.DEPLOY_VERIFY_BASE_URL || "http://localhost:4000/api/v1").replace(/\/+$/, "");
const verifyOtp = process.env.DEPLOY_VERIFY_OTP || "123456";
const phone = process.env.DEPLOY_VERIFY_PHONE || `+919${Date.now().toString().slice(-9)}`;

const ensure = (condition: boolean, message: string) => {
  if (!condition) {
    throw new Error(message);
  }
};

const requestJson = async (
  method: string,
  path: string,
  options?: { token?: string; body?: JsonObject; headers?: Record<string, string> },
) => {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(options?.token ? { Authorization: `Bearer ${options.token}` } : {}),
      ...(options?.headers || {}),
    },
    body: options?.body ? JSON.stringify(options.body) : undefined,
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : {};
  return { status: response.status, data };
};

const run = async () => {
  const health = await requestJson("GET", "/health");
  ensure(health.status === 200, `Health check failed: ${health.status}`);

  const metrics = await requestJson("GET", "/metrics");
  ensure(metrics.status === 200, `Metrics check failed: ${metrics.status}`);

  const sendOtp = await requestJson("POST", "/auth/send-otp", { body: { phone } });
  ensure(sendOtp.status === 200, `send-otp failed: ${sendOtp.status}`);

  const verify = await requestJson("POST", "/auth/verify-otp", { body: { phone, otp: verifyOtp } });
  ensure(verify.status === 200, `verify-otp failed: ${verify.status}`);
  const token = verify.data?.token as string;
  ensure(Boolean(token), "verify-otp did not return token");

  const me = await requestJson("GET", "/auth/me", { token });
  ensure(me.status === 200, `/auth/me failed: ${me.status}`);

  const address = await requestJson("POST", "/addresses", {
    token,
    body: {
      label: "Home",
      address: "Deployment Verify Street",
      landmark: "Near QA Gate",
      lat: 12.9716,
      lng: 77.5946,
      isDefault: true,
    },
  });
  ensure(address.status === 200, `/addresses failed: ${address.status}`);
  const deliveryAddressId = address.data?.address?.id as string;
  ensure(Boolean(deliveryAddressId), "Address response missing address.id");

  const restaurants = await requestJson("GET", "/restaurants");
  ensure(restaurants.status === 200, `/restaurants failed: ${restaurants.status}`);
  const restaurant = restaurants.data?.restaurants?.[0];
  ensure(Boolean(restaurant?.id), "No restaurant returned by /restaurants");

  const menu = await requestJson("GET", `/restaurants/${restaurant.id}/menu`);
  ensure(menu.status === 200, `/restaurants/:id/menu failed: ${menu.status}`);
  const menuItem = menu.data?.menu?.[0];
  ensure(Boolean(menuItem?.id), "No menu item returned by restaurant menu");

  const orderPayload = {
    restaurantId: restaurant.id,
    deliveryAddressId,
    items: [{ menuItemId: menuItem.id, quantity: 1 }],
    paymentMethod: "upi",
    foodieCoinsUsed: 0,
  };

  const placeOrder = await requestJson("POST", "/checkout/place-order", {
    token,
    body: orderPayload,
    headers: { "Idempotency-Key": `deploy-verify-${Date.now()}` },
  });
  ensure(placeOrder.status === 200, `place-order failed: ${placeOrder.status}`);
  ensure(Boolean(placeOrder.data?.orderId), "place-order did not return orderId");

  const result = {
    baseUrl,
    phone,
    health: health.status,
    metrics: metrics.status,
    auth: { sendOtp: sendOtp.status, verifyOtp: verify.status, me: me.status },
    address: address.status,
    order: { placeOrder: placeOrder.status, orderId: placeOrder.data.orderId },
    pass: true,
  };

  console.log(JSON.stringify(result, null, 2));
};

run().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(JSON.stringify({ pass: false, baseUrl, error: message }, null, 2));
  process.exit(1);
});
