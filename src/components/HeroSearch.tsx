"use client";

import { Dispatch, SetStateAction } from "react";

export interface PlaceholdersAndVanishInputProps {
  search: string;
  setSearch: Dispatch<SetStateAction<string>>;
}

export function HeroSearch({
  search,
  setSearch,
}: PlaceholdersAndVanishInputProps) {
  return (
    <input
      type="text"
      value={search}
      onChange={(e) => setSearch(e.target.value)}
      placeholder="Type your destination..."
      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
    />
  );
}
