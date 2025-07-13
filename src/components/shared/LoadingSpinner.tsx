/**
 * Loading Spinner Component
 * 
 * Reusable loading spinner with Activity icon animation.
 * Used for loading states across the application.
 * 
 * @author Syro Frontend Team
 * @version 1.0.0
 */

import React from "react";
import { Activity } from "lucide-react";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  showText?: boolean;
  text?: string;
  subText?: string;
}

/**
 * LoadingSpinner Component
 * 
 * @param size - Size of the spinner (sm: 32px, md: 64px, lg: 96px)
 * @param showText - Whether to show loading text
 * @param text - Main loading text
 * @param subText - Secondary loading text
 */
const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  size = "md", 
  showText = false, 
  text = "Cargando...", 
  subText 
}) => {
  const sizeMap = {
    sm: 32,
    md: 64,
    lg: 96
  };

  const iconSize = sizeMap[size];

  return (
    <div className="flex items-center justify-center h-full w-full">
      <div className="flex flex-col items-center space-y-6">
        {/* Activity Monitor Spinner */}
        <div className="relative">
          <Activity 
            size={iconSize} 
            className="text-blue-600 animate-pulse" 
          />
        </div>
        
        {/* Loading Text (optional) */}
        {showText && (
          <div className="text-center">
            <span className="text-lg text-blue-600 font-medium">{text}</span>
            {subText && (
              <div className="text-sm text-gray-500 mt-1">{subText}</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default LoadingSpinner; 