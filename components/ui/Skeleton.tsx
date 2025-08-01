import React from 'react';

interface SkeletonProps {
  className?: string;
  width?: string | number;
  height?: string | number;
  rounded?: boolean;
}

const Skeleton: React.FC<SkeletonProps> = ({ 
  className = '', 
  width, 
  height, 
  rounded = false 
}) => {
  const style: React.CSSProperties = {};
  if (width) style.width = typeof width === 'number' ? `${width}px` : width;
  if (height) style.height = typeof height === 'number' ? `${height}px` : height;

  return (
    <div 
      className={`animate-pulse bg-slate-200 dark:bg-slate-700 ${rounded ? 'rounded-full' : 'rounded'} ${className}`}
      style={style}
    />
  );
};

// Predefined skeleton components
export const SkeletonCard: React.FC = () => (
  <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-4">
    <Skeleton height={20} className="mb-3" width="60%" />
    <Skeleton height={16} className="mb-2" />
    <Skeleton height={16} className="mb-2" width="80%" />
    <Skeleton height={16} width="40%" />
  </div>
);

export const SkeletonTable: React.FC<{ rows?: number; cols?: number }> = ({ rows = 5, cols = 4 }) => (
  <div className="overflow-x-auto">
    <table className="w-full">
      <thead>
        <tr className="bg-slate-50 dark:bg-slate-700">
          {Array.from({ length: cols }).map((_, i) => (
            <th key={i} className="p-2">
              <Skeleton height={16} />
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <tr key={rowIndex} className="border-b dark:border-slate-700">
            {Array.from({ length: cols }).map((_, colIndex) => (
              <td key={colIndex} className="p-2">
                <Skeleton height={14} width={colIndex === 0 ? "80%" : "60%"} />
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

export const SkeletonList: React.FC<{ items?: number }> = ({ items = 5 }) => (
  <div className="space-y-3">
    {Array.from({ length: items }).map((_, i) => (
      <div key={i} className="flex items-center space-x-3">
        <Skeleton width={40} height={40} rounded />
        <div className="flex-1">
          <Skeleton height={16} className="mb-2" width="70%" />
          <Skeleton height={14} width="40%" />
        </div>
      </div>
    ))}
  </div>
);

export default Skeleton;