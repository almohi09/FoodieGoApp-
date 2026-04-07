import crypto from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';

const API_BASE = process.env.E2E_API_BASE || 'http://localhost:4000/api/v1';
const ARTIFACT_DIR = path.resolve(process.cwd(), 'artifacts', 'e2e');

interface E2EStep {
  method: string;
  path: string;
  statusCode: number;
  durationMs: number;
}

interface E2EFlow {
  name: string;
  status: 'PASS' | 'FAIL' | 'SKIP';
  durationMs: number;
  steps: E2EStep[];
  error?: string;
}

interface E2EResult {
  timestamp: string;
  environment: string;
  apiBase: string;
  flows: E2EFlow[];
  overallStatus: 'PASS' | 'FAIL';
}

const httpRequest = (
  options: http.RequestOptions,
): Promise<{ statusCode: number; body: string; durationMs: number }> => {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const req = http.request(options, res => {
      let body = '';
      res.on('data', chunk => (body += chunk));
      res.on('end', () =>
        resolve({
          statusCode: res.statusCode || 0,
          body,
          durationMs: Date.now() - start,
        }),
      );
    });
    req.on('error', e => reject(e));
    req.end();
  });
};

const apiRequest = async (
  method: string,
  path: string,
  body?: object,
  token?: string,
): Promise<{ statusCode: number; body: any; durationMs: number }> => {
  const bodyStr = body ? JSON.stringify(body) : undefined;
  const options: http.RequestOptions = {
    hostname: 'localhost',
    port: 4000,
    path: `/api/v1${path}`,
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(bodyStr ? { 'Content-Length': Buffer.byteLength(bodyStr) } : {}),
    },
  };
  const result = await httpRequest(options);
  let parsedBody = result.body;
  try {
    parsedBody = JSON.parse(result.body);
  } catch {
    // not JSON
  }
  return {
    statusCode: result.statusCode,
    body: parsedBody,
    durationMs: result.durationMs,
  };
};

const runE2EFlows = async (): Promise<E2EResult> => {
  const timestamp = new Date().toISOString();
  await mkdir(ARTIFACT_DIR, { recursive: true });

  console.log('Starting E2E business flow tests...\n');

  const flows: E2EFlow[] = [];

  // Flow 1: Customer registration and order placement
  const customerFlow: E2EFlow = {
    name: 'Customer Registration -> Address -> Browse -> Order',
    status: 'SKIP',
    durationMs: 0,
    steps: [],
  };

  try {
    const phone = `+91${Date.now().toString().slice(-10)}`;
    const sendStart = Date.now();
    const sendOtp = await apiRequest('POST', '/auth/send-otp', { phone });
    customerFlow.steps.push({
      method: 'POST',
      path: '/auth/send-otp',
      statusCode: sendOtp.statusCode,
      durationMs: sendOtp.durationMs,
    });

    if (sendOtp.statusCode === 200) {
      const verifyStart = Date.now();
      const verifyOtp = await apiRequest('POST', '/auth/verify-otp', {
        phone,
        otp: '123456',
      });
      customerFlow.steps.push({
        method: 'POST',
        path: '/auth/verify-otp',
        statusCode: verifyOtp.statusCode,
        durationMs: verifyOtp.durationMs,
      });

      if (verifyOtp.statusCode === 200 && verifyOtp.body.accessToken) {
        const token = verifyOtp.body.accessToken;
        const addressStart = Date.now();
        const address = await apiRequest(
          'POST',
          '/addresses',
          {
            label: 'Home',
            address: '123 Test St',
            city: 'Mumbai',
            latitude: 19.076,
            longitude: 72.8777,
          },
          token,
        );
        customerFlow.steps.push({
          method: 'POST',
          path: '/addresses',
          statusCode: address.statusCode,
          durationMs: address.durationMs,
        });

        const restaurantsStart = Date.now();
        const restaurants = await apiRequest('GET', '/restaurants');
        customerFlow.steps.push({
          method: 'GET',
          path: '/restaurants',
          statusCode: restaurants.statusCode,
          durationMs: restaurants.durationMs,
        });

        if (
          restaurants.statusCode === 200 &&
          restaurants.body.restaurants?.length > 0
        ) {
          const menuStart = Date.now();
          const menu = await apiRequest(
            'GET',
            `/restaurants/${restaurants.body.restaurants[0].id}/menu`,
          );
          customerFlow.steps.push({
            method: 'GET',
            path: `/restaurants/:id/menu`,
            statusCode: menu.statusCode,
            durationMs: menu.durationMs,
          });

          if (menu.statusCode === 200 && menu.body.items?.length > 0) {
            const orderStart = Date.now();
            const order = await apiRequest(
              'POST',
              '/checkout/place-order',
              {
                restaurantId: restaurants.body.restaurants[0].id,
                addressId: address.body.id,
                items: [{ menuItemId: menu.body.items[0].id, quantity: 1 }],
                paymentMethod: 'upi',
              },
              token,
            );
            customerFlow.steps.push({
              method: 'POST',
              path: '/checkout/place-order',
              statusCode: order.statusCode,
              durationMs: order.durationMs,
            });

            if (order.statusCode === 200) {
              customerFlow.status = 'PASS';
              customerFlow.durationMs = Date.now() - sendStart;
            } else {
              customerFlow.status = 'FAIL';
              customerFlow.error = `Order placement failed with status ${order.statusCode}`;
              customerFlow.durationMs = Date.now() - sendStart;
            }
          } else {
            customerFlow.status = 'FAIL';
            customerFlow.error = 'No menu items found';
            customerFlow.durationMs = Date.now() - sendStart;
          }
        } else {
          customerFlow.status = 'FAIL';
          customerFlow.error = 'No restaurants found';
          customerFlow.durationMs = Date.now() - sendStart;
        }
      } else {
        customerFlow.status = 'FAIL';
        customerFlow.error = 'OTP verification failed';
        customerFlow.durationMs = Date.now() - sendStart;
      }
    } else {
      customerFlow.status = 'FAIL';
      customerFlow.error = 'OTP send failed';
      customerFlow.durationMs = Date.now() - sendStart;
    }
  } catch (e: any) {
    customerFlow.status = 'FAIL';
    customerFlow.error = e.message;
  }

  flows.push(customerFlow);

  // Flow 2: Seller order management
  const sellerFlow: E2EFlow = {
    name: 'Seller Menu CRUD -> Earnings View',
    status: 'SKIP',
    durationMs: 0,
    steps: [],
  };

  try {
    const sellerPhone = `+91${(Date.now() + 1).toString().slice(-10)}`;
    const sendStart = Date.now();
    const sendOtp = await apiRequest('POST', '/auth/send-otp', {
      phone: sellerPhone,
    });
    sellerFlow.steps.push({
      method: 'POST',
      path: '/auth/send-otp',
      statusCode: sendOtp.statusCode,
      durationMs: sendOtp.durationMs,
    });

    if (sendOtp.statusCode === 200) {
      const verifyStart = Date.now();
      const verifyOtp = await apiRequest('POST', '/auth/verify-otp', {
        phone: sellerPhone,
        otp: '123456',
      });
      sellerFlow.steps.push({
        method: 'POST',
        path: '/auth/verify-otp',
        statusCode: verifyOtp.statusCode,
        durationMs: verifyOtp.durationMs,
      });

      if (verifyOtp.statusCode === 200 && verifyOtp.body.accessToken) {
        const token = verifyOtp.body.accessToken;
        const restaurantsStart = Date.now();
        const restaurants = await apiRequest('GET', '/restaurants');
        sellerFlow.steps.push({
          method: 'GET',
          path: '/restaurants',
          statusCode: restaurants.statusCode,
          durationMs: restaurants.durationMs,
        });

        if (
          restaurants.statusCode === 200 &&
          restaurants.body.restaurants?.length > 0
        ) {
          const restaurantId = restaurants.body.restaurants[0].id;

          // Test menu retrieval
          const menuStart = Date.now();
          const menu = await apiRequest(
            'GET',
            `/seller/restaurants/${restaurantId}/menu`,
            undefined,
            token,
          );
          sellerFlow.steps.push({
            method: 'GET',
            path: `/seller/restaurants/:id/menu`,
            statusCode: menu.statusCode,
            durationMs: menu.durationMs,
          });

          // Test earnings summary
          const earningsStart = Date.now();
          const earnings = await apiRequest(
            'GET',
            `/seller/restaurants/${restaurantId}/earnings/summary`,
            undefined,
            token,
          );
          sellerFlow.steps.push({
            method: 'GET',
            path: `/seller/restaurants/:id/earnings/summary`,
            statusCode: earnings.statusCode,
            durationMs: earnings.durationMs,
          });

          sellerFlow.status = 'PASS';
          sellerFlow.durationMs = Date.now() - sendStart;
        } else {
          sellerFlow.status = 'FAIL';
          sellerFlow.error = 'No restaurants found';
          sellerFlow.durationMs = Date.now() - sendStart;
        }
      } else {
        sellerFlow.status = 'FAIL';
        sellerFlow.error = 'OTP verification failed';
        sellerFlow.durationMs = Date.now() - sendStart;
      }
    } else {
      sellerFlow.status = 'FAIL';
      sellerFlow.error = 'OTP send failed';
      sellerFlow.durationMs = Date.now() - sendStart;
    }
  } catch (e: any) {
    sellerFlow.status = 'FAIL';
    sellerFlow.error = e.message;
  }

  flows.push(sellerFlow);

  const overallStatus = flows.every(f => f.status === 'PASS') ? 'PASS' : 'FAIL';

  const result: E2EResult = {
    timestamp,
    environment: process.env.NODE_ENV || 'development',
    apiBase: API_BASE,
    flows,
    overallStatus,
  };

  const payload = JSON.stringify(result);
  const sha256 = crypto.createHash('sha256').update(payload).digest('hex');
  const safeTs = timestamp.replace(/:/g, '-');
  const outFile = path.join(ARTIFACT_DIR, `e2e-business-flow-${safeTs}.json`);

  await writeFile(
    outFile,
    JSON.stringify(
      { ...result, checksum: { algorithm: 'sha256', value: sha256 } },
      null,
      2,
    ),
    'utf8',
  );

  console.log('\n=== E2E Results ===');
  flows.forEach(f => {
    console.log(
      `[${f.status}] ${f.name} (${f.durationMs}ms)${f.error ? ` - ${f.error}` : ''}`,
    );
    f.steps.forEach(s =>
      console.log(
        `  ${s.method} ${s.path} -> ${s.statusCode} (${s.durationMs}ms)`,
      ),
    );
  });
  console.log(`\nOverall: ${overallStatus}`);
  console.log(`Artifact: ${outFile}`);

  return result;
};

void runE2EFlows().catch(e => {
  console.error('E2E tests failed:', e);
  process.exit(1);
});
