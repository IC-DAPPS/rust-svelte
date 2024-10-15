# Rust-Svelte-Gix

Rust-Svelte-Gix is a simple Dapp built using Rust for the backend and Svelte for the frontend.

## Requirements

Make sure you have the following installed:

- **DFINITY Canister SDK (`dfx`)**: Ensure you have the latest version installed. see guide in [Motoko-Book](https://motoko-book.dev/project-deployment/installing-sdk.html).
- **Node.js**: Version 18 or above. Download from the [Node.js website](https://nodejs.org/).

## Installation

### Steps to Deploy Locally

1. **Start the DFX network:**
   ```bash
   dfx start
   ```
2. **Deploy the project locally:**
   ```bash
   ./scripts/deploy-local.sh
   ```

### Steps to Run Unit Tests

Run the following command to execute unit tests:

```bash
npm run test
```

## Development

### How to Start Development

To start the development server, run:

```bash
npm run dev
```

## Deployment

### Build and Deploy from Scratch

1. **Deploy the project:**
   ```bash
   dfx deploy
   ```

2. **Build the project:**
   ```bash
   dfx build
   ```

