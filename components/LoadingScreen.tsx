import React from "react";
import { Globe } from "lucide-react";

interface LoadingScreenProps {
  message?: string;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({ message = "Loading..." }) => {
  return (
    <div className="flex-1 flex flex-col justify-center items-center min-h-[400px] w-full bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 relative overflow-hidden transition-all duration-300">
      {/* Dynamic Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-[#168BB0]/10 dark:bg-[#45B0D2]/5 rounded-full blur-3xl pointer-events-none animate-pulse"></div>

      {/* Spinner Container */}
      <div className="relative z-10 flex flex-col items-center gap-4">
        <div className="relative flex items-center justify-center">
          {/* Inner Spinning Globe Logo */}
          <div className="absolute text-[#168BB0] dark:text-[#45B0D2]">
            <Globe className="h-8 w-8 animate-[spin_4s_linear_infinite]" />
          </div>
          {/* Outer glowing spinner ring */}
          <div className="w-16 h-16 rounded-full border-2 border-[#168BB0]/10 border-t-[#168BB0] dark:border-[#45B0D2]/10 dark:border-t-[#45B0D2] animate-spin"></div>
        </div>

        {/* Brand Name & Message */}
        <div className="text-center space-y-1.5 animate-pulse duration-1000">
          <div className="text-xs font-bold uppercase tracking-widest text-[#168BB0] dark:text-[#45B0D2]">
            BoostBuddy
          </div>
          <p className="text-sm font-semibold text-zinc-500 dark:text-zinc-400">
            {message}
          </p>
        </div>
      </div>
    </div>
  );
};
