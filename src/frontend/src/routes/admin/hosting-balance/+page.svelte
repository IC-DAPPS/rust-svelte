<script lang="ts">
  import { onMount } from "svelte"; // onMount is no longer used for fetching
  import { getHostingBalance } from "$lib/api"; // Import the new API function
  import type { Principal } from "@dfinity/principal"; // Keep for type definitions

  // Canister Financial Status
  interface CanisterInfo {
    name: string;
    balanceINR: string;
    rawCycles: string;
    status: string;
  }
  let canisterFinancialInfo: Array<CanisterInfo> = [];
  let isLoadingStatus = false; // Initial state is not loading
  let statusError: string | null = null;
  let hasFetched = false; // To track if fetch has been attempted

  const XDR_TO_USD_RATE = 1.37;
  const USD_TO_INR_RATE = 87.0;
  const CYCLES_PER_XDR_BIGINT = 1_000_000_000_000n;

  // Thresholds are still needed on the frontend
  const thresholds = {
    Backend: 1_000_000_000_000n,
    Frontend: 500_000_000_000n,
  };

  interface CanisterCycles {
    id: Principal;
    name: string;
    cycles: bigint; // Candid u128 becomes bigint
  }

  interface AllCanisterCyclesResponse {
    backend: CanisterCycles;
    frontend: CanisterCycles;
  }

  async function fetchBalance() {
    try {
      isLoadingStatus = true;
      statusError = null; // Reset error on new fetch
      hasFetched = true;

      const result = await getHostingBalance(); // Use the centralized API function

      const canisters = [result.backend, result.frontend];
      const info: Array<CanisterInfo> = [];

      for (const canister of canisters) {
        const cycles = canister.cycles;
        const balanceXDR = Number(cycles) / Number(CYCLES_PER_XDR_BIGINT);
        const balanceUSD = balanceXDR * XDR_TO_USD_RATE;
        const balanceINR = balanceUSD * USD_TO_INR_RATE;

        const threshold =
          thresholds[canister.name as keyof typeof thresholds] ?? 0n;
        const currentStatus = cycles < threshold ? "Recharge Needed" : "OK";

        info.push({
          name: canister.name,
          balanceINR: balanceINR.toLocaleString("en-IN", {
            style: "currency",
            currency: "INR",
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          }),
          rawCycles: Number(cycles).toLocaleString(),
          status: currentStatus,
        });
      }
      canisterFinancialInfo = info;
    } catch (err: unknown) {
      console.error("Failed to load hosting balance:", err);
      // The error message is already formatted and toasted by api.ts
      statusError =
        err instanceof Error ? err.message : "An unknown error occurred.";
    } finally {
      isLoadingStatus = false;
    }
  }
</script>

<svelte:head>
  <title>Hosting Balance - Admin</title>
</svelte:head>

<div class="page-container">
  <section class="canister-status-admin">
    <div class="header-with-button">
      <h1>Hosting Balance</h1>
      <button
        class="fetch-button"
        on:click={fetchBalance}
        disabled={isLoadingStatus}
      >
        {#if isLoadingStatus}
          Fetching...
        {:else}
          🔄 Fetch Balance
        {/if}
      </button>
    </div>

    {#if isLoadingStatus}
      <p class="loading-status">Loading hosting status...</p>
    {:else if statusError}
      <p class="error-status">Error: {statusError}</p>
    {:else if hasFetched && canisterFinancialInfo.length > 0}
      <!-- DESKTOP TABLE VIEW -->
      <div class="table-container desktop-view">
        <table>
          <thead>
            <tr>
              <th>Canister</th>
              <th>Balance (INR)</th>
              <th>Raw Cycles</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {#each canisterFinancialInfo as info}
              <tr>
                <td>{info.name}</td>
                <td>{info.balanceINR}</td>
                <td>{info.rawCycles}</td>
                <td
                  class="status-{info.status.toLowerCase().replace(/ /g, '-')}"
                  >{info.status}</td
                >
              </tr>
            {/each}
          </tbody>
        </table>
      </div>

      <!-- MOBILE CARD VIEW -->
      <div class="mobile-view">
        {#each canisterFinancialInfo as info}
          <div class="card">
            <h4>{info.name}</h4>
            <div class="card-item">
              <span class="item-label">Balance (INR)</span>
              <span class="item-value">{info.balanceINR}</span>
            </div>
            <div class="card-item">
              <span class="item-label">Raw Cycles</span>
              <span class="item-value">{info.rawCycles}</span>
            </div>
            <div class="card-item">
              <span class="item-label">Status</span>
              <span
                class="item-value status-{info.status
                  .toLowerCase()
                  .replace(/ /g, '-')}">{info.status}</span
              >
            </div>
          </div>
        {/each}
      </div>
    {:else if hasFetched}
      <p>Could not retrieve hosting balance information.</p>
    {:else}
      <p class="initial-message">
        Click the "Fetch Balance" button to see the current hosting balance.
      </p>
    {/if}
  </section>
</div>

<style>
  .page-container {
    padding: 1rem;
  }
  .canister-status-admin h1 {
    text-align: center;
    margin-bottom: 1.5rem;
    font-size: 1.8rem;
    color: #333;
  }

  .canister-status-admin table {
    width: 100%;
    border-collapse: collapse;
    margin: 0 auto;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    white-space: nowrap;
  }

  .canister-status-admin th,
  .canister-status-admin td {
    border: 1px solid #ddd;
    padding: 0.75rem 1rem;
    text-align: left;
    font-size: 0.9rem;
  }

  .canister-status-admin th:first-child,
  .canister-status-admin td:first-child {
    text-align: left;
  }

  .canister-status-admin th,
  .canister-status-admin td:not(:first-child) {
    text-align: right;
  }

  .canister-status-admin th {
    background-color: #e9ecef;
    font-weight: bold;
    color: #495057;
  }

  .canister-status-admin tr:nth-child(even) {
    background-color: #f8f9fa;
  }

  .canister-status-admin .status-ok {
    color: green;
    font-weight: bold;
  }

  .canister-status-admin .status-recharge-needed {
    color: red;
    font-weight: bold;
  }
  .canister-status-admin .status-error-fetching-data {
    color: orange;
    font-weight: bold;
  }

  .loading-status,
  .error-status {
    text-align: center;
    padding: 1rem;
    color: #666;
    font-size: 1rem;
  }

  .header-with-button {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.5rem;
  }

  .header-with-button h1 {
    margin: 0;
  }

  .fetch-button {
    padding: 0.6rem 1.2rem;
    font-size: 0.9rem;
    font-weight: bold;
    color: white;
    background-color: #5eaa6f;
    border: none;
    border-radius: 5px;
    cursor: pointer;
    transition: background-color 0.2s;
  }

  .fetch-button:hover:not(:disabled) {
    background-color: #4e9a5f;
  }

  .fetch-button:disabled {
    background-color: #a5d6a7;
    cursor: not-allowed;
  }

  .initial-message {
    text-align: center;
    padding: 2rem;
    color: #555;
    background-color: #f0f4f8;
    border-radius: 8px;
  }

  .table-container {
    overflow-x: auto;
    width: 100%;
  }

  /* --- RESPONSIVE LAYOUT STYLES --- */

  /* Hide mobile view by default */
  .mobile-view {
    display: none;
  }

  .card {
    background: #fff;
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    padding: 1rem;
    margin-bottom: 1rem;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  }

  .card h4 {
    margin-top: 0;
    margin-bottom: 1rem;
    border-bottom: 1px solid #eee;
    padding-bottom: 0.75rem;
    font-size: 1.2rem;
    color: #333;
  }

  .card-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.6rem 0;
    font-size: 0.95rem;
    border-bottom: 1px solid #f5f5f5;
  }

  .card-item:last-child {
    border-bottom: none;
  }

  .item-label {
    font-weight: bold;
    color: #555;
  }

  .item-value {
    text-align: right;
  }

  /* Media Query for mobile devices */
  @media (max-width: 767px) {
    .desktop-view {
      display: none; /* Hide the table on mobile */
    }
    .mobile-view {
      display: block; /* Show the cards on mobile */
    }
    .header-with-button {
      flex-direction: column;
      align-items: stretch;
      gap: 1rem;
    }
  }
</style>
