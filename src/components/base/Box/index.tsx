import React from "react"
import type { HTMLAttributes, ReactNode } from "react"

type BoxProps = {
  children: ReactNode
  className?: string
} & HTMLAttributes<HTMLDivElement>

const Box: React.FC<BoxProps> = ({ children, className = "", ..._props }) => {
  return (
    <div className={`bg-white border border-gray-200 rounded-xl ${className}`} {..._props}>
      {children}
    </div>
  )
}

export default Box
