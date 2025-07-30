import React from "react"

import type { ButtonHTMLAttributes } from "react"

type ToggleProps = {
  active: boolean
  onChange: (newValue: boolean) => void
  className?: string
} & ButtonHTMLAttributes<HTMLButtonElement>

const Toggle: React.FC<ToggleProps> = ({ active, onChange, className = "", ...props }) => {
  return (
    <button
      onClick={() => onChange(!active)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-300 cursor-pointer bg-gray-300 disabled:cursor-not-allowed disabled:opacity-50  ${
        active ? "bg-green-500" : "bg-gray-300"
      } ${className}`}
      {...props}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white transition duration-300 ${
          active ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  )
}

export default Toggle
