import React from "react"

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode
}

const hasClassWithPrefix = (className: string, prefix: string) =>
  className.split(/\s+/).some((cls) => cls.startsWith(prefix))

const Button: React.FC<ButtonProps> = ({ children, className = "", ...props }) => {
  const hasBg = hasClassWithPrefix(className, "bg-")
  const hasHeight = hasClassWithPrefix(className, "h-")
  const hasWidth = hasClassWithPrefix(className, "w-")
  const defaultBg = hasBg ? "" : "bg-purple-200 text-purple-600 hover:bg-purple-300 active:bg-purple-400"
  const defaultHeight = hasHeight ? "" : "h-14"
  const defaultWidth = hasWidth ? "" : "w-full"
  const interactionStates = props.disabled ? "opacity-50 cursor-not-allowed" : "hover:opacity-80 active:opacity-100"
  return (
    <button
      {...props}
      className={`
        inline-flex items-center justify-center
        rounded-xl font-semibold text-lg
        px-3
        transition-colors duration-150
        ${defaultBg}
        ${defaultHeight}
        ${defaultWidth}
        ${interactionStates}
        ${className}
        cursor-pointer
      `}
    >
      {children}
    </button>
  )
}

export default Button
