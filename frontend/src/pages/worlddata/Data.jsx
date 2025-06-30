/* eslint-disable no-unused-vars */
import axios from "axios";
import { useEffect, useRef, useState } from "react";

const Data = () => {

  const [arr, setArr] = useState([]);
  let cityRef = useRef();
  let stateRef = useRef();
  let countryRef = useRef();

  const handleSubmit = async (e) => {
    // Prevent page reload on form submit
    e.preventDefault();

    // Prepare the object to be sent
    const obj = {
      city: cityRef.current.value,
      state: stateRef.current.value,
      country: countryRef.current.value,
    };

    // Send POST request to add data
    let res = await axios.post(`http://localhost:3000/api/v1/master/add`, obj);

    // Optionally handle response (e.g., reset form, show success message, etc.)
    cityRef.current.value = "";
    stateRef.current.value = "";
    countryRef.current.value = "";

    getData(); // Re-fetch the data after submission
  };

  const getData = async () => {
    // Fetch data from the API
    let res = await axios.get(`http://localhost:3000/api/v1/master/get`);
    let data = res.data;
    console.log(data);
    setArr(data.expenses); // Update the state with the fetched data
  };



  useEffect(() => {
    getData(); // Fetch data when the component mounts
  }, []);

  return (
    <div>
      <div className="text-center text-blue-600 text-2xl font-bold">
        <h1>Master Data</h1>
      </div>

      <form
        action=""
        className="bg-black my-3 p-5 flex justify-center gap-2 w-max m-auto rounded-md"
      >
        <input
          ref={cityRef}
          className="py-1 px-7 "
          type="text"
          placeholder="Enter city"
        />
        <input
          ref={stateRef}
          className="py-1 px-7 "
          type="text"
          placeholder="Enter state"
        />
        <input
          ref={countryRef}
          className="py-1 px-7 "
          type="text"
          placeholder="Enter country"
        />
        <button
          onClick={handleSubmit}
          className="bg-blue-500 py-1 px-7 rounded-md"
        >
          Add Data
        </button>
      </form>

      {/* Displaying the table of data */}
      <div className="relative overflow-x-auto">
        <table className="w-full text-sm text-center rtl:text-right text-gray-500 dark:text-gray-400">
          <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
            <tr>
              <th scope="col" className="px-6 py-3">
                City
              </th>
              <th scope="col" className="px-6 py-3">
                State
              </th>
              <th scope="col" className="px-6 py-3">
                Country
              </th>
            </tr>
          </thead>
          <tbody>
            {/* Map through the arr state to display each entry */}
            {arr.map((entry, index) => (
              <tr key={index} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700">
                <td className="px-6 py-3">{entry.city}</td>
                <td className="px-6 py-3">{entry.state}</td>
                <td className="px-6 py-3">{entry.country}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Data;
