interface LoadingSkeletonProps {
  className?: string
  variant?: 'card' | 'text' | 'circle' | 'rectangle'
}

export const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({ 
  className = '', 
  variant = 'rectangle' 
}) => {
  const baseClasses = 'animate-pulse bg-gradient-to-r from-slate-200 via-slate-300 to-slate-200 bg-[length:200%_100%]'
  
  const variantClasses = {
    card: 'rounded-xl h-32',
    text: 'rounded h-4',
    circle: 'rounded-full',
    rectangle: 'rounded-lg',
  }

  return (
    <div className={`${baseClasses} ${variantClasses[variant]} ${className}`} />
  )
}

export const DashboardCardSkeleton: React.FC = () => {
  return (
    <div className="bg-white rounded-xl shadow-lg p-6 border border-slate-200 space-y-3">
      <LoadingSkeleton variant="text" className="w-1/2" />
      <LoadingSkeleton variant="text" className="h-10 w-3/4" />
    </div>
  )
}

export const AlertCardSkeleton: React.FC = () => {
  return (
    <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
      <LoadingSkeleton variant="text" className="w-3/4" />
      <LoadingSkeleton variant="text" className="w-1/2 h-3" />
    </div>
  )
}