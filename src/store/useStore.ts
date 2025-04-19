import { create } from "zustand";


interface Store {

    query: string,
    setquery: (query: string | undefined) => void;
}

export const Store = create<Store>((set) => ({
    query: "",
    setquery: (i) => set({ query: i }),
}));
