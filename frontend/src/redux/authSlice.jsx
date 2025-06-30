import { createSlice } from "@reduxjs/toolkit";


const authSlice = createSlice({
  name:"auth",
  initialState:{
    loading: false,
    user:null
  },
  reducers:{
    //action means functions
    setLoading:(state,action) =>{
      state.loading = action.payload;
    },
    setUser:(state, action)=>{
      state.user = action.payload
    }
  }
});

export const {setLoading,setUser,user} = authSlice.actions;
export default authSlice.reducer;