// Mock BillingService for web – lets you test the UI and "buy" flow without errors.
export async function initBilling() {
  // Fake product data for UI
  return [
    {
      productId: "fundexis.phase1",
      title: "Basic Challenge",
      description: "Entry challenge. Prove your trading skills and start your Fundexis journey.",
      localizedPrice: "₹4,000",
    },
    {
      productId: "fundexis.phase2",
      title: "Standard Challenge",
      description: "Advanced challenge for experienced traders. Higher rewards.",
      localizedPrice: "₹15,000",
    },
    {
      productId: "fundexis.funded",
      title: "Premium Challenge",
      description: "Get fully funded on success. The highest level of trust and capital.",
      localizedPrice: "₹25,000",
    },
  ];
}

let onPurchaseSuccess, onPurchaseError;
export function startPurchaseListeners(callbacks) {
  onPurchaseSuccess = callbacks.onPurchaseSuccess;
  onPurchaseError = callbacks.onPurchaseError;
}
export function removePurchaseListeners() {
  onPurchaseSuccess = null;
  onPurchaseError = null;
}
export async function buyChallenge(challengeId) {
  // Mocks a successful purchase after a short delay
  setTimeout(() => {
    if (onPurchaseSuccess) {
      let productId = "";
      if (challengeId === "phase1") productId = "fundexis.phase1";
      if (challengeId === "phase2") productId = "fundexis.phase2";
      if (challengeId === "funded") productId = "fundexis.funded";
      onPurchaseSuccess({
        productId,
        purchaseToken: "test-token",
        transactionReceipt: "test-receipt",
      });
    }
  }, 1200);
}
export function getProductDetails(sku) {
  // Not used in web mock
  return null;
}
export const CHALLENGE_SKUS = {
  phase1: "fundexis.phase1",
  phase2: "fundexis.phase2",
  funded: "fundexis.funded",
};