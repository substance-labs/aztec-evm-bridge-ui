import Button from "../../base/Button"
import Modal from "../Modal"
import { ClipboardCopy } from "lucide-react"

import type { ModalProps } from "../Modal"

export interface SecretModalProps extends ModalProps {
  secret: string
  onUnderstand: () => void
}

const SecretModal: React.FC<SecretModalProps> = ({ secret, visible, onClose, onUnderstand }) => {
  return (
    <Modal visible={visible} title={"Attention!"} onClose={onClose}>
      <div className="space-y-4 p-4">
        <p className="text-md text-gray-700">
          This is your secret. <strong>Store it securely</strong>. Without it, you won’t be able to claim your funds on{" "}
          <span className="font-semibold text-purple-600">Aztec</span>.
        </p>

        <div className="relative bg-gray-100 text-gray-800 text-sm p-3 rounded-md border border-gray-300 break-all">
          {secret}

          <button
            onClick={() => navigator.clipboard.writeText(secret)}
            className="absolute top-2 right-2 p-1 rounded hover:bg-gray-200 transition cursor-pointer"
            aria-label="Copy to clipboard"
          >
            <ClipboardCopy size={16} className="text-gray-600" />
          </button>
        </div>

        <Button onClick={() => onUnderstand()}>I understand</Button>
      </div>
    </Modal>
  )
}

export default SecretModal
