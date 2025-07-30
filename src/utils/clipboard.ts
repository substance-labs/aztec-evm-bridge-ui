import { toast } from "react-toastify"

export const copyToClipboard = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text)
    toast.success("Copied to clipboard!", { position: "bottom-right" })
  } catch {
    toast.error("Failed to copy!")
  }
}
