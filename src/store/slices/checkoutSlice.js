import { createSlice } from "@reduxjs/toolkit";
import { loadState, saveState } from "../persist";

// NEW: this slice exists specifically to carry passenger-details form data
// and the chosen payment mode from the Checkout page to the (now separate)
// Payment page — splitting Checkout and Payment into two real pages
// (matching the Figma bundler export's structure) means the Payment page
// can no longer read this straight out of Checkout's local component
// state, so it has to live somewhere both pages can reach. Persisted to
// localStorage (same pattern as selectionSlice) so a refresh on the
// Payment page doesn't lose it.
const initialState = {
  details: loadState("checkoutDetails", {
    fullName: "",
    mobile: "",
    email: "",
    gstNumber: "",
    companyName: "",
    paxCount: "2",
    notes: "",
    customerType: "retail",
    paymentMode: "FULL",
  }),
};

const checkoutSlice = createSlice({
  name: "checkout",
  initialState,
  reducers: {
    setCheckoutDetails(state, action) {
      state.details = { ...state.details, ...action.payload };
      saveState("checkoutDetails", state.details);
    },
    clearCheckoutDetails(state) {
      state.details = initialState.details;
      saveState("checkoutDetails", state.details);
    },
  },
});

export const { setCheckoutDetails, clearCheckoutDetails } = checkoutSlice.actions;
export const selectCheckoutDetails = (state) => state.checkout.details;

export default checkoutSlice.reducer;
