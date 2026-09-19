import { configureStore } from "@reduxjs/toolkit";
import journeyReducer from "./slices/journeySlice";
import bookingReducer from "./slices/bookingSlice";
import selectionReducer from "./slices/selectionSlice";
import uiReducer from "./slices/uiSlice";
import checkoutReducer from "./slices/checkoutSlice";

export function createReduxStore() {
  return configureStore({
    reducer: {
      journey: journeyReducer,
      booking: bookingReducer,
      selection: selectionReducer,
      ui: uiReducer,
      checkout: checkoutReducer
    }
  });
}

// Singleton store — this app runs client-side only (see pages/+config.js, ssr:false),
// so a single module-level store is safe and mirrors a typical Vite SPA setup.
export const store = createReduxStore();
