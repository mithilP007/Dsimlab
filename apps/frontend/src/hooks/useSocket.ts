import { useEffect, useRef } from "react"
import { io, Socket } from "socket.io-client"
import { config } from "@/lib/config"
import { useSimulationStore } from "@/stores/simulationStore"
import { toast } from "sonner"

// Module-level singleton so we only create one connection across all components
let socketSingleton: Socket | null = null

function getSocket(): Socket {
  if (!socketSingleton) {
    socketSingleton = io(config.socketUrl, {
      withCredentials: true,
      transports: ["websocket", "polling"],
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    })
  }
  return socketSingleton
}

/**
 * useSocket – connects to the backend Socket.io server and wires up all real-time
 * events relevant to the current user's simulation session.
 *
 * Call this once in the simulation layout/shell component.
 *
 * @param simulationId - The active simulation state ID from the backend (uuid)
 */
export function useSocket(simulationId?: string) {
  const socketRef = useRef<Socket | null>(null)
  const setStatus = useSimulationStore((s) => s.setStatus)

  useEffect(() => {
    const socket = getSocket()
    socketRef.current = socket

    const handleConnect = () => {
      console.info("[Socket] Connected to DM SimLab real-time server.")
      // Join the user's simulation room so we only receive events for our session
      if (simulationId) {
        socket.emit("join:simulation", { simulationId })
      }
    }

    const handleDisconnect = (reason: string) => {
      console.warn("[Socket] Disconnected:", reason)
    }

    const handleRoundComplete = (data: {
      simulationId: string
      round: number
      status: string
    }) => {
      console.info("[Socket] round:complete received", data)
      // Update the simulation store status based on backend state machine
      const backendStatus = (data.status as string).toUpperCase()
      if (backendStatus === "RESULTS_READY" || backendStatus === "SCORE_LOCKED") {
        setStatus("results-ready")
        toast.success(`Round ${data.round} complete! Your results are ready.`)
      } else if (backendStatus === "DECISION_OPEN") {
        setStatus("decision-open")
        toast.info(`Round ${data.round} processed. Submit decisions for the next round.`)
      } else if (backendStatus === "COMPLETED") {
        setStatus("completed")
        toast.success("Simulation complete! All rounds have been processed.")
      }
    }

    const handleSimulationError = (data: { message: string }) => {
      console.error("[Socket] simulation:error", data)
      toast.error(data.message || "A simulation error occurred.")
    }

    socket.on("connect", handleConnect)
    socket.on("disconnect", handleDisconnect)
    socket.on("round:complete", handleRoundComplete)
    socket.on("simulation:error", handleSimulationError)

    // If socket is already connected, join the room immediately
    if (socket.connected && simulationId) {
      socket.emit("join:simulation", { simulationId })
    }

    return () => {
      socket.off("connect", handleConnect)
      socket.off("disconnect", handleDisconnect)
      socket.off("round:complete", handleRoundComplete)
      socket.off("simulation:error", handleSimulationError)
    }
  }, [simulationId, setStatus])

  return socketRef.current
}

/**
 * disconnectSocket – call this on logout to clean up the socket singleton.
 */
export function disconnectSocket() {
  if (socketSingleton) {
    socketSingleton.disconnect()
    socketSingleton = null
  }
}
