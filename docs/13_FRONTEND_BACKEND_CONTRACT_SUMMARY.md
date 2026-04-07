# Backend API Contract Summary

Date: April 7, 2026

This document maps frontend API service calls to backend endpoints for quick reference.

---

## Auth Endpoints

| Frontend Method                   | Backend Endpoint                        | Status         |
| --------------------------------- | --------------------------------------- | -------------- |
| `authService.sendOTP()`           | `POST /api/v1/auth/send-otp`            | ✅ Implemented |
| `authService.resendOTP()`         | `POST /api/v1/auth/resend-otp`          | ✅ Implemented |
| `authService.verifyOTP()`         | `POST /api/v1/auth/verify-otp`          | ✅ Implemented |
| `authService.registerUser()`      | `POST /api/v1/auth/register`            | ✅ Implemented |
| `authService.loginUser()`         | `POST /api/v1/auth/login`               | ✅ Implemented |
| `authService.loginSeller()`       | `POST /api/v1/auth/login` (role=seller) | ✅ Implemented |
| `authService.loginAdmin()`        | `POST /api/v1/auth/login` (role=admin)  | ✅ Implemented |
| `authService.getCurrentUser()`    | `GET /api/v1/auth/me`                   | ✅ Implemented |
| `authService.updateProfile()`     | `PUT /api/v1/auth/profile`              | ✅ Implemented |
| `authService.getAddresses()`      | `GET /api/v1/addresses`                 | ✅ Implemented |
| `authService.addAddress()`        | `POST /api/v1/addresses`                | ✅ Implemented |
| `authService.deleteAddress()`     | `DELETE /api/v1/addresses/:id`          | ✅ Implemented |
| `authService.setDefaultAddress()` | `PUT /api/v1/addresses/:id/default`     | ✅ Implemented |
| `authService.isPhoneRegistered()` | `POST /api/v1/auth/check-phone`         | ✅ Implemented |

---

## Restaurant/Catalog Endpoints

| Frontend Method                              | Backend Endpoint                                  | Status         |
| -------------------------------------------- | ------------------------------------------------- | -------------- |
| `restaurantService.getRestaurants()`         | `GET /api/v1/restaurants`                         | ✅ Implemented |
| `restaurantService.getFeaturedRestaurants()` | `GET /api/v1/restaurants/featured`                | ✅ Implemented |
| `restaurantService.searchRestaurants()`      | `GET /api/v1/restaurants/search`                  | ✅ Implemented |
| `restaurantService.getNearbyRestaurants()`   | `GET /api/v1/restaurants/nearby`                  | ✅ Implemented |
| `restaurantService.getRestaurantById()`      | `GET /api/v1/restaurants/:id`                     | ✅ Implemented |
| `restaurantService.getMenu()`                | `GET /api/v1/restaurants/:id/menu`                | ✅ Implemented |
| `restaurantService.checkRestaurantStatus()`  | `GET /api/v1/restaurants/:id/status`              | ✅ Implemented |
| `checkoutService.getDeliveryInfo()`          | `GET /api/v1/restaurants/:id/delivery-info`       | ✅ Implemented |
| `checkoutService.checkRestaurantHours()`     | `GET /api/v1/restaurants/:id/hours`               | ✅ Implemented |
| `checkoutService.checkItemAvailability()`    | `POST /api/v1/restaurants/:id/check-availability` | ✅ Implemented |

---

## Checkout Endpoints

| Frontend Method                         | Backend Endpoint                       | Status         |
| --------------------------------------- | -------------------------------------- | -------------- |
| `checkoutService.getPriceQuote()`       | `POST /api/v1/checkout/quote`          | ✅ Implemented |
| `checkoutService.applyCoupon()`         | `POST /api/v1/checkout/apply-coupon`   | ✅ Implemented |
| `checkoutService.removeCoupon()`        | `POST /api/v1/checkout/remove-coupon`  | ✅ Implemented |
| `checkoutService.validateFoodieCoins()` | `POST /api/v1/checkout/validate-coins` | ✅ Implemented |
| `checkoutService.getAvailableCoupons()` | `GET /api/v1/coupons/available`        | ✅ Implemented |
| `checkoutService.placeOrder()`          | `POST /api/v1/checkout/place-order`    | ✅ Implemented |
| `orderService.createOrder()`            | `POST /api/v1/orders`                  | ✅ Implemented |

---

## Order Endpoints

| Frontend Method                                  | Backend Endpoint                                  | Status         |
| ------------------------------------------------ | ------------------------------------------------- | -------------- |
| `orderService.getOrders()`                       | `GET /api/v1/orders`                              | ✅ Implemented |
| `orderService.getOrderById()`                    | `GET /api/v1/orders/:id`                          | ✅ Implemented |
| `orderService.getActiveOrders()`                 | `GET /api/v1/orders/active`                       | ✅ Implemented |
| `orderService.cancelOrder()`                     | `POST /api/v1/orders/:id/cancel`                  | ✅ Implemented |
| `orderService.reorder()`                         | `POST /api/v1/orders/:id/reorder`                 | ✅ Implemented |
| `orderService.getOrderStatus()`                  | `GET /api/v1/orders/:id/status`                   | ✅ Implemented |
| `orderService.getOrderTracking()`                | `GET /api/v1/orders/:id/tracking`                 | ✅ Implemented |
| `orderService.rateOrder()`                       | `POST /api/v1/orders/:id/rate`                    | ✅ Implemented |
| `trackingService.subscribeToPushNotifications()` | `POST /api/v1/orders/:id/subscribe-notifications` | ✅ Implemented |

---

## Payment Endpoints

| Frontend Method                            | Backend Endpoint                           | Status         |
| ------------------------------------------ | ------------------------------------------ | -------------- |
| `paymentService.initiateUPIPayment()`      | `POST /api/v1/payments/upi/initiate`       | ✅ Implemented |
| `paymentService.verifyUPIPayment()`        | `GET /api/v1/payments/upi/verify/:id`      | ✅ Implemented |
| `paymentService.initiateCardPayment()`     | `POST /api/v1/payments/card/initiate`      | ✅ Implemented |
| `paymentService.verifyCardPayment()`       | `GET /api/v1/payments/card/verify/:id`     | ✅ Implemented |
| `paymentService.confirmCODOrder()`         | `POST /api/v1/payments/cod/confirm/:id`    | ✅ Implemented |
| `paymentService.getPaymentStatus()`        | `GET /api/v1/payments/status/:orderId`     | ✅ Implemented |
| `paymentService.getSavedPaymentMethods()`  | `GET /api/v1/payments/methods`             | ✅ Implemented |
| `paymentService.addSavedUPIMethod()`       | `POST /api/v1/payments/methods/upi`        | ✅ Implemented |
| `paymentService.addSavedCardMethod()`      | `POST /api/v1/payments/methods/card`       | ✅ Implemented |
| `paymentService.removePaymentMethod()`     | `DELETE /api/v1/payments/methods/:id`      | ✅ Implemented |
| `paymentService.setDefaultPaymentMethod()` | `PUT /api/v1/payments/methods/:id/default` | ✅ Implemented |
| `paymentService.refundPayment()`           | `POST /api/v1/payments/refund/:orderId`    | ✅ Implemented |
| `paymentService.getRefundStatus()`         | `GET /api/v1/payments/refund/:id/status`   | ✅ Implemented |

---

## Seller Endpoints

| Frontend Method                                  | Backend Endpoint                                             | Status            |
| ------------------------------------------------ | ------------------------------------------------------------ | ----------------- |
| `sellerRestaurantService.getOperationalStatus()` | `GET /api/v1/seller/restaurants/:id/operational-status`      | ✅ Implemented    |
| `sellerRestaurantService.setOperationalStatus()` | `PATCH /api/v1/seller/restaurants/:id/operational-status`    | ✅ Implemented    |
| `sellerOrderService.getOrders()`                 | `GET /api/v1/seller/restaurants/:id/orders`                  | ✅ Implemented    |
| `sellerOrderService.getOrderStats()`             | `GET /api/v1/seller/restaurants/:id/orders/stats`            | ✅ Implemented    |
| `sellerOrderService.getPendingOrders()`          | `GET /api/v1/seller/restaurants/:id/orders/pending`          | ✅ Implemented    |
| `sellerOrderService.acceptOrder()`               | `POST /api/v1/seller/restaurants/:id/orders/:id/accept`      | ✅ Implemented    |
| `sellerOrderService.rejectOrder()`               | `POST /api/v1/seller/restaurants/:id/orders/:id/reject`      | ✅ Implemented    |
| `sellerOrderService.startPreparing()`            | `POST /api/v1/seller/restaurants/:id/orders/:id/start-prep`  | ✅ Implemented    |
| `sellerOrderService.markReady()`                 | `POST /api/v1/seller/restaurants/:id/orders/:id/ready`       | ✅ Implemented    |
| `sellerMenuService.getMenu()`                    | `GET /api/v1/seller/restaurants/:id/menu`                    | ✅ Implemented    |
| `sellerMenuService.createMenuItem()`             | `POST /api/v1/seller/restaurants/:id/menu`                   | ❌ NOT in backend |
| `sellerMenuService.updateMenuItem()`             | `PUT /api/v1/seller/restaurants/:id/menu/:itemId`            | ❌ NOT in backend |
| `sellerMenuService.deleteMenuItem()`             | `DELETE /api/v1/seller/restaurants/:id/menu/:itemId`         | ❌ NOT in backend |
| `sellerMenuService.toggleItemAvailability()`     | `PATCH /api/v1/seller/restaurants/:id/menu/:id/availability` | ✅ Implemented    |
| `sellerMenuService.updateItemStock()`            | `PATCH /api/v1/seller/restaurants/:id/menu/:id/stock`        | ✅ Implemented    |
| `sellerMenuService.getLowStockItems()`           | `GET /api/v1/seller/restaurants/:id/low-stock`               | ✅ Implemented    |
| `sellerEarningsService.getEarningsSummary()`     | `GET /api/v1/seller/restaurants/:id/earnings/summary`        | ✅ Implemented    |
| `sellerEarningsService.getEarningsChart()`       | `GET /api/v1/seller/restaurants/:id/earnings/chart`          | ❌ NOT in backend |
| `sellerEarningsService.getTransactions()`        | `GET /api/v1/seller/restaurants/:id/earnings/transactions`   | ❌ NOT in backend |
| `sellerEarningsService.getPayouts()`             | `GET /api/v1/seller/restaurants/:id/payouts`                 | ❌ NOT in backend |
| `sellerEarningsService.getBankDetails()`         | `GET /api/v1/seller/restaurants/:id/bank-details`            | ❌ NOT in backend |
| `sellerEarningsService.updateBankDetails()`      | `PUT /api/v1/seller/restaurants/:id/bank-details`            | ❌ NOT in backend |
| `sellerEarningsService.getCommissionBreakdown()` | `GET /api/v1/seller/restaurants/:id/commission`              | ❌ NOT in backend |
| `sellerEarningsService.downloadInvoice()`        | `GET /api/v1/seller/restaurants/:id/invoice`                 | ❌ NOT in backend |

---

## Admin Endpoints

| Frontend Method                             | Backend Endpoint                                | Status            |
| ------------------------------------------- | ----------------------------------------------- | ----------------- |
| `adminDashboardService.getDashboardStats()` | `GET /api/v1/admin/dashboard/stats`             | ✅ Implemented    |
| `adminDashboardService.getOrderMetrics()`   | `GET /api/v1/admin/dashboard/order-metrics`     | ❌ NOT in backend |
| `adminDashboardService.getSLAMetrics()`     | `GET /api/v1/admin/dashboard/sla-metrics`       | ❌ NOT in backend |
| `adminDashboardService.getRevenueChart()`   | `GET /api/v1/admin/dashboard/revenue-chart`     | ❌ NOT in backend |
| `adminDashboardService.getAlerts()`         | `GET /api/v1/admin/alerts`                      | ✅ Implemented    |
| `adminUserService.getUsers()`               | `GET /api/v1/admin/users`                       | ✅ Implemented    |
| `adminUserService.suspendUser()`            | `POST /api/v1/admin/users/:id/suspend`          | ✅ Implemented    |
| `adminUserService.reactivateUser()`         | `POST /api/v1/admin/users/:id/reactivate`       | ✅ Implemented    |
| `adminUserService.getSellers()`             | `GET /api/v1/admin/sellers`                     | ✅ Implemented    |
| `adminUserService.suspendSeller()`          | `POST /api/v1/admin/sellers/:id/suspend`        | ✅ Implemented    |
| `adminUserService.reactivateSeller()`       | `POST /api/v1/admin/sellers/:id/reactivate`     | ✅ Implemented    |
| `adminModerationService.getReportedItems()` | `GET /api/v1/admin/reports`                     | ✅ Implemented    |
| `adminModerationService.getApprovalQueue()` | `GET /api/v1/admin/approvals`                   | ❌ NOT in backend |
| `adminPayoutService.getPayoutSummary()`     | `GET /api/v1/admin/payouts/summary`             | ✅ Implemented    |
| `adminPayoutService.getPayoutQueue()`       | `GET /api/v1/admin/payouts`                     | ✅ Implemented    |
| `adminPayoutService.markProcessing()`       | `POST /api/v1/admin/payouts/:id/processing`     | ✅ Implemented    |
| `adminPayoutService.markPaid()`             | `POST /api/v1/admin/payouts/:id/paid`           | ✅ Implemented    |
| `adminPayoutService.holdPayout()`           | `POST /api/v1/admin/payouts/:id/hold`           | ✅ Implemented    |
| `adminAuditService.recordEvent()`           | `POST /api/v1/admin/audit-logs`                 | ✅ Implemented    |
| `adminAuditService.getRecentLogs()`         | `GET /api/v1/admin/audit-logs`                  | ✅ Implemented    |
| `dispatchService.getDispatchBoard()`        | `GET /api/v1/admin/dispatch/board`              | ✅ Implemented    |
| `dispatchService.assignRider()`             | `POST /api/v1/admin/dispatch/orders/:id/assign` | ✅ Implemented    |
| `dispatchService.updateStatus()`            | `POST /api/v1/admin/dispatch/orders/:id/status` | ✅ Implemented    |

---

## Integration Gaps Summary

### Critical (Affects Core Flow)

- None - all critical paths are implemented

### High Priority (Affects Seller/Admin Experience)

- Seller menu CRUD (create/update/delete menu items)
- Seller earnings chart and transactions
- Seller bank details management
- Seller commission breakdown
- Admin order metrics and SLA metrics
- Admin approval queue

### Low Priority (Nice to Have)

- Seller invoice generation
- Admin revenue chart
- Admin reports (delivery delays, prep time breaches)

---

## Last Updated

April 7, 2026 - Initial contract summary created
