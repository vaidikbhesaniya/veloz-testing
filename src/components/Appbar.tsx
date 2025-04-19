"use client";

import { useState } from "react";
import { useClerk, useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { Store } from "@/store/useStore";



import {
  BellDotIcon,
  CompassIcon,
  LogOutIcon,
  PlusCircleIcon,
  SearchIcon,
  SettingsIcon,
  SparklesIcon,
  User2Icon,
  UserIcon,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { AnimatePresence, motion } from "framer-motion";

export default function Appbar() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const router = useRouter();
  const store = Store()
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearch = () => {
    if (!searchQuery.trim()) return toast.warning("Enter a location");
    router.push(`/destinations?place=${encodeURIComponent(searchQuery.trim())}`);
    setShowSearch(false);
  };

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <Image src="/logo.png" alt="Logo" width={32} height={32} className="rounded-xl" />
            <span className="font-semibold text-lg hidden sm:inline">veloz</span>
          </Link>

          {/* Center Nav */}
          <nav className="flex gap-2 sm:gap-4">
            <Button
              variant="ghost"
              className="flex items-center gap-1 text-sm"
              onClick={() => setShowSearch((prev) => !prev)}
            >
              <SearchIcon className="h-5 w-5" />
              <span className="hidden sm:inline">Search</span>
            </Button>
            <Button
              variant="ghost"
              onClick={() => router.push("/new")}
              className="flex items-center gap-1 text-sm"
            >
              <PlusCircleIcon className="h-5 w-5" />
              <span className="hidden sm:inline">New Tour</span>
            </Button>
            <Button
              variant="ghost"
              onClick={() => router.push("/destinations")}
              className="flex items-center gap-1 text-sm"
            >
              <CompassIcon className="h-5 w-5" />
              <span className="hidden sm:inline">Destinations</span>
            </Button>
          </nav>

          {/* Right-side Icons */}
          <div className="flex items-center gap-2">
            <Button variant="ghost" className="p-2 rounded-full">
              <BellDotIcon className="h-5 w-5" />
            </Button>

            {/* User Profile */}
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="h-10 w-10 rounded-full p-0">
                    {user.imageUrl ? (
                      <Image
                        src={user.imageUrl}
                        alt="User"
                        width={40}
                        height={40}
                        className="rounded-full"
                        unoptimized
                      />
                    ) : (
                      <User2Icon className="w-full h-full p-1 bg-purple-200 rounded-full" />
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end">
                  <DropdownMenuLabel>
                    <div>
                      <p className="font-medium text-sm">{user.fullName || user.username}</p>
                      <p className="text-xs text-gray-500">{user.primaryEmailAddress?.emailAddress}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuGroup>
                    <DropdownMenuItem onClick={() => toast.info("Profile page coming soon")}>
                      <UserIcon className="mr-2 h-4 w-4" /> Profile
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => toast.info("Settings coming soon")}>
                      <SettingsIcon className="mr-2 h-4 w-4" /> Settings
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => toast.info("Upgrade to Pro coming soon")}>
                      <SparklesIcon className="mr-2 h-4 w-4" /> Upgrade
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => signOut()}>
                    <LogOutIcon className="mr-2 h-4 w-4" /> Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="h-10 w-10 rounded-full flex items-center justify-center bg-purple-200">
                <User2Icon className="w-6 h-6" />
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Search Bar Overlay */}
      <AnimatePresence>
        {showSearch && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="absolute top-[72px] z-40 w-full flex justify-center"
          >
            <div className="bg-white rounded-xl shadow-lg w-full max-w-2xl mx-4 p-4 flex items-center gap-2">
              <input
                type="text"
                placeholder="Search destination..."
                className="flex-grow border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-400"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              />
              <Button
                onClick={() => {
                  store.setquery(searchQuery); // Save query globally
                  toast.success(`Searching for: ${searchQuery}`);
                  setShowSearch(false);
                  router.push("/destinations"); // Redirect to map page
                }}
              >
                Search
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
