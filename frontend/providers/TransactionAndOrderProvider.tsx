'use client';

import { StacksMocknet } from "@stacks/network";
import { createContext, PropsWithChildren, useContext, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useStacks } from "./StacksProvider";
import { uintCV } from "@stacks/transactions";
import { mintingSBTCToastMessage, SatoshisPerBTC } from "@/lib/constants";
import { Order, Orders } from "@/lib/types";
import _ from "lodash";

type Transaction = {
  tx_status: string,
  contract_call?: { contract_id: string, function_args: any[], function_name: string },
  tx_id: string,
  block_height?: number,
  receipt_time?: number, // for pending transactions
  burn_block_time?: number, // for mined transsactions
}

interface TransactionsToastContextValue {
  addOrderToast: (order: Order, pendingMessage: string) => void,
  pendingOrders: Orders,
  completedOrders: Orders,
  addTransactionToast: (transactionId: string, pendingMessage: string) => void,
  transactionIds: Set<string>,
}

const TransactionToastsContext = createContext<TransactionsToastContextValue | undefined>(undefined);

export default function TransactionAndOrderProvider({ children }: PropsWithChildren<{}>) {
  const network = new StacksMocknet()
  const [transactionIds, setTransactionIds] = useState<Set<string>>(new Set());
  const [pendingOrders, setPendingOrders] = useState<Orders>(new Map());
  const [completedOrders, setCompletedOrders] = useState<Orders>(new Map());

  const { address } = useStacks();

  useEffect(() => {
    const interval = setInterval(() => {
      updateAllPendingOrders(pendingOrders);
      updateAllTransactions(transactionIds);
    }, 5000);

    return () => { clearInterval(interval) }
  }, [pendingOrders, transactionIds]);

  useEffect(() => {
    if (!address) return;
    getTransactions(address);
    getPendingTransactions(address);
  }, [address]);

  async function updateAllTransactions(transactionIds: Set<string>) {
    transactionIds.forEach(async transactionId => {
      console.log('Checking latest status of transaction:', transactionId)
      await getTransactionStatus(transactionId)
    })
  }

  async function updateAllPendingOrders(orders: Orders) {
    orders.forEach(async order => {
      console.log('Checking latest status of tx:', order.txId)
      const status = await getOrderStatus(order)
      if (status === "success") {
        toast.success('Done!', { id: order.txId });
      } else if (status !== "pending" && status !== "") {
        toast.error('Transaction failed', { id: order.txId });
      }
    });
  }

  async function getTransactionStatus(transactionId: string) {
    const apiUrl = network.coreApiUrl
    const url = `${apiUrl}/extended/v1/tx/${transactionId}`
    const res = await fetch(url)
    const json = await res.json()

    const status = json['tx_status']
    if (status === 'pending') {
      return
    }

    if (status === 'success') {
      toast.success('Done!', { id: transactionId })
    }
    setTransactionIds(transactionIds => {
      const newTransactionIds = new Set(transactionIds)
      newTransactionIds.delete(transactionId)
      return newTransactionIds
    })
  }

  function addTransactionToast(transactionId: string, pendingMessage: string) {
    console.log(`listening to updates for transaction ${transactionId}`)
    toast.loading(pendingMessage, { id: transactionId })
    setTransactionIds(transactionIds => transactionIds.add(transactionId))
  }

  async function getPendingTransactions(address: string) {
    const apiUrl = network.coreApiUrl;
    const url = `${apiUrl}/extended/v1/tx/mempool?sender_address=${address}`;

    const res = await fetch(url);
    if (!res.ok) {
      return // tx not found, might still be processing on the sponsor's side.
    }

    const json = await res.json();

    const txs = json["results"] as Transaction[];
    if (!txs || !txs.length) return;

    const newPendingOrders: Set<Order> = new Set();
    for (const tx of txs) {
      if (
        tx.tx_status !== "pending" ||
        (tx.contract_call?.contract_id !== "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.bitthetix" &&
          tx.contract_call?.contract_id !== "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.sbtc")
      ) continue;
      if (tx.contract_call?.function_name === "purchase-asset") {
        newPendingOrders.add({
          status: "pending",
          assetKey: `${Number(uintCV((tx.contract_call.function_args[0]["repr"] as string).replace("u", "")).value)}`,
          amountSBTC: Number(uintCV((tx.contract_call.function_args[1]["repr"] as string).replace("u", "")).value) / SatoshisPerBTC,
          txId: tx.tx_id,
          blockNumber: tx.block_height,
          timestamp: tx.receipt_time || 0,
          amountAsset: 0,
        });
      }

      if (tx.contract_call?.function_name === "mint-bitthetix-testnet") {
        addTransactionToast(tx.tx_id, mintingSBTCToastMessage);
      }
    }
  }

  async function getTransactions(address: string) {
    const apiUrl = network.coreApiUrl;
    const url = `${apiUrl}/extended/v1/address/${address}/transactions`;

    const res = await fetch(url);
    if (!res.ok) {
      return // tx not found, might still be processing on the sponsor's side.
    }

    const json = await res.json();
    const txs = json["results"] as Transaction[];
    if (!txs || !txs.length) return;

    const newCompletedOrders: Orders = new Map();
    for (const tx of txs) {
      if (tx.tx_status === "success" &&
        tx.contract_call?.contract_id === "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.bitthetix" &&
        tx.contract_call.function_name === "purchase-asset") {
        const order = {
          status: "success",
          assetKey: `${Number(uintCV((tx.contract_call.function_args[0]["repr"] as string).replace("u", "")).value)}`,
          amountSBTC: Number(uintCV((tx.contract_call.function_args[1]["repr"] as string).replace("u", "")).value) / SatoshisPerBTC,
          txId: tx.tx_id,
          blockNumber: tx.block_height,
          timestamp: tx.burn_block_time || 0,
          amountAsset: 0,
        };
        newCompletedOrders.set(tx.tx_id, order);
        getOrderStatus(order);
      }
    }

    setCompletedOrders(newCompletedOrders);
  }


  async function getOrderStatus(order: Order): Promise<string> {
    const apiUrl = network.coreApiUrl;
    const url = `${apiUrl}/extended/v1/tx/${order.txId}?event_limit=2`;

    const res = await fetch(url);
    if (!res.ok) {
      return ""; // tx not found, might still be processing on the sponsor's side.
    }

    const tx = (await res.json() as Transaction)
    const status = tx.tx_status
    if (status === 'pending') {
      return "";
    }

    const amountAsset = parseFloat((_.get(tx, "events[1].contract_log.value.repr") || "u0").replace("u", "")) / SatoshisPerBTC;
    if (status === 'success') {
      setCompletedOrders(completedOrders => {
        const newCompletedOrders = new Map(completedOrders)
        newCompletedOrders.set(order.txId, { ...order, amountAsset, blockNumber: tx.block_height, timestamp: tx.burn_block_time || 0 })
        return newCompletedOrders;
      });
    }
    setPendingOrders(pendingOrders => {
      const newPendingOrders = new Map(pendingOrders)
      newPendingOrders.delete(order.txId)
      return newPendingOrders
    });

    return status;
  }

  function addOrderToast(order: Order, pendingMessage: string) {
    console.log(`listening to updates for transaction ${order.txId}`)
    toast.loading(pendingMessage, { id: order.txId })
    setPendingOrders(pendingOrders => {
      const newPendingOrders = new Map(pendingOrders)
      newPendingOrders.set(order.txId, order)
      return newPendingOrders
    });
  }

  const value: TransactionsToastContextValue = {
    addOrderToast,
    addTransactionToast,
    transactionIds,
    pendingOrders,
    completedOrders,
  };

  return (
    <TransactionToastsContext.Provider value={value}>
      {children}
    </TransactionToastsContext.Provider>
  )
}

export function useTransactionToasts() {
  const context = useContext(TransactionToastsContext);
  if (context === undefined) {
    throw new Error('useTransactionToasts must be used within a TransactionToastProvider');
  }
  return context;
}