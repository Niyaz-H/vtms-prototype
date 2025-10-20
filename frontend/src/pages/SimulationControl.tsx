import { useState } from 'react'
import { PlayIcon, PauseIcon, PlusIcon } from '@heroicons/react/24/outline'
import { useWebSocketStore } from '@/stores/websocketStore'

const SimulationControl: React.FC = () => {
  const { systemStats } = useWebSocketStore()
  const [isStarting, setIsStarting] = useState(false)

  const handleStartSimulation = async () => {
    setIsStarting(true)
    try {
      const response = await fetch('/api/simulation/start', { method: 'POST' })
      if (!response.ok) throw new Error('Failed to start simulation')
    } catch (error) {
      console.error('Error starting simulation:', error)
    } finally {
      setIsStarting(false)
    }
  }

  const handleStopSimulation = async () => {
    try {
      const response = await fetch('/api/simulation/stop', { method: 'POST' })
      if (!response.ok) throw new Error('Failed to stop simulation')
    } catch (error) {
      console.error('Error stopping simulation:', error)
    }
  }

  const handleAddVessel = async () => {
    try {
      const response = await fetch('/api/simulation/vessels', { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          count: 1,
          area: {
            north: 40,
            south: 39,
            east: -73,
            west: -74
          }
        })
      })
      if (!response.ok) throw new Error('Failed to add vessel')
    } catch (error) {
      console.error('Error adding vessel:', error)
    }
  }

  const isRunning = systemStats?.simulation?.running || false
  const vesselCount = systemStats?.simulation?.vesselCount || 0

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold text-secondary-900">Simulation Control</h2>

      {/* Status Card */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-secondary-900 mb-2">Simulation Status</h3>
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${isRunning ? 'bg-success' : 'bg-secondary-400'}`} />
              <span className="text-secondary-700 font-medium">
                {isRunning ? 'Running' : 'Stopped'}
              </span>
              <span className="text-secondary-500">
                | {vesselCount} simulated vessels
              </span>
            </div>
          </div>
          
          <div className="flex gap-3">
            {!isRunning ? (
              <button
                onClick={handleStartSimulation}
                disabled={isStarting}
                className="flex items-center gap-2 px-6 py-3 bg-success text-white rounded-md hover:bg-success-dark disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <PlayIcon className="h-5 w-5" />
                {isStarting ? 'Starting...' : 'Start Simulation'}
              </button>
            ) : (
              <button
                onClick={handleStopSimulation}
                className="flex items-center gap-2 px-6 py-3 bg-danger text-white rounded-md hover:bg-danger-dark"
              >
                <PauseIcon className="h-5 w-5" />
                Stop Simulation
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-secondary-900 mb-4">Vessel Management</h3>
        <div className="space-y-4">
          <button
            onClick={handleAddVessel}
            disabled={!isRunning}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <PlusIcon className="h-5 w-5" />
            Add Random Vessel
          </button>
          
          <p className="text-sm text-secondary-600">
            {isRunning 
              ? 'Add vessels to the simulation while it\'s running' 
              : 'Start the simulation to add vessels'
            }
          </p>
        </div>
      </div>

      {/* Configuration */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-secondary-900 mb-4">Simulation Configuration</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-2">
              Update Interval (seconds)
            </label>
            <input
              type="number"
              min="1"
              max="60"
              defaultValue="5"
              className="w-full px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-2">
              Movement Speed (multiplier)
            </label>
            <input
              type="number"
              min="0.1"
              max="10"
              step="0.1"
              defaultValue="1"
              className="w-full px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>
      </div>

      {/* Statistics */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-secondary-900 mb-4">Simulation Statistics</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <p className="text-sm text-secondary-500">Total Vessels</p>
            <p className="text-3xl font-bold text-secondary-900 mt-1">{vesselCount}</p>
          </div>
          <div>
            <p className="text-sm text-secondary-500">Updates/min</p>
            <p className="text-3xl font-bold text-primary mt-1">
              {isRunning ? Math.floor(vesselCount * (60 / 5)) : 0}
            </p>
          </div>
          <div>
            <p className="text-sm text-secondary-500">Collision Checks</p>
            <p className="text-3xl font-bold text-warning mt-1">
              {isRunning ? Math.floor((vesselCount * (vesselCount - 1)) / 2) : 0}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SimulationControl