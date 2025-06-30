import FilterCard from "@/components/FilterCard"
import Job from "@/components/Job"
import Navbar from "@/components/shared/Navbar"
import { useEffect, useState } from "react"
import { useSelector } from "react-redux"
import { motion } from "framer-motion"



const Jobs = () => {
  const {allJobs, searchQuery} = useSelector(store=>store.job);
  const [filterJobs, setFilteredJobs] = useState(allJobs);

  useEffect(() =>{
    if(searchQuery){
      const filteredJobs = allJobs.filter((job)=>{
        return job.title.toLowerCase().includes(searchQuery.toLowerCase())||
        job.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        job.location.toLowerCase().includes(searchQuery.toLowerCase()) 
      })
      setFilteredJobs(filteredJobs);
    }else{
      setFilteredJobs(allJobs)
    }
  },[allJobs,searchQuery])

  return (
    <div>
      <Navbar />
      {/* { Filter Page } */}
      <div className="max-w-7xl mx-auto mt-5">
        <div className="flex gap-5">
          <div className="w-20%">
            <FilterCard />
          </div>

          {/* Job Card */}
          {
            filterJobs.length <= 0 ? <span>Job not found</span> :
            (
              <div className="flex-1 h-[88vh] overflow-y-auto pb-5">
                <div className="grid grid-cols-3 gap-4">
                  {
                    allJobs.map((job) => (
                      <motion.div
                      initial={{opacity:0, x:100}}
                      animate={{opacity:1, x:0}}
                      exit={{opacity:0,x:-100}}
                      transition={{duration:0.3}}
                      key={job?._id} >
                        <Job job={job}/>
                      </motion.div>                      
                    ))
                  }
                </div>
              </div>
            )
          }
        </div>
      </div>
    </div>
  )
}

export default Jobs;
