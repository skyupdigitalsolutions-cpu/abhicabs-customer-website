import { createSlice, nanoid } from "@reduxjs/toolkit";

const initialState = {
  toasts: [], // { id, message, type }
  mobileNavOpen: false
};

const uiSlice = createSlice({
  name: "ui",
  initialState,
  reducers: {
    addToast: {
      reducer(state, action) {
        state.toasts.push(action.payload);
      },
      prepare(message, type) {
        return { payload: { id: nanoid(), message, type: type || "default" } };
      }
    },
    removeToast(state, action) {
      state.toasts = state.toasts.filter((t) => t.id !== action.payload);
    },
    setMobileNavOpen(state, action) {
      state.mobileNavOpen = action.payload;
    }
  }
});

export const { addToast, removeToast, setMobileNavOpen } = uiSlice.actions;
export const selectToasts = (state) => state.ui.toasts;
export const selectMobileNavOpen = (state) => state.ui.mobileNavOpen;

export default uiSlice.reducer;
