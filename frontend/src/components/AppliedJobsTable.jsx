import { useSelector } from "react-redux"
import { Badge } from "./ui/badge"
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "./ui/table"



const AppliedJobsTable = () => {
  const {allAppliedjobs} = useSelector(store=>store.job);
  return (
    <div>
      <Table>
        <TableCaption>A list of your applied jobs</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Job Role</TableHead>
            <TableHead>Company</TableHead>
            <TableHead className='text-right'>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {
            allAppliedjobs.length <= 0 ? <span>You haven&apos;t applied any job yet.</span> :
            allAppliedjobs.map((appliedJob) =>(
              <TableRow key={appliedJob?._id}>
                <TableCell>{appliedJob?.createdAt?.split("T")[0]}</TableCell>
                <TableCell>{appliedJob?.job.title}</TableCell>
                <TableCell>{appliedJob?.job?.company}</TableCell>
                <TableCell className="text-right"><Badge className={`${appliedJob.status === "rejected" ? 'bg-red-400' : appliedJob.status === 'pending' ? 'bg-gray-400' : 'bg-green-400'}`}>{appliedJob?.status.toUpperCase()}</Badge></TableCell>
              </TableRow>
            ))
          }
        </TableBody>
      </Table>
    </div>
  )
}

export default AppliedJobsTable;
