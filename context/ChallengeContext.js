import React, { createContext, useContext, useState } from "react";
import { collection, addDoc, query, getDocs, updateDoc, doc } from "firebase/firestore";
import { db } from "../firebase";
import { getAuth } from "firebase/auth";

const CHALLENGES = {
  '1L': { balance: 100000, fee: 4000, color: '#1976d2', label: '1 Lakh Challenge', target: 10000 },
  '5L': { balance: 500000, fee: 15000, color: '#388e3c', label: '5 Lakh Challenge', target: 50000 },
  '10L': { balance: 1000000, fee: 25000, color: '#fbc02d', label: '10 Lakh Challenge', target: 100000 }
};

const ChallengeContext = createContext();

export function ChallengeProvider({ children }) {
  const [selectedChallenge, setSelectedChallenge] = useState(null);
  const [demoAccounts, setDemoAccounts] = useState([]);
  const [loadingDemoAccounts, setLoadingDemoAccounts] = useState(false);
  const [fundedAccounts, setFundedAccounts] = useState([]);
  const [loadingFundedAccounts, setLoadingFundedAccounts] = useState(false);

  function getCurrentUid() {
    const auth = getAuth();
    return (auth.currentUser && auth.currentUser.uid) || null;
  }

  // --- Fetch demo accounts (challenges with phase 1/2, not funded) ---
  async function fetchDemoAccounts() {
    const userUid = getCurrentUid();
    if (!userUid) {
      setDemoAccounts([]);
      setSelectedChallenge(null);
      setLoadingDemoAccounts(false);
      return;
    }
    setLoadingDemoAccounts(true);
    try {
      const challengesRef = collection(db, "users", userUid, "challenges");
      const snapshot = await getDocs(query(challengesRef));
      const data = snapshot.docs
        .map(doc => {
          const docData = doc.data();
          
          // Get templateId to determine correct challenge amounts
          const templateId = docData.templateId || "1";
          let correctBalance, correctTarget, correctLabel;
          
          if (templateId === "1") {
            correctBalance = 100000;
            correctTarget = 10000;
            correctLabel = "1 Lakh Challenge";
          } else if (templateId === "2") {
            correctBalance = 500000;
            correctTarget = 50000;
            correctLabel = "5 Lakh Challenge";
          } else if (templateId === "3") {
            correctBalance = 1000000;
            correctTarget = 100000;
            correctLabel = "10 Lakh Challenge";
          } else {
            correctBalance = 100000;
            correctTarget = 10000;
            correctLabel = "1 Lakh Challenge";
          }
          
          // Get P&L from Firestore
          const pnl = docData.pnl || 0;
          
          // Calculate balance = challenge amount + pnl
          const currentBalance = correctBalance + pnl;
          
          // Get challenge code
          const code = docData.challengeCode || docData.accountNumber;
          
          // Build title
          const title = code ? `${correctLabel} #${code}` : correctLabel;
          
          return {
            ...docData,
            id: doc.id,
            title: title,
            balance: currentBalance,
            initialBalance: correctBalance,
            phaseStartBalance: correctBalance,
            profitTarget: correctTarget,
            pnl: pnl,
            accountNumber: code,
          };
        })
        .filter(acc => !acc.funded); // Only demo challenges (not funded)
      
      setDemoAccounts(data);

      // Auto-select first available account if none is selected
      if (!selectedChallenge && data.length > 0) {
        setSelectedChallenge(data[0]);
      }
      if (
        selectedChallenge &&
        !data.some(
          (acc) =>
            acc.accountNumber === selectedChallenge.accountNumber ||
            acc.title === selectedChallenge.title
        )
      ) {
        setSelectedChallenge(data[0] || null);
      }
    } catch (err) {
      setDemoAccounts([]);
      setSelectedChallenge(null);
    }
    setLoadingDemoAccounts(false);
  }

  // --- Fetch funded accounts ---
  async function fetchFundedAccounts() {
    const userUid = getCurrentUid();
    if (!userUid) {
      setFundedAccounts([]);
      setLoadingFundedAccounts(false);
      return;
    }
    setLoadingFundedAccounts(true);
    try {
      // Option 1: If funded accounts are in a separate subcollection
      // const fundedRef = collection(db, "users", userUid, "fundedAccounts");
      // const snapshot = await getDocs(query(fundedRef));
      // const data = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));

      // Option 2: If funded accounts are marked with funded: true in challenges
      const challengesRef = collection(db, "users", userUid, "challenges");
      const snapshot = await getDocs(query(challengesRef));
      const data = snapshot.docs
        .map(doc => {
          const docData = doc.data();
          
          // Get templateId to determine correct challenge amounts
          const templateId = docData.templateId || "1";
          let correctBalance, correctTarget, correctLabel;
          
          if (templateId === "1") {
            correctBalance = 100000;
            correctTarget = 10000;
            correctLabel = "1 Lakh Challenge";
          } else if (templateId === "2") {
            correctBalance = 500000;
            correctTarget = 50000;
            correctLabel = "5 Lakh Challenge";
          } else if (templateId === "3") {
            correctBalance = 1000000;
            correctTarget = 100000;
            correctLabel = "10 Lakh Challenge";
          } else {
            correctBalance = 100000;
            correctTarget = 10000;
            correctLabel = "1 Lakh Challenge";
          }
          
          // Get P&L from Firestore
          const pnl = docData.pnl || 0;
          
          // Calculate balance = challenge amount + pnl
          const currentBalance = correctBalance + pnl;
          
          // Get challenge code
          const code = docData.challengeCode || docData.accountNumber || docData.fundedAccountNumber;
          
          // Build title
          const title = code ? `${correctLabel} #${code}` : correctLabel;
          
          return {
            ...docData,
            id: doc.id,
            title: title,
            balance: currentBalance,
            initialBalance: correctBalance,
            phaseStartBalance: correctBalance,
            profitTarget: correctTarget,
            pnl: pnl,
            accountNumber: code,
          };
        })
        .filter(acc => acc.funded); // Only funded accounts

      setFundedAccounts(data);
    } catch (err) {
      setFundedAccounts([]);
    }
    setLoadingFundedAccounts(false);
  }

  // --- Buy challenge and store in Firestore ---
  async function buyChallengeAndRefresh(challengeType) {
    const userUid = getCurrentUid();
    if (!userUid || !CHALLENGES[challengeType]) return;

    try {
      // Build challenge object
      const initialBalance = CHALLENGES[challengeType].balance;
      const profitTarget = initialBalance * 0.1;
      const accountNumber = await generateUniqueAccountNumber(userUid);
      const accountName = `${CHALLENGES[challengeType].label} #${accountNumber}`;
      const demoAccount = {
        type: challengeType,
        title: accountName,
        color: CHALLENGES[challengeType].color,
        balance: initialBalance,
        initialBalance: initialBalance,
        fee: CHALLENGES[challengeType].fee,
        status: 'ACTIVE',
        breached: false,
        phase: 1,
        phaseStartBalance: initialBalance,
        phaseProfitTarget: profitTarget,
        profitTarget: profitTarget,
        totalProfit: 0,
        createdAt: new Date().toISOString(),
        portfolio: [],
        tradeHistory: [],
        accountNumber,
        funded: false,
        parentChallengeId: null,
      };

      // Add to Firestore under /users/{uid}/challenges/
      const challengesRef = collection(db, "users", userUid, "challenges");
      await addDoc(challengesRef, demoAccount);

      // Refresh accounts
      await fetchDemoAccounts();
    } catch (err) {
      // Handle error if needed
    }
  }

  // --- Generate unique 5-digit account number ---
  async function generateUniqueAccountNumber(userUid) {
    // Get all account numbers for demo & funded accounts
    const challengesRef = collection(db, "users", userUid, "challenges");
    const snapshot = await getDocs(query(challengesRef));
    const allNumbers = snapshot.docs.map(doc => doc.data().accountNumber);

    let num;
    do {
      num = Math.floor(10000 + Math.random() * 90000);
    } while (allNumbers.includes(num));
    return num;
  }

  // --- Mark phase 1 as completed and create phase 2 ---
  async function completePhase1AndProgress(challenge) {
    const userUid = getCurrentUid();
    if (!userUid || !challenge?.id) return;

    try {
      // 1. Mark phase 1 challenge as completed
      await updateDoc(doc(db, "users", userUid, "challenges", challenge.id), {
        status: "COMPLETED",
        breached: false,
        phaseCompletedAt: new Date().toISOString(),
      });

      // 2. Create phase 2 challenge with same amount
      const accountNumber = await generateUniqueAccountNumber(userUid);
      const accountName = `${CHALLENGES[challenge.type].label} Phase 2 #${accountNumber}`;
      const initialBalance = challenge.initialBalance;
      const profitTarget = initialBalance * 0.1;
      const phase2Challenge = {
        type: challenge.type,
        title: accountName,
        color: challenge.color,
        balance: initialBalance,
        initialBalance: initialBalance,
        fee: challenge.fee,
        status: 'ACTIVE',
        breached: false,
        phase: 2,
        phaseStartBalance: initialBalance,
        phaseProfitTarget: profitTarget,
        profitTarget: profitTarget,
        totalProfit: 0,
        createdAt: new Date().toISOString(),
        portfolio: [],
        tradeHistory: [],
        accountNumber,
        funded: false,
        parentChallengeId: challenge.id,
      };
      const challengesRef = collection(db, "users", userUid, "challenges");
      await addDoc(challengesRef, phase2Challenge);

      // Refresh accounts
      await fetchDemoAccounts();
    } catch (err) {
      // Handle error
    }
  }

  // --- Mark phase 2 as completed and create funded account ---
  async function completePhase2AndCreateFunded(challenge) {
    const userUid = getCurrentUid();
    if (!userUid || !challenge?.id) return;

    try {
      // 1. Mark phase 2 challenge as completed
      await updateDoc(doc(db, "users", userUid, "challenges", challenge.id), {
        status: "COMPLETED",
        breached: false,
        phaseCompletedAt: new Date().toISOString(),
      });

      // 2. Create funded account (as a challenge with funded: true)
      const accountNumber = await generateUniqueAccountNumber(userUid);
      const accountName = `${CHALLENGES[challenge.type].label} Funded Account #${accountNumber}`;
      const initialBalance = challenge.initialBalance;
      const fundedAccount = {
        type: challenge.type,
        title: accountName,
        color: challenge.color,
        balance: initialBalance,
        initialBalance: initialBalance,
        fee: challenge.fee,
        status: 'ACTIVE',
        breached: false,
        phase: null,
        phaseStartBalance: initialBalance,
        phaseProfitTarget: null,
        profitTarget: null,
        totalProfit: 0,
        createdAt: new Date().toISOString(),
        portfolio: [],
        tradeHistory: [],
        accountNumber,
        funded: true,
        parentChallengeId: challenge.id,
        fundedAccountNumber: accountNumber,
      };
      const challengesRef = collection(db, "users", userUid, "challenges");
      await addDoc(challengesRef, fundedAccount);

      // Refresh both lists
      await fetchDemoAccounts();
      await fetchFundedAccounts();
    } catch (err) {
      // Handle error
    }
  }

  // --- Unified handler to check and progress phase if profit target met and trades closed ---
  async function handlePhaseCompletion(challenge) {
    // You must call this function when you detect the user has hit the 10% profit target and closed all trades
    if (!challenge) return;
    // If challenge.phase === 1, create phase 2
    if (challenge.phase === 1 && challenge.status === "ACTIVE" && challenge.totalProfit >= challenge.profitTarget) {
      await completePhase1AndProgress(challenge);
    }
    // If challenge.phase === 2, create funded account
    if (challenge.phase === 2 && challenge.status === "ACTIVE" && challenge.totalProfit >= challenge.profitTarget) {
      await completePhase2AndCreateFunded(challenge);
    }
  }

  function clearChallenges() {
    setDemoAccounts([]);
    setFundedAccounts([]);
    setSelectedChallenge(null);
  }

  return (
    <ChallengeContext.Provider
      value={{
        selectedChallenge,
        setSelectedChallenge,
        demoAccounts,
        setDemoAccounts,
        fetchDemoAccounts,
        buyChallengeAndRefresh,
        clearChallenges,
        loadingDemoAccounts,
        fundedAccounts,
        loadingFundedAccounts,
        fetchFundedAccounts,
        handlePhaseCompletion, // <-- Call this with a challenge to auto-progress phase/funding!
      }}
    >
      {children}
    </ChallengeContext.Provider>
  );
}

export function useChallenge() {
  return useContext(ChallengeContext);
}