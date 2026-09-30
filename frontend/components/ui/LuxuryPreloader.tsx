'use client';

import React from 'react';
import { motion } from 'framer-motion';

interface LuxuryPreloaderProps {
  progress?: number;
  stage?: string;
  subtext?: string;
  size?: 'sm' | 'md' | 'lg' | 'fullscreen';
}

export function LuxuryPreloader({
  progress,
  stage = 'INITIALIZING NEURAL ENGINE',
  subtext,
  size = 'md',
}: LuxuryPreloaderProps) {
  const isFullscreen = size === 'fullscreen';

  const containerClasses = isFullscreen
    ? 'fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/95 backdrop-blur-2xl text-white'
    : 'flex flex-col items-center justify-center p-8 text-white';

  const circleSize = size === 'sm' ? 80 : size === 'lg' || isFullscreen ? 160 : 120;
  const strokeWidth = 1.5;
  const radius = (circleSize - strokeWidth * 6) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset =
    progress !== undefined ? circumference - (progress / 100) * circumference : circumference * 0.35;

  return (
    <div className={containerClasses}>
      {/* Precision Mechanical Gyro Core */}
      <div className="relative flex items-center justify-center" style={{ width: circleSize, height: circleSize }}>
        {/* Outermost Precision Stator Track */}
        <svg
          className="absolute inset-0 block h-full w-full"
          viewBox={`0 0 ${circleSize} ${circleSize}`}
        >
          {/* Background Hairline Track */}
          <circle
            cx={circleSize / 2}
            cy={circleSize / 2}
            r={radius}
            fill="none"
            stroke="#1f1f1f"
            strokeWidth={strokeWidth}
          />
          {/* Tick marks around track */}
          {Array.from({ length: 24 }).map((_, i) => {
            const angle = (i * 360) / 24;
            const isMajor = i % 6 === 0;
            return (
              <line
                key={i}
                x1={circleSize / 2}
                y1={4}
                x2={circleSize / 2}
                y2={isMajor ? 10 : 7}
                stroke={isMajor ? '#ffffff' : '#333333'}
                strokeWidth={isMajor ? 1.5 : 1}
                transform={`rotate(${angle} ${circleSize / 2} ${circleSize / 2})`}
              />
            );
          })}

          {/* Active Dynamic Progress Ring */}
          <motion.circle
            cx={circleSize / 2}
            cy={circleSize / 2}
            r={radius}
            fill="none"
            stroke="#ffffff"
            strokeWidth={strokeWidth + 0.5}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            transform={`rotate(-90 ${circleSize / 2} ${circleSize / 2})`}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          />
        </svg>

        {/* Middle Gyro Ring (Counter Clockwise) */}
        <motion.div
          animate={{ rotate: -360 }}
          transition={{ duration: 16, repeat: Infinity, ease: 'linear' }}
          className="absolute rounded-full border border-dashed border-[#3a3a3a]"
          style={{ width: circleSize * 0.72, height: circleSize * 0.72 }}
        />

        {/* Inner Laser Ring (Clockwise) */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 9, repeat: Infinity, ease: 'linear' }}
          className="absolute rounded-full border border-[#262626]"
          style={{ width: circleSize * 0.48, height: circleSize * 0.48 }}
        >
          {/* Orbiting Laser Point */}
          <div className="absolute -top-1 left-1/2 -translate-x-1/2 h-2 w-2 rounded-full bg-white shadow-[0_0_10px_#ffffff]" />
        </motion.div>

        {/* Center Tachometer Core */}
        <div className="relative z-10 flex flex-col items-center justify-center font-mono">
          {progress !== undefined ? (
            <div className="flex items-baseline">
              <span className="text-xl sm:text-2xl font-normal tracking-tight text-white">
                {Math.round(progress)}
              </span>
              <span className="text-[10px] text-[#999999] ml-0.5">%</span>
            </div>
          ) : (
            <motion.div
              animate={{ scale: [1, 1.25, 1], opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
              className="h-2.5 w-2.5 rounded-full bg-white shadow-[0_0_12px_#ffffff]"
            />
          )}
        </div>
      </div>

      {/* Machined Status Typography */}
      <div className="mt-6 text-center space-y-1.5 max-w-sm">
        <div className="font-mono text-[11px] uppercase tracking-[3px] text-white font-normal">
          {stage}
        </div>
        {subtext && (
          <div className="font-serif text-xs text-[#999999] italic">
            {subtext}
          </div>
        )}
      </div>

      {/* Bottom Minimalist Running Frequency Bar */}
      <div className="mt-4 flex items-center gap-1">
        {Array.from({ length: 5 }).map((_, idx) => (
          <motion.div
            key={idx}
            animate={{
              scaleY: [0.3, 1, 0.3],
              opacity: [0.2, 0.8, 0.2],
            }}
            transition={{
              duration: 1.2,
              repeat: Infinity,
              delay: idx * 0.18,
              ease: 'easeInOut',
            }}
            className="w-0.5 h-3 bg-white"
          />
        ))}
      </div>
    </div>
  );
}
