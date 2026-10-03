import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  userId: null,
  token: null,
  name: '',
  phone: null,
  gender: null,
  dob: null,
  city: '',
  language: '',
  bio: '',
  avatarUrl: null,
  isPremium: false,
  planId: null,
  hasSpun: false,
  coins: 0,
  freeTrialUsed: false,
  intro9Used: false,
  isLoggedIn: false,
  hasAcceptedWarning: false,
  gifts: []
};

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    setAuthUser: (state, action) => {
      const u = action.payload.user;
      state.token = action.payload.token;
      state.userId = u.id;
      state.name = u.name ?? state.name;
      state.phone = u.phone ?? state.phone;
      state.gender = u.gender ?? state.gender;
      state.bio = u.bio ?? state.bio;
      state.avatarUrl = u.avatar_url ?? state.avatarUrl;
      state.coins = u.coins ?? u.minutes ?? state.coins;
      state.isPremium = u.is_premium ?? false;
      state.planId = u.plan_id ?? null;
      state.freeTrialUsed = !!(u.free_trial_used || u.freeTrialUsed);
      state.intro9Used = !!(u.intro_9_used || u.intro9Used);
      state.isLoggedIn = true;
    },
    setProfile: (state, action) => {
      state.name = action.payload.name ?? state.name;
      state.phone = action.payload.phone ?? state.phone;
      state.gender = action.payload.gender ?? state.gender;
      state.dob = action.payload.dob ?? state.dob;
      state.city = action.payload.city ?? state.city;
      state.language = action.payload.language ?? state.language;
      state.bio = action.payload.bio ?? state.bio;
      state.avatarUrl = action.payload.avatar_url ?? state.avatarUrl;
      if (action.payload.isPremium !== undefined) state.isPremium = !!action.payload.isPremium;
      else if (action.payload.is_premium !== undefined) state.isPremium = !!action.payload.is_premium;
      if (action.payload.planId !== undefined) state.planId = action.payload.planId;
      else if (action.payload.plan_id !== undefined) state.planId = action.payload.plan_id;
      if (action.payload.hasSpun !== undefined) state.hasSpun = action.payload.hasSpun;
      if (action.payload.free_trial_used !== undefined) state.freeTrialUsed = !!action.payload.free_trial_used;
      else if (action.payload.freeTrialUsed !== undefined) state.freeTrialUsed = !!action.payload.freeTrialUsed;
      if (action.payload.intro_9_used !== undefined) state.intro9Used = !!action.payload.intro_9_used;
      else if (action.payload.intro9Used !== undefined) state.intro9Used = !!action.payload.intro9Used;
      if (action.payload.coins !== undefined) state.coins = action.payload.coins;
      else if (action.payload.minutes !== undefined) state.coins = action.payload.minutes;
    },
    setLoggedIn: (state, action) => {
      state.isLoggedIn = action.payload;
    },
    acceptWarning: (state) => {
      state.hasAcceptedWarning = true;
    },
    setCoins: (state, action) => {
      state.coins = action.payload;
    },
    addCoins: (state, action) => {
      state.coins += action.payload;
    },
    deductCoins: (state, action) => {
      state.coins = Math.max(0, state.coins - action.payload);
    },
    addGift: (state, action) => {
      state.gifts.push({
        ...action.payload,
        id: Date.now().toString(),
        status: 'pending',
        wonAt: Date.now()
      });
    },
    redeemGift: (state, action) => {
      const gift = state.gifts.find((g) => g.id === action.payload.id);
      if (!gift || gift.status !== 'pending') return;
      gift.status = action.payload.action === 'redeem' ? 'redeemed' : 'gifted';
      if (action.payload.action === 'redeem' && gift.type === 'coins') {
        state.coins += gift.value;
      }
    },
    setFreeTrialUsed: (state) => { state.freeTrialUsed = true; },
    setIntro9Used: (state) => { state.intro9Used = true; },
    resetUser: () => initialState,
  }
});

export const { setAuthUser, setProfile, setLoggedIn, acceptWarning, setCoins, addCoins, deductCoins, addGift, redeemGift, setFreeTrialUsed, setIntro9Used, resetUser } = userSlice.actions;
export default userSlice.reducer;