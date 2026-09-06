import assert from 'node:assert/strict';
import {
  getApplicablePrice,
  pricewithDiscount,
  isFiveWeekDeliveryCategory,
  DisplayPriceInCurrency,
  createStorageAdapter,
  createApiClient,
  coreReducers,
  setUserDetails,
  buildProductSearchParams,
  sortCategoriesByName,
  login,
  register,
  endpoints,
  addItemToGuestCart,
  updateGuestCartItemQty,
  removeGuestCartItem,
  mergeGuestCartToServer,
  fetchServerCart,
  addToServerCart,
  updateServerCartItemQty,
  removeServerCartItem,
  checkWishlistStatus,
  toggleWishlistOnServer,
  toggleWishlistGuest,
  checkCompareStatus,
  toggleCompareOnServer,
  toggleCompareGuest,
  computeCheckoutTotals,
  buildOrderItems,
  applyGiftCard,
  submitBankTransferOrder,
  submitGatewayOrder,
  buildShippingItems,
  calculateShipping,
  sortShippingMethods,
  reconcileSelectedShippingMethod,
  buildAddressPayload,
  createAddress,
  fetchAddresses,
  pickDefaultAddress,
  verifyEmailWithCode,
} from './dist/index.js';
import { configureStore } from '@reduxjs/toolkit';

// ── pricing ──────────────────────────────────────────────────────────────
const inStock = getApplicablePrice({
  btcPrice: 5000,
  warehouseStock: { onlineStock: 3 },
});
assert.equal(inStock.key, 'regular');
assert.equal(inStock.price, 5000);

const outOfStockMachine = getApplicablePrice({
  productType: 'MACHINE',
  warehouseStock: { onlineStock: 0 },
  price5weeksDelivery: 45000,
});
assert.equal(outOfStockMachine.key, '5weeks');
assert.equal(outOfStockMachine.price, 45000);

assert.equal(isFiveWeekDeliveryCategory('MACHINE'), true);
assert.equal(isFiveWeekDeliveryCategory('COFFEE'), false);

// Both call conventions must work — client/mobile pass a category object
// (or array of one), admin passes a plain slug string. A regression here
// would silently reintroduce the exact Tassimo bug PRODUCT_VISIBILITY_RULES.md
// documents: a machine mis-tagged productType "COFFEE" whose category
// signal got dropped because the shape wasn't recognized.
assert.equal(isFiveWeekDeliveryCategory('COFFEE', 'coffee-maker'), true); // admin's plain-string call
assert.equal(
  isFiveWeekDeliveryCategory('COFFEE', { slug: 'coffee-maker' }),
  true,
); // client/mobile's object call
assert.equal(
  isFiveWeekDeliveryCategory('COFFEE', [{ slug: 'capsule-machine' }]),
  true,
); // client/mobile's array-of-objects call
assert.equal(isFiveWeekDeliveryCategory('COFFEE', 'some-other-category'), false);
assert.equal(isFiveWeekDeliveryCategory('COFFEE', null), false);

assert.equal(pricewithDiscount(1000, 10), 900);

assert.equal(DisplayPriceInCurrency(1500, 'NGN').includes('1,500'), true);

// ── storage adapter contract ────────────────────────────────────────────
const mem = new Map();
const storage = createStorageAdapter({
  getItem: (k) => mem.get(k) ?? null,
  setItem: (k, v) => mem.set(k, v),
  removeItem: (k) => mem.delete(k),
});
await storage.setItem('accesstoken', 'abc123');
assert.equal(await storage.getItem('accesstoken'), 'abc123');

// ── api client factory (construction + header injection, no live network) ──
const client = createApiClient({
  baseURL: 'https://api.example.test',
  tokenStorage: storage,
  getExtraHeaders: async () => ({ 'X-App-Country': 'NG' }),
});
assert.equal(typeof client.get, 'function');
assert.equal(client.defaults.baseURL, 'https://api.example.test');

// ── redux slices wire into a real store ─────────────────────────────────
const store = configureStore({ reducer: coreReducers });
store.dispatch(
  setUserDetails({ _id: 'u1', name: 'Test User', email: 't@example.com' }),
);
assert.equal(store.getState().user.name, 'Test User');

// ── catalog: filter-state → search-request transformation ──────────────
const params = buildProductSearchParams(
  { brand: ['acme'], category: 'coffee', roastLevel: [], sort: 'newest' },
  { search: 'espresso', page: 2 },
);
assert.equal(params.brand[0], 'acme');
assert.equal(params.category, 'coffee');
assert.equal(params.roastLevel, undefined); // empty array -> undefined
assert.equal(params.sort, ''); // "newest" normalizes to ""
assert.equal(params.page, 2);

const sorted = sortCategoriesByName([{ name: 'Zeta' }, { name: 'Alpha' }]);
assert.equal(sorted[0].name, 'Alpha');

// ── auth flows against a mock apiClient mimicking real server responses ──
function mockApiClient(responses) {
  let call = 0;
  return async (config) => {
    const res = responses[call];
    call += 1;
    return { data: res };
  };
}

{
  // successful login
  const client = mockApiClient([
    { success: true, message: 'Login successful', data: { accesstoken: 'AT1', refreshToken: 'RT1' } },
    { success: true, data: { _id: 'u1', name: 'Ada', email: 'ada@example.com' } },
  ]);
  const result = await login({
    apiClient: client,
    tokenStorage: storage,
    endpoints,
    email: 'ada@example.com',
    password: 'secret',
  });
  assert.equal(result.success, true);
  assert.equal(result.user.name, 'Ada');
  assert.equal(result.message, 'Login successful');
  assert.equal(await storage.getItem('accesstoken'), 'AT1');
}

{
  // wrong password
  const client = mockApiClient([{ error: true, message: 'Invalid credentials' }]);
  const result = await login({
    apiClient: client,
    tokenStorage: storage,
    endpoints,
    email: 'ada@example.com',
    password: 'wrong',
  });
  assert.equal(result.success, false);
  assert.equal(result.message, 'Invalid credentials');
}

{
  // registration requiring email verification — no auto-login call happens
  const client = mockApiClient([
    { success: true, requiresVerification: true },
  ]);
  const result = await register({
    apiClient: client,
    tokenStorage: storage,
    endpoints,
    name: 'Bo',
    email: 'bo@example.com',
    password: 'secret1',
  });
  assert.equal(result.requiresVerification, true);
  assert.equal(result.email, 'bo@example.com');
}

{
  // registration with immediate auto-login
  const client = mockApiClient([
    { success: true, requiresVerification: false },
    { success: true, data: { accesstoken: 'AT2', refreshToken: 'RT2' } },
    { success: true, data: { _id: 'u2', name: 'Bo', email: 'bo@example.com' } },
  ]);
  const result = await register({
    apiClient: client,
    tokenStorage: storage,
    endpoints,
    name: 'Bo',
    email: 'bo@example.com',
    password: 'secret1',
  });
  assert.equal(result.requiresVerification, false);
  assert.equal(result.user.name, 'Bo');
}

// ── guest cart: pure array transforms ───────────────────────────────────
let guestCart = [];
guestCart = addItemToGuestCart(guestCart, { productId: 'p1', quantity: 2 });
assert.equal(guestCart.length, 1);
assert.equal(guestCart[0].priceOption, 'regular'); // defaulted

// adding the same product+priceOption again increments, doesn't duplicate
guestCart = addItemToGuestCart(guestCart, { productId: 'p1', quantity: 1 });
assert.equal(guestCart.length, 1);
assert.equal(guestCart[0].quantity, 3);

// same product but a different priceOption is a separate line item
guestCart = addItemToGuestCart(guestCart, { productId: 'p1', quantity: 1, priceOption: '3weeks' });
assert.equal(guestCart.length, 2);

guestCart = updateGuestCartItemQty(guestCart, 'p1', 5, 'regular');
assert.equal(guestCart.find((i) => i.priceOption === 'regular').quantity, 5);

// setting quantity to 0 removes the line item (matches original delegate-to-remove behavior)
guestCart = updateGuestCartItemQty(guestCart, 'p1', 0, '3weeks');
assert.equal(guestCart.length, 1);

guestCart = removeGuestCartItem(guestCart, 'p1', 'regular');
assert.equal(guestCart.length, 0);

// ── guest cart merge: bulk endpoint success ─────────────────────────────
{
  const client = mockApiClient([{ success: true }]);
  const result = await mergeGuestCartToServer({
    apiClient: client,
    endpoints,
    guestCartItems: [{ productId: 'p1', quantity: 2 }, { productId: 'p2', quantity: 1 }],
  });
  assert.equal(result.migratedCount, 2);
  assert.equal(result.usedFallback, false);
}

// ── guest cart merge: bulk endpoint fails, falls back to per-item calls,
// one item failing doesn't block the others ──────────────────────────────
{
  let call = 0;
  const client = async () => {
    call += 1;
    if (call === 1) throw new Error('bulk endpoint down');
    if (call === 3) throw new Error('this one item is invalid'); // second item fails
    return { data: { success: true } };
  };
  const result = await mergeGuestCartToServer({
    apiClient: client,
    endpoints,
    guestCartItems: [
      { productId: 'p1', quantity: 1 },
      { productId: 'p2', quantity: 1 },
      { productId: 'p3', quantity: 1 },
    ],
  });
  assert.equal(result.usedFallback, true);
  assert.equal(result.migratedCount, 2); // p1 and p3 succeeded, p2 didn't
}

// empty guest cart is a no-op, never calls the network
{
  let called = false;
  const client = async () => { called = true; return { data: { success: true } }; };
  const result = await mergeGuestCartToServer({ apiClient: client, endpoints, guestCartItems: [] });
  assert.equal(called, false);
  assert.equal(result.migratedCount, 0);
}

// ── server cart (logged-in) ──────────────────────────────────────────────
{
  // fetchServerCart: success
  const client = mockApiClient([{ success: true, data: [{ _id: 'c1', productId: 'p1', quantity: 2 }] }]);
  const cart = await fetchServerCart({ apiClient: client, endpoints });
  assert.equal(cart.length, 1);
  assert.equal(cart[0]._id, 'c1');
}

{
  // fetchServerCart: failure returns [] silently (matches original's catch{})
  const client = async () => { throw new Error('network down'); };
  const cart = await fetchServerCart({ apiClient: client, endpoints });
  assert.deepEqual(cart, []);
}

{
  // addToServerCart: success refetches and returns the fresh cart
  const client = mockApiClient([
    { success: true, message: 'Added to cart' },
    { success: true, data: [{ _id: 'c1', productId: 'p1', quantity: 1 }] },
  ]);
  const result = await addToServerCart({
    apiClient: client,
    endpoints,
    productId: 'p1',
    quantity: 1,
  });
  assert.equal(result.success, true);
  assert.equal(result.message, 'Added to cart');
  assert.equal(result.cart.length, 1);
}

{
  // updateServerCartItemQty: quantity <= 0 delegates to remove
  const client = mockApiClient([
    { success: true, message: 'Item removed' },
    { success: true, data: [] },
  ]);
  const result = await updateServerCartItemQty({
    apiClient: client,
    endpoints,
    cartItemId: 'c1',
    quantity: 0,
  });
  assert.equal(result.success, true);
  assert.equal(result.message, 'Item removed'); // came from the delete endpoint's response
  assert.deepEqual(result.cart, []);
}

{
  // updateServerCartItemQty: normal update refetches
  const client = mockApiClient([
    { success: true },
    { success: true, data: [{ _id: 'c1', productId: 'p1', quantity: 5 }] },
  ]);
  const result = await updateServerCartItemQty({
    apiClient: client,
    endpoints,
    cartItemId: 'c1',
    quantity: 5,
  });
  assert.equal(result.success, true);
  assert.equal(result.cart[0].quantity, 5);
}

{
  // removeServerCartItem: server-reported failure surfaces its message
  const client = mockApiClient([{ success: false, message: 'Item not found' }]);
  const result = await removeServerCartItem({ apiClient: client, endpoints, cartItemId: 'bad-id' });
  assert.equal(result.success, false);
  assert.equal(result.message, 'Item not found');
}

// ── wishlist ─────────────────────────────────────────────────────────────
{
  const client = mockApiClient([{ isInWishlist: true }]);
  const status = await checkWishlistStatus({ apiClient: client, endpoints, productId: 'p1' });
  assert.equal(status.success, true);
  assert.equal(status.isInWishlist, true);
}
{
  const client = async () => { throw new Error('down'); };
  const status = await checkWishlistStatus({ apiClient: client, endpoints, productId: 'p1' });
  assert.equal(status.success, false);
}
{
  const client = mockApiClient([{ success: true, action: 'added' }]);
  const result = await toggleWishlistOnServer({ apiClient: client, endpoints, productId: 'p1' });
  assert.equal(result.success, true);
  assert.equal(result.added, true);
}
{
  let guestWishlist = [];
  let result = toggleWishlistGuest(guestWishlist, { _id: 'p1', name: 'Coffee' });
  assert.equal(result.added, true);
  guestWishlist = result.list;
  assert.equal(guestWishlist.length, 1);

  result = toggleWishlistGuest(guestWishlist, { _id: 'p1', name: 'Coffee' });
  assert.equal(result.added, false);
  assert.equal(result.list.length, 0);
}

// ── compare (including the 4-item guest cap, the one behavioral
// difference from wishlist) ───────────────────────────────────────────────
{
  const client = mockApiClient([{ isInCompare: false }]);
  const status = await checkCompareStatus({ apiClient: client, endpoints, productId: 'p1' });
  assert.equal(status.success, true);
  assert.equal(status.isInCompare, false);
}
{
  const client = mockApiClient([{ success: true, action: 'removed' }]);
  const result = await toggleCompareOnServer({ apiClient: client, endpoints, productId: 'p1' });
  assert.equal(result.success, true);
  assert.equal(result.added, false);
}
{
  let guestCompare = [];
  for (const id of ['p1', 'p2', 'p3', 'p4']) {
    const r = toggleCompareGuest(guestCompare, { _id: id });
    assert.equal(r.added, true);
    guestCompare = r.list;
  }
  assert.equal(guestCompare.length, 4);

  // 5th distinct product hits the cap — list is unchanged, capReached is set
  const capped = toggleCompareGuest(guestCompare, { _id: 'p5' });
  assert.equal(capped.capReached, true);
  assert.equal(capped.list.length, 4);

  // removing an existing one still works even at the cap
  const removed = toggleCompareGuest(guestCompare, { _id: 'p1' });
  assert.equal(removed.added, false);
  assert.equal(removed.list.length, 3);
}

// ── checkout ─────────────────────────────────────────────────────────────
{
  // totals: normal order, no gift card
  const cartItem = [
    { productId: { _id: 'p1', price: 1000 }, quantity: 2, selectedPrice: 1000 },
  ];
  const totals = computeCheckoutTotals(cartItem, 500, null);
  assert.equal(totals.subtotal, 2000);
  assert.equal(totals.total, 2500);
  assert.equal(totals.giftCardDiscount, 0);
  assert.equal(totals.payableTotal, 2500);
  assert.equal(totals.fullyCoveredByGiftCard, false);
}
{
  // totals: gift card covers everything exactly — the critical routing
  // decision (this must send the order through bank transfer regardless
  // of what payment method the customer picked)
  const cartItem = [
    { productId: { _id: 'p1', price: 1000 }, quantity: 1, selectedPrice: 1000 },
  ];
  const totals = computeCheckoutTotals(cartItem, 0, { appliedAmount: 1000 });
  assert.equal(totals.payableTotal, 0);
  assert.equal(totals.fullyCoveredByGiftCard, true);
}
{
  // totals: gift card covers PART of the order — must NOT be treated as
  // fully covered
  const cartItem = [
    { productId: { _id: 'p1', price: 1000 }, quantity: 1, selectedPrice: 1000 },
  ];
  const totals = computeCheckoutTotals(cartItem, 0, { appliedAmount: 400 });
  assert.equal(totals.payableTotal, 600);
  assert.equal(totals.fullyCoveredByGiftCard, false);
}

{
  const orderItems = buildOrderItems([
    { productId: { _id: 'p1', price: 500 }, quantity: 3, priceOption: '3weeks', selectedPrice: 450 },
  ]);
  assert.equal(orderItems[0].productId, 'p1');
  assert.equal(orderItems[0].selectedPrice, 450);
  assert.equal(orderItems[0].priceOption, '3weeks');
}

{
  const client = mockApiClient([
    { success: true, data: { code: 'SAVE10', appliedAmount: 200, remainderToPay: 800, currency: 'NGN' } },
  ]);
  const result = await applyGiftCard({ apiClient: client, endpoints, code: ' save10 ', orderAmount: 1000 });
  assert.equal(result.success, true);
  assert.equal(result.data.appliedAmount, 200);
}
{
  // empty code never hits the network
  let called = false;
  const client = async () => { called = true; return { data: { success: true } }; };
  const result = await applyGiftCard({ apiClient: client, endpoints, code: '   ', orderAmount: 1000 });
  assert.equal(called, false);
  assert.equal(result.success, false);
}

{
  const client = mockApiClient([{ success: true, data: { _id: 'order1', isParentOrder: true } }]);
  const result = await submitBankTransferOrder({
    apiClient: client,
    endpoints,
    orderItems: [{ productId: 'p1', quantity: 1, priceOption: 'regular', selectedPrice: 1000 }],
    addressId: 'addr1',
    subtotal: 1000,
    total: 1000,
    shippingCost: 0,
    shippingMethodId: 'ship1',
    bankTransferDetails: { bankName: 'Test Bank', accountName: 'ICV', accountNumber: '0001', currencyCode: 'NGN' },
    userId: 'u1',
    fullyCoveredByGiftCard: true,
  });
  assert.equal(result.success, true);
  assert.equal(result.order._id, 'order1');
  assert.equal(result.fullyCoveredByGiftCard, true);
  assert.equal(result.bankDetails.bankName, 'Test Bank');
  assert.ok(result.bankDetails.reference.startsWith('ICOFFEE-'));
}

{
  const client = mockApiClient([{ success: true, id: 'cs_test123', url: 'https://checkout.stripe.com/pay/cs_test123' }]);
  const result = await submitGatewayOrder({
    apiClient: client,
    endpoints,
    paymentMethod: 'stripe',
    orderItems: [{ productId: 'p1', quantity: 1, priceOption: 'regular', selectedPrice: 1000 }],
    addressId: 'addr1',
    subtotal: 1000,
    total: 1000,
    shippingCost: 0,
    shippingMethodId: 'ship1',
    currency: 'USD',
    convertedSubtotal: 1.3,
    convertedTotal: 1.3,
    convertedShipping: 0,
    exchangeRate: 0.0013,
  });
  assert.equal(result.success, true);
  assert.equal(result.data.id, 'cs_test123');
  assert.equal(result.checkoutUrl, 'https://checkout.stripe.com/pay/cs_test123');
}
{
  // Paystack: checkoutUrl comes from paymentUrl instead of url
  const client = mockApiClient([{ success: true, paymentUrl: 'https://checkout.paystack.com/abc123' }]);
  const result = await submitGatewayOrder({
    apiClient: client,
    endpoints,
    paymentMethod: 'paystack',
    orderItems: [{ productId: 'p1', quantity: 1, priceOption: 'regular', selectedPrice: 1000 }],
    addressId: 'addr1',
    subtotal: 1000,
    total: 1000,
    shippingCost: 0,
    shippingMethodId: 'ship1',
    currency: 'NGN',
  });
  assert.equal(result.success, true);
  assert.equal(result.checkoutUrl, 'https://checkout.paystack.com/abc123');
}

// ── shipping ─────────────────────────────────────────────────────────────
{
  const cartItem = [
    { productId: { _id: 'p1', name: 'Coffee', price: 1000, weight: 2, category: 'c1' }, quantity: 3, priceOption: 'regular', selectedPrice: 1000 },
  ];
  const items = buildShippingItems(cartItem);
  assert.equal(items[0].productId, 'p1');
  assert.equal(items[0].weight, 2);
}
{
  // pickup methods always sort last, everything else by cost ascending
  const methods = [
    { code: 'pickup1', type: 'pickup', cost: 0 },
    { code: 'express', type: 'delivery', cost: 2000 },
    { code: 'standard', type: 'delivery', cost: 500 },
  ];
  const sorted = sortShippingMethods(methods);
  assert.deepEqual(sorted.map((m) => m.code), ['standard', 'express', 'pickup1']);
}
{
  // reconciliation: previous choice still available -> kept
  const methods = [{ code: 'standard', cost: 600 }, { code: 'express', cost: 2000 }];
  const kept = reconcileSelectedShippingMethod(methods, { code: 'express', cost: 1900 });
  assert.equal(kept.code, 'express');
  assert.equal(kept.cost, 2000); // picks up the fresh cost, not the stale one

  // reconciliation: previous choice no longer available -> falls back to first
  const fallback = reconcileSelectedShippingMethod(methods, { code: 'overnight' });
  assert.equal(fallback.code, 'standard');

  // no previous selection, empty list -> null
  assert.equal(reconcileSelectedShippingMethod([], null), null);
}
{
  const client = mockApiClient([{ success: true, data: { methods: [{ code: 'standard', type: 'delivery', cost: 500 }] } }]);
  const result = await calculateShipping({
    apiClient: client,
    endpoints,
    addressId: 'addr1',
    cartItem: [{ productId: { _id: 'p1', price: 1000 }, quantity: 1, selectedPrice: 1000 }],
    orderValue: 1000,
  });
  assert.equal(result.success, true);
  assert.equal(result.methods.length, 1);
}
{
  // no address or empty cart -> no-op, never hits the network
  let called = false;
  const client = async () => { called = true; return { data: { success: true, data: { methods: [] } } }; };
  const result = await calculateShipping({ apiClient: client, endpoints, addressId: null, cartItem: [], orderValue: 0 });
  assert.equal(called, false);
  assert.deepEqual(result.methods, []);
}

// ── address ──────────────────────────────────────────────────────────────
{
  const payload = buildAddressPayload({
    address_line: '12 Coffee St',
    city: 'Abuja',
    state: 'FCT',
    phone: '08012345678',
  });
  assert.equal(payload.mobile, '08012345678'); // phone -> mobile field rename
  assert.equal(payload.lga, 'FCT'); // falls back to state when lga omitted
  assert.equal(payload.address_type, 'home');
}
{
  const client = mockApiClient([{ success: true, data: { _id: 'addr1' } }]);
  const result = await createAddress({
    apiClient: client,
    endpoints,
    formData: { address_line: '12 Coffee St', city: 'Abuja', state: 'FCT', phone: '0801' },
  });
  assert.equal(result.success, true);
  assert.equal(result.address._id, 'addr1');
}
{
  const client = mockApiClient([{ success: true, data: [{ _id: 'a1', is_primary: false }, { _id: 'a2', is_primary: true }] }]);
  const addresses = await fetchAddresses({ apiClient: client, endpoints });
  assert.equal(addresses.length, 2);
  assert.equal(pickDefaultAddress(addresses)._id, 'a2'); // the primary one, not the first
}
{
  const addresses = [{ _id: 'a1', is_primary: false }, { _id: 'a2', is_primary: false }];
  assert.equal(pickDefaultAddress(addresses)._id, 'a1'); // no primary -> first
  assert.equal(pickDefaultAddress([]), null);
}

// ── email verification ──────────────────────────────────────────────────
{
  const client = mockApiClient([{ success: true, message: 'Email verified successfully' }]);
  const result = await verifyEmailWithCode({ apiClient: client, endpoints, code: 'user123' });
  assert.equal(result.success, true);
  assert.equal(result.alreadyVerified, false);
}
{
  const client = mockApiClient([{ success: true, message: 'Email already verified' }]);
  const result = await verifyEmailWithCode({ apiClient: client, endpoints, code: 'user123' });
  assert.equal(result.success, true);
  assert.equal(result.alreadyVerified, true);
}
{
  const client = mockApiClient([{ success: false, message: 'Invalid verification code' }]);
  const result = await verifyEmailWithCode({ apiClient: client, endpoints, code: 'bad-code' });
  assert.equal(result.success, false);
  assert.equal(result.message, 'Invalid verification code');
}
{
  // missing code never hits the network
  let called = false;
  const client = async () => { called = true; return { data: { success: true } }; };
  const result = await verifyEmailWithCode({ apiClient: client, endpoints, code: null });
  assert.equal(called, false);
  assert.equal(result.success, false);
}

console.log('All @calstins/icvng-core checks passed.');
