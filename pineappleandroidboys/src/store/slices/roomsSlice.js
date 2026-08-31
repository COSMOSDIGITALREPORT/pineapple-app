import { createSlice } from '@reduxjs/toolkit';

const roomsSlice = createSlice({
  name: 'rooms',
  initialState: {
    list: [],
    loading: false,
  },
  reducers: {
    setRooms: (state, action) => {
      state.list = action.payload;
      state.loading = false;
    },
    addRoom: (state, action) => {
      state.list.unshift(action.payload);
    },
    removeRoom: (state, action) => {
      state.list = state.list.filter((r) => r.id !== action.payload);
    },
    setRoomsLoading: (state, action) => {
      state.loading = action.payload;
    },
  },
});

export const { setRooms, addRoom, removeRoom, setRoomsLoading } = roomsSlice.actions;
export default roomsSlice.reducer;
