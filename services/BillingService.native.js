// Real Google Play Billing logic for Android/iOS
import * as RNIap from 'react-native-iap';
import { Platform, Alert } from 'react-native';

const CHALLENGE_SKUS = {
  phase1: 'fundexis.phase1',
  phase2: 'fundexis.phase2',
  funded: 'fundexis.funded',
};

const productDetailsMap = {};
let purchaseUpdateSubscription = null;
let purchaseErrorSubscription = null;

export async function initBilling() {
  try {
    await RNIap.initConnection();
    if (Platform.OS === 'android') {
      await RNIap.flushFailedPurchasesCachedAsPendingAndroid();
    }
    const products = await RNIap.getProducts(Object.values(CHALLENGE_SKUS));
    products.forEach((prod) => {
      productDetailsMap[prod.productId] = prod;
    });
    return products;
  } catch (e) {
    console.error('Billing init error:', e);
    Alert.alert('Billing Error', 'Could not connect to Google Play. Please try again later.');
    return [];
  }
}

export function startPurchaseListeners({ onPurchaseSuccess, onPurchaseError }) {
  purchaseUpdateSubscription = RNIap.purchaseUpdatedListener(async (purchase) => {
    try {
      const { productId, purchaseToken, transactionReceipt } = purchase;
      const resp = await fetch('https://your-backend.com/verifyPurchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, purchaseToken }),
      });
      const data = await resp.json();
      if (data.valid) {
        if (Platform.OS === 'android') {
          await RNIap.acknowledgePurchaseAndroid(purchaseToken);
        } else if (Platform.OS === 'ios') {
          await RNIap.finishTransactionIOS(purchase.transactionId);
        }
        await RNIap.finishTransaction(purchase, false);
        if (onPurchaseSuccess) onPurchaseSuccess({ productId, purchaseToken, transactionReceipt });
      } else {
        Alert.alert('Purchase Invalid', 'Your purchase could not be verified.');
        if (onPurchaseError) onPurchaseError('Server validation failed');
      }
    } catch (e) {
      console.error('Purchase validation error:', e);
      Alert.alert('Purchase Error', 'There was an error validating your purchase.');
      if (onPurchaseError) onPurchaseError(e);
    }
  });

  purchaseErrorSubscription = RNIap.purchaseErrorListener((error) => {
    console.error('Purchase error:', error);
    Alert.alert('Purchase Error', error.message || 'Something went wrong with the purchase.');
    if (onPurchaseError) onPurchaseError(error);
  });
}

export function removePurchaseListeners() {
  if (purchaseUpdateSubscription) {
    purchaseUpdateSubscription.remove();
    purchaseUpdateSubscription = null;
  }
  if (purchaseErrorSubscription) {
    purchaseErrorSubscription.remove();
    purchaseErrorSubscription = null;
  }
}

export async function buyChallenge(challengeId) {
  const sku = CHALLENGE_SKUS[challengeId];
  if (!sku) {
    Alert.alert('Error', 'Invalid challenge selected.');
    return;
  }
  try {
    await RNIap.requestPurchase({ sku, andDangerouslyFinishTransactionAutomatically: false });
  } catch (e) {
    console.error('Buy error:', e);
    Alert.alert('Purchase Failed', e.message || 'Could not start purchase flow.');
  }
}

export function getProductDetails(sku) {
  return productDetailsMap[sku];
}

export { CHALLENGE_SKUS };