import React from 'react';

interface AppLogoProps {
  className?: string;
  size?: number;
  showText?: boolean;
  layout?: 'horizontal' | 'vertical';
}

const leftLeaves = [
  // Outward leaves
  { x: 350, y: 460, angle: -55, scale: 0.8 },
  { x: 310, y: 410, angle: -40, scale: 0.9 },
  { x: 290, y: 350, angle: -20, scale: 1.0 },
  { x: 295, y: 290, angle: 0, scale: 1.0 },
  { x: 320, y: 230, angle: 25, scale: 0.9 },
  { x: 360, y: 180, angle: 50, scale: 0.8 },
  // Inward leaves
  { x: 380, y: 420, angle: -15, scale: 0.75 },
  { x: 350, y: 365, angle: 10, scale: 0.85 },
  { x: 340, y: 305, angle: 30, scale: 0.9 },
  { x: 350, y: 245, angle: 50, scale: 0.85 },
  { x: 380, y: 195, angle: 70, scale: 0.75 },
];

const leafPath = "M 0,0 C -8,-15 -12,-30 0,-45 C 12,-30 8,-15 0,0 Z";

export default function AppLogo({ className, size = 40, showText = false, layout = 'horizontal' }: AppLogoProps) {
  return (
    <div className={`flex ${layout === 'horizontal' ? 'flex-row items-center gap-1.5' : 'flex-col items-center gap-1'} ${className}`}>
      <svg 
        width={size} 
        height={size} 
        viewBox="0 0 1024 1024" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0"
      >
        {/* Background rounded square */}
        <rect width="1024" height="1024" rx="200" fill="#003B73" />
        
        {/* Left Laurel Wreath Stem */}
        <path d="M 370,480 C 315,480 275,395 292,260" stroke="white" strokeWidth="12" strokeLinecap="round" fill="none" opacity="0.6" />
        
        {/* Right Laurel Wreath Stem */}
        <path d="M 654,480 C 709,480 749,395 732,260" stroke="white" strokeWidth="12" strokeLinecap="round" fill="none" opacity="0.6" />

        {/* Left Leaves */}
        {leftLeaves.map((leaf, index) => (
          <path
            key={`left-leaf-${index}`}
            d={leafPath}
            fill="white"
            transform={`translate(${leaf.x}, ${leaf.y}) rotate(${leaf.angle}) scale(${leaf.scale * 1.15})`}
          />
        ))}

        {/* Right Leaves (Mirrored dynamically) */}
        {leftLeaves.map((leaf, index) => (
          <path
            key={`right-leaf-${index}`}
            d={leafPath}
            fill="white"
            transform={`translate(${1024 - leaf.x}, ${leaf.y}) rotate(${-leaf.angle}) scale(${leaf.scale * 1.15})`}
          />
        ))}
        
        {/* Open Book Outer Cover Page */}
        <path d="M 512,800 C 420,770 320,720 180,760 L 275,525 C 370,490 460,535 512,595 Z" stroke="white" strokeWidth="18" strokeLinejoin="round" fill="none" />
        <path d="M 512,800 C 604,770 704,720 844,760 L 749,525 C 654,490 564,535 512,595 Z" stroke="white" strokeWidth="18" strokeLinejoin="round" fill="none" />
        
        {/* Open Book Inner Page 1 */}
        <path d="M 512,750 C 425,723 325,668 215,713 L 295,502 C 380,468 465,510 512,565 Z" stroke="white" strokeWidth="18" strokeLinejoin="round" fill="none" />
        <path d="M 512,750 C 599,723 699,668 829,713 L 729,502 C 644,468 559,510 512,565 Z" stroke="white" strokeWidth="18" strokeLinejoin="round" fill="none" />

        {/* Open Book Central Spine */}
        <path d="M 512,565 L 512,800" stroke="white" strokeWidth="18" strokeLinecap="round" />

        {/* Center Vertical-Stem of K */}
        <path d="M 385,325 L 385,575 H 420 L 420,325 Z" stroke="white" strokeWidth="18" strokeLinejoin="miter" fill="none" />
        {/* Upper arm of K */}
        <path d="M 420,435 L 590,310 H 635 L 420,470" stroke="white" strokeWidth="18" strokeLinejoin="miter" fill="none" />
        {/* Lower arm of K */}
        <path d="M 430,470 L 600,605 H 645 L 470,500" stroke="white" strokeWidth="18" strokeLinejoin="miter" fill="none" />
      </svg>

      {showText && (
        <div className={`flex flex-col ${layout === 'horizontal' ? 'items-start' : 'items-center'} leading-none`}>
          <div className="flex items-center gap-1">
            <span className={`${layout === 'horizontal' ? 'text-[11px]' : 'text-2xl'} font-black text-[#FFB200] tracking-tight uppercase`}>KK Sir</span>
            <span className={`${layout === 'horizontal' ? 'text-[11px]' : 'text-2xl'} font-black text-[#00215E] dark:text-blue-400 tracking-tight uppercase`}>BPT</span>
          </div>
          {layout === 'vertical' && (
            <span className="text-[10px] font-medium text-neutral-600 mt-0.5">Your Study. Your Success.</span>
          )}
          <span className={`${layout === 'horizontal' ? 'text-[6px]' : 'text-[8px]'} font-bold text-neutral-500 uppercase tracking-widest mt-0.5`}>Study • Learn • Grow</span>
        </div>
      )}
    </div>
  );
}
