import Navbar from "../shared/Navbar";
import { Label } from "@radix-ui/react-label";
import { Input } from "../ui/input";
import { RadioGroup } from "@/components/ui/radio-group";
import { Button } from "../ui/button";
import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import axios from "axios";
import { USER_API_END_POINT } from "@/utils/constant";
import { toast } from "sonner";
import { useDispatch, useSelector } from "react-redux";
import { setLoading } from "@/redux/authSlice";
import { Loader2 } from "lucide-react";



const Signup = () => {
  const [input, setInput] = useState({
     fullname:"",
     email:"",
     phoneNumber:"",
     password:"",
     role:"",
     file:"",
    });
    const { loading, user } = useSelector((store) => store.auth);
    const dispatch = useDispatch();
    const navigate = useNavigate();

    const onChangeEventHandler = (e)=>{
      setInput({...input, [e.target.name]:e.target.value})
    }

    const ChangeFileHandler = (e) =>{
      setInput({...input, file:e.target.files?.[0]})
    }

    const handleSubmit = async(e) =>{
      e.preventDefault();
      // console.log(input);
      const formData = new FormData();
      formData.append("fullname", input.fullname);
      formData.append("email", input.email);
      formData.append("phoneNumber", input.phoneNumber);
      formData.append("password", input.password);
      formData.append("role",input.role);
      if(input.file){
        formData.append("file", input.file);
      }
      try {
        dispatch(setLoading(true));
        const res = await axios.post(`${USER_API_END_POINT}/register`,formData, {
          headers:{
            'Content-Type':'multipart/form-data' 
            // because sending form data thats why i use 'multipart/form-data' 
          },
          withCredentials:true,
        });
        if(res.data.success){
          navigate('/login');
          toast.success(res.data.message);
        }
      } catch (error) {
        console.log(error)
        toast.error(error.response.data.message);
      } finally {
        dispatch(setLoading(false));
      }
    }

     useEffect(() =>{
        if(user){
          navigate('/')
        }
      },[])
     
  return (
    <div>
      <Navbar />
      <div className="flex items-center justify-center max-w-7xl mx-auto">
        <form
          onSubmit={handleSubmit}
          className="w-1/2 border border-gray-200 rounded-md p-4 my-10"
        >
          <h1 className="font-bold text-xl mb-5">Sign Up</h1>
          <div className="my-2">
            <Label>Full Name</Label>
            <Input type="text" name="fullname" value={input.fullname} onChange={onChangeEventHandler} placeholder="udgeet..." />
          </div>
          <div className="my-2">
            <Label>Email</Label>
            <Input type="email" name="email" value={input.email}  onChange={onChangeEventHandler} placeholder="udgeetbhatt271@gmail.com" />
          </div>
          <div className="my-2">
            <Label>Phone Number</Label>
            <Input type="number" name="phoneNumber" value={input.phoneNumber} onChange={onChangeEventHandler} placeholder="enter your phone no." />
          </div>
          <div className="my-2">
            <Label>Password</Label>
            <Input type="password" name="password" value={input.password} onChange={onChangeEventHandler} placeholder="enter your password." />
          </div>
          <div className="flex items-center justify-between">
            <RadioGroup className="flex items-center gap-4 my-5">
              <div className="flex items-center space-x-2">
             <Input type="radio" name="role" value="student" checked={input.role==="student"}  onChange={onChangeEventHandler} className="cursor-pointer"/>
                <Label htmlFor="option-one">Student</Label>
              </div>
              <div className="flex items-center space-x-2">
              <Input type="radio" name="role" value="recruiter" checked={input.role==="recruiter"} onChange={onChangeEventHandler} className="cursor-pointer"/>
                <Label htmlFor="option-two">Recruiter</Label>
              </div>
            </RadioGroup>
            <div className="flex items-center gap-4">
              <Label>Profile</Label>
              <Input accept="image/*"  type="file" onChange={ChangeFileHandler} className="cursor-pointer"/>
            </div>
          </div>
          {loading ? (
            <Button className="w-full my-4">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Please wait{" "}
            </Button>
          ) : (  
          <Button type="submit"className="w-full my-4">Signup</Button>
          )}
          <span className="text-sm">Already have an account? <Link to='/login' className="text-blue-600">Login</Link></span>
        </form>
      </div>
    </div>
  );
};

export default Signup;
