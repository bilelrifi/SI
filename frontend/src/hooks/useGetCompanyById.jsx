import { setSingleCompany } from "@/redux/companySlice"
import { COMPANY_API_END_POINT } from "@/utils/constant"
import axios from "axios"
import { useEffect } from "react"
import { useDispatch } from "react-redux"


const useGetComapanyById = ({companyId}) => {
  const dispatch = useDispatch();
 useEffect(()=>{
  const fetchSingleCompany = async () =>{
    try {
      const res = await axios.get(`${COMPANY_API_END_POINT}/get/${companyId}`,{
        withCredentials:true
      })
      if(res.data.success){
        dispatch(setSingleCompany(res.data.company))
        // console.log(res.data.company);
        // console.log(res.data);
      }
    } catch (error) {
      console.log(error);
    }
  }
  fetchSingleCompany();
 },[companyId, dispatch])
}

export default useGetComapanyById;
