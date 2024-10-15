export const HOST = process.env.DFX_NETWORK != "ic" ? "http://localhost:8080" : "https://ic0.app"

export const FETCH_ROOT_KEY = process.env.DFX_NETWORK != "ic"
