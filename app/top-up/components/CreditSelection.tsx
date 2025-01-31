'use client';

import { purchaseCredits } from "@/app/actions";
import { useState } from "react";

const CREDIT_OPTIONS = [10, 20, 40];

export function CreditSelection() {
  const [selectedAmount, setSelectedAmount] = useState<number>(CREDIT_OPTIONS[0]);
  const [customAmount, setCustomAmount] = useState<string>("");
  const [isCustom, setIsCustom] = useState(false);

  const handlePurchase = async () => {
    const amount = isCustom ? parseInt(customAmount) : selectedAmount;
    if (!amount || amount <= 0) return;
    
    await purchaseCredits(amount);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-3 gap-2">
        {CREDIT_OPTIONS.map((amount) => (
          <button
            key={amount}
            onClick={() => {
              setSelectedAmount(amount);
              setIsCustom(false);
            }}
            className={`p-4 text-center rounded-lg border ${
              !isCustom && selectedAmount === amount
                ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                : "border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600"
            }`}
          >
            {amount}
          </button>
        ))}
      </div>

      <div className="flex gap-2">
        <input
          type="number"
          value={isCustom ? customAmount : ""}
          onChange={(e) => {
            setCustomAmount(e.target.value);
            setIsCustom(true);
          }}
          placeholder="Custom amount"
          className="flex-1 rounded-md border border-gray-200 dark:border-gray-700 px-4 py-2"
          min="1"
        />
      </div>

      <button
        onClick={handlePurchase}
        className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 transition-colors"
      >
        Buy Now (${isCustom ? customAmount || "0" : selectedAmount})
      </button>
    </div>
  );
}
