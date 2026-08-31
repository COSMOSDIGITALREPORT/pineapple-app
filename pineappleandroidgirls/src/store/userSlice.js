import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  name: '',
  gender: null,
  coins: 24500,
  safetyAccepted: false
};

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    setName: (state, action) => {
      state.name = action.payload;
    },
    setGender: (state, action) => {
      state.gender = action.payload;
    },
    acceptSafety: (state) => {
      state.safetyAccepted = true;
    },
    addCoins: (state, action) => {
      state.coins += action.payload;
    }
  }
});

export const { setName, setGender, acceptSafety, addCoins } = userSlice.actions;
export default userSlice.reducer;