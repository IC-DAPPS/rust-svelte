# #!/bin/bash

# # Exit immediately if a command exits with a non-zero status.
# set -e

# echo "Starting deployment process..."

# # Deploy Backend Canister
# echo "Deploying Backend Canister..."
# dfx deploy backend
#  sleep 15

# # Run Cargo tests to generate Candid file
# echo "Running Cargo tests to generate Candid file..."
# cargo test -p backend generate_candid
# sleep 5
# # Generate declarations
# echo "Generating declarations..."
# dfx generate backend

# # deploy frontend
# # echo "Deploying frontend..."
# # npm install
# # dfx deploy frontend

# # # Inform the user that the deployment completed successfully
# # echo "Deployment completed successfully. Now you can start your local development server by running 'npm run dev'"
