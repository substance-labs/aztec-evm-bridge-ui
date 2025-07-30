import { createBrowserRouter, RouterProvider } from "react-router"
import { ToastContainer } from "react-toastify"
import { WagmiProvider } from "wagmi"
import { baseSepolia, type AppKitNetwork } from "@reown/appkit/networks"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { WagmiAdapter } from "@reown/appkit-adapter-wagmi"
import { createAppKit } from "@reown/appkit/react"

import { AztecWalletProvider } from "./contexts/AztecWalletContext"
import Swap from "./components/pages/Swap"

const queryClient = new QueryClient()
const projectId = process.env.REOWN_PROJECT_ID
const metadata = {
  name: "Aztec <> EVM bridge",
  description: "Aztec <> EVM bridge Dapp",
  url: window.location.origin, // origin must match your domain & subdomain
  icons: ["https://avatars.githubusercontent.com/u/179229932"],
}

const networks = [baseSepolia] as [AppKitNetwork, ...AppKitNetwork[]]
const wagmiAdapter = new WagmiAdapter({
  networks,
  projectId,
  ssr: true,
})

createAppKit({
  adapters: [wagmiAdapter],
  networks,
  projectId,
  metadata,
})

const router = createBrowserRouter([
  {
    path: "/",
    element: <Swap />,
  },
])

const App = () => {
  return (
    <WagmiProvider config={wagmiAdapter.wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <AztecWalletProvider>
          <RouterProvider router={router} />
          <ToastContainer
            position="bottom-right"
            hideProgressBar={false}
            newestOnTop={true}
            closeOnClick
            rtl={false}
            pauseOnFocusLoss
            draggable
            pauseOnHover
            toastClassName="bg-gray-900 text-white rounded-lg shadow-lg p-4 mb-4"
          />
        </AztecWalletProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}

export default App
