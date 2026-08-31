import { configureStore } from '@reduxjs/toolkit';
import userReducer from './slices/userSlice';
import roomsReducer from './slices/roomsSlice';

export const store = configureStore({
  reducer: {
    user: userReducer,
    rooms: roomsReducer,
  },
});