"use client";
import Image from "next/image";

export default function Home() {
  return (
    <>
      <div className="min-h-screen flex flex-col items-center justify-center">
        <div className="text-8xl text-center">What do you want to achieve?</div>

        <div className="flex mt-10 rounded-lg">
          <input
            type="text"
            placeholder="I just moved to Toronto and need to feel settled.."
            className="text-sm lg:text-lg lg:w-200 w-100 px-4 py-3 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-black"
          />

          <button className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
            Go
          </button>
        </div>
      </div>
    </>
  );
}
