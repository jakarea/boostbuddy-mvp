"use client";

import React from "react";

interface LoadingScreenProps {
  message?: string;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({ message = "Loading..." }) => {
  return (
    <div className="fixed inset-0 flex items-center justify-center w-screen h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 z-50">
      {/* 9-Cube Loading Animation */}
      <div className="bb-loading">
        <span></span>
        <span></span>
        <span></span>
        <span></span>
        <span className="bb-center"></span>
        <span></span>
        <span></span>
        <span></span>
        <span></span>
      </div>
    </div>
  );
};
