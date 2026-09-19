import { createSlice } from "@reduxjs/toolkit";
import { rid } from "../../data/mockData";
import { loadState, saveState } from "../persist";

const initialState = {
  byId: loadState("journeys", {}),
  lastJourneyId: loadState("lastJourneyId", null)
};

const journeySlice = createSlice({
  name: "journey",
  initialState,
  reducers: {
    createJourney: {
      reducer(state, action) {
        const journey = action.payload;
        state.byId[journey.id] = journey;
        state.lastJourneyId = journey.id;
        saveState("journeys", state.byId);
        saveState("lastJourneyId", state.lastJourneyId);
      },
      prepare(fields) {
        const journey = { ...fields, id: rid("J"), createdAt: new Date().toISOString() };
        return { payload: journey };
      }
    }
  }
});

export const { createJourney } = journeySlice.actions;

export const selectJourney = (id) => (state) => {
  const targetId = id || state.journey.lastJourneyId;
  return targetId ? state.journey.byId[targetId] : null;
};

export default journeySlice.reducer;
