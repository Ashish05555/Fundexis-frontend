import React, { useState } from 'react';
import PaymentForm from '../components/PaymentForm';
import PaymentResult from '../components/PaymentResult';
import { createOrder } from '../services/paymentService';

export default function PaymentScreen() {
  const [result, setResult] = useState(null);

  const handleCreateOrder = async (amount) => {
    setResult(null);
    const res = await createOrder(amount);
    setResult(res);
  };

  return (
    <>
      <PaymentForm onSubmit={handleCreateOrder} />
      {result && <PaymentResult data={result} />}
    </>
  );
}