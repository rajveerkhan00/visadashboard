'use client';

import { useState, useEffect, useRef } from 'react';
import { db } from '../../lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';

interface UIDsData {
  uids: string[];
}

export default function UIDsMonitorWidget() {
  const [uids, setUids] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newUidDetected, setNewUidDetected] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [notificationCount, setNotificationCount] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const beepIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const previousUidsRef = useRef<string[]>([]);

  // Create continuous beep sound for 20 seconds
  const playNotificationSound = () => {
    if (!soundEnabled) return;
    
    try {
      stopNotificationSound();
      
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContextRef.current.createOscillator();
      const gainNode = audioContextRef.current.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContextRef.current.destination);
      
      oscillator.type = 'sine';
      oscillator.frequency.value = 800;
      gainNode.gain.value = 0.3;
      
      oscillator.start();
      
      let startTime = Date.now();
      const duration = 20000;
      
      beepIntervalRef.current = setInterval(() => {
        const elapsed = Date.now() - startTime;
        
        if (elapsed >= duration) {
          stopNotificationSound();
          return;
        }
        
        gainNode.gain.setValueAtTime(0.3, audioContextRef.current!.currentTime);
        setTimeout(() => {
          if (audioContextRef.current) {
            gainNode.gain.setValueAtTime(0, audioContextRef.current.currentTime);
          }
        }, 300);
        
      }, 500);
      
      setTimeout(() => {
        stopNotificationSound();
      }, duration);
      
    } catch (error) {
      console.log('Audio context not supported, using fallback beep');
      let beepCount = 0;
      const fallbackInterval = setInterval(() => {
        if (beepCount >= 40) {
          clearInterval(fallbackInterval);
          return;
        }
        console.log('\x07');
        beepCount++;
      }, 500);
      
      setTimeout(() => {
        clearInterval(fallbackInterval);
      }, 20000);
    }
  };

  // Stop the notification sound
  const stopNotificationSound = () => {
    if (beepIntervalRef.current) {
      clearInterval(beepIntervalRef.current);
      beepIntervalRef.current = null;
    }
    
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
  };

  // Real-time listener for UIDs
  useEffect(() => {
    const useridDocRef = doc(db, 'users', 'userid');
    
    const unsubscribe = onSnapshot(
      useridDocRef,
      (docSnapshot) => {
        if (docSnapshot.exists()) {
          const data = docSnapshot.data() as UIDsData;
          if (data.uids && Array.isArray(data.uids)) {
            const currentUids = data.uids;
            const previousUids = previousUidsRef.current;
            
            if (previousUids.length > 0 && currentUids.length > previousUids.length) {
              const newUids = currentUids.filter(uid => !previousUids.includes(uid));
              
              if (newUids.length > 0) {
                const latestNewUid = newUids[newUids.length - 1];
                console.log('🎉 NEW UID DETECTED:', latestNewUid);
                
                setNewUidDetected(latestNewUid);
                playNotificationSound();
                setNotificationCount(prev => prev + 1);
                
                setTimeout(() => {
                  setNewUidDetected(null);
                }, 25000);
              }
            }
            
            setUids(currentUids);
            previousUidsRef.current = currentUids;
          } else {
            setUids([]);
          }
        } else {
          setUids([]);
        }
        setLoading(false);
      },
      (snapshotError) => {
        console.error('❌ Real-time listener error:', snapshotError);
        setError(snapshotError.message);
        setLoading(false);
      }
    );

    return () => {
      unsubscribe();
      stopNotificationSound();
    };
  }, []);

  const testSound = () => {
    playNotificationSound();
  };

  const stopSound = () => {
    stopNotificationSound();
  };

  const clearNewUidAlert = () => {
    setNewUidDetected(null);
    stopNotificationSound();
  };

  const openModal = () => {
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  // Floating Widget Component
  const FloatingWidget = () => (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Notification Badge */}
      {notificationCount > 0 && (
        <div className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold animate-ping">
          {notificationCount}
        </div>
      )}
      
      {/* Main Widget Button */}
      <button
        onClick={openModal}
        className={`relative p-4 rounded-full shadow-2xl transition-all duration-300 hover:scale-110 ${
          newUidDetected 
            ? 'bg-green-500 animate-pulse ring-4 ring-green-300' 
            : 'bg-blue-600 hover:bg-blue-700'
        }`}
        title="Real-time UIDs Monitor"
      >
        <div className="flex items-center justify-center">
          {newUidDetected ? (
            <span className="text-white text-xl">🎉</span>
          ) : (
            <span className="text-white text-xl">📊</span>
          )}
        </div>
        
        {/* Live Indicator */}
        <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-400 rounded-full ring-2 ring-white"></div>
      </button>

      {/* Mini Status Tooltip */}
      <div className="absolute bottom-full right-0 mb-2 w-48 bg-gray-900 text-white text-sm rounded-lg p-3 opacity-0 hover:opacity-100 transition-opacity duration-300 pointer-events-none">
        <div className="font-semibold">UIDs Monitor</div>
        <div className="text-xs text-gray-300 mt-1">
          Total: {uids.length} | New: {notificationCount}
        </div>
        <div className="text-xs text-green-400 mt-1">● LIVE</div>
      </div>
    </div>
  );

  // Modal Component
  const Modal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 text-white">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold">Real-time UIDs Monitor</h2>
              <p className="text-blue-100 mt-1">Live tracking of user registrations</p>
            </div>
            <button
              onClick={closeModal}
              className="text-white hover:text-gray-200 text-2xl font-bold transition-colors"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Modal Content */}
        <div className="p-6 max-h-[70vh] overflow-y-auto">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <div className="text-2xl font-bold text-blue-600">{uids.length}</div>
              <div className="text-sm text-blue-800">Total Users</div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <div className="text-2xl font-bold text-green-600">{notificationCount}</div>
              <div className="text-sm text-green-800">New Today</div>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
              <div className="text-2xl font-bold text-purple-600">
                {uids.filter(uid => uid.includes('user_')).length}
              </div>
              <div className="text-sm text-purple-800">Valid Format</div>
            </div>
            <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
              <div className="text-2xl font-bold text-orange-600">
                {soundEnabled ? 'ON' : 'OFF'}
              </div>
              <div className="text-sm text-orange-800">Sound Alert</div>
            </div>
          </div>

          {/* Controls */}
          <div className="bg-gray-50 p-4 rounded-lg mb-6">
            <div className="flex flex-wrap gap-3 justify-center">
              <button
                onClick={testSound}
                className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Test Sound
              </button>
              <button
                onClick={stopSound}
                className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Stop Sound
              </button>
              <button
                onClick={() => setSoundEnabled(!soundEnabled)}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  soundEnabled 
                    ? 'bg-green-500 hover:bg-green-600 text-white' 
                    : 'bg-gray-500 hover:bg-gray-600 text-white'
                }`}
              >
                Sound: {soundEnabled ? 'ON' : 'OFF'}
              </button>
            </div>
          </div>

          {/* NEW UID ALERT */}
          {newUidDetected && (
            <div className="bg-gradient-to-r from-green-100 to-emerald-100 border-l-4 border-green-500 p-4 mb-6 rounded-lg animate-pulse">
              <div className="flex justify-between items-center">
                <div className="flex items-center">
                  <div className="text-green-500 text-2xl mr-3">🎉</div>
                  <div>
                    <h3 className="text-lg font-bold text-green-800">NEW USER REGISTERED!</h3>
                    <p className="text-green-700">
                      UID: <code className="bg-green-200 px-2 py-1 rounded">{newUidDetected}</code>
                    </p>
                  </div>
                </div>
                <button
                  onClick={clearNewUidAlert}
                  className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded"
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <div className="flex items-center">
                <div className="text-red-500 mr-2">❌</div>
                <div>
                  <h3 className="font-medium text-red-800">Error</h3>
                  <p className="text-red-700 text-sm">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* UIDs List */}
          <div className="bg-white rounded-lg shadow-md overflow-hidden border">
            <div className="bg-gray-50 px-6 py-4 border-b">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-800">
                  User IDs ({uids.length})
                </h3>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                  uids.length > 0 ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                }`}>
                  {uids.length > 0 ? '🔴 LIVE' : 'NO DATA'}
                </span>
              </div>
            </div>

            {uids.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <div className="text-4xl mb-2">📭</div>
                <p>No UIDs found in the database.</p>
                <p className="text-sm">Waiting for new registrations...</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200 max-h-64 overflow-y-auto">
                {uids.map((uid, index) => (
                  <div
                    key={uid}
                    className={`px-6 py-3 transition-colors ${
                      uid === newUidDetected 
                        ? 'bg-green-50 border-l-4 border-green-500' 
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center mb-2 sm:mb-0">
                        <span className="text-sm text-gray-500 w-8">#{index + 1}</span>
                        <code className="bg-gray-100 px-3 py-1 rounded text-sm font-mono break-all">
                          {uid}
                        </code>
                        {uid === newUidDetected && (
                          <span className="ml-2 bg-green-500 text-white px-2 py-1 rounded text-xs animate-bounce">
                            NEW!
                          </span>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => navigator.clipboard.writeText(uid)}
                          className="text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 px-3 py-1 rounded transition-colors"
                        >
                          Copy
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Connection Status */}
          <div className="mt-4 text-center">
            <div className="flex items-center justify-center text-green-600">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
              <span className="text-sm">Real-time connection active</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <FloatingWidget />
      {isModalOpen && <Modal />}
    </>
  );
}