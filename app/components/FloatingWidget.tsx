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
  const [isClient, setIsClient] = useState(false);
  const [runInBackground, setRunInBackground] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const beepIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const previousUidsRef = useRef<string[]>([]);

  // Set client-side flag on mount and check background run status
  useEffect(() => {
    setIsClient(true);
    
    // Check notification permission
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission);
    }
    
    // Check if background run was previously enabled
    const backgroundEnabled = localStorage.getItem('uidMonitor_runInBackground');
    if (backgroundEnabled === 'true') {
      setRunInBackground(true);
    }
  }, []);

  // Request notification permission
  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) {
      console.log('This browser does not support notifications');
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      return permission === 'granted';
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  };

  // Toggle background monitoring
  const toggleBackgroundMonitoring = async () => {
    if (!runInBackground) {
      // Enable background monitoring
      const permissionGranted = await requestNotificationPermission();
      
      if (permissionGranted) {
        setRunInBackground(true);
        localStorage.setItem('uidMonitor_runInBackground', 'true');
        
        // Show confirmation notification
        showBrowserNotification(
          'UID Monitor Started', 
          'Background monitoring is now active. You will receive notifications even when browser is closed.'
        );
      } else {
        alert('Notification permission is required for background monitoring.');
        return;
      }
    } else {
      // Disable background monitoring
      setRunInBackground(false);
      localStorage.setItem('uidMonitor_runInBackground', 'false');
      
      // Show stop notification
      if (notificationPermission === 'granted') {
        showBrowserNotification(
          'UID Monitor Stopped', 
          'Background monitoring has been disabled.'
        );
      }
    }
  };

  // Create continuous beep sound for 20 seconds
  const playNotificationSound = () => {
    if (!soundEnabled || !isClient) return;
    
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

  // Show browser notification
  const showBrowserNotification = (title: string, body: string) => {
    if (!('Notification' in window) || notificationPermission !== 'granted') {
      return;
    }
    
    try {
      const notification = new Notification(title, {
        body: body,
        icon: '/icon.png',
        badge: '/icon.png',
        requireInteraction: true, // Keep notification visible until user interacts
        tag: 'uid-monitor' // Group similar notifications
      });

      // Handle notification click
      notification.onclick = () => {
        window.focus();
        notification.close();
        openModal();
      };

      // Auto-close after 10 seconds
      setTimeout(() => {
        notification.close();
      }, 10000);

    } catch (error) {
      console.error('Error showing notification:', error);
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
    // Don't run on server side
    if (!isClient) return;

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
                
                // Show browser notification for new UID
                showBrowserNotification(
                  '🎉 New User Registered!', 
                  `UID: ${latestNewUid}\nClick to view details.`
                );
                
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
  }, [isClient, runInBackground, notificationPermission]);

  const testSound = () => {
    if (isClient) {
      playNotificationSound();
    }
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

  const copyToClipboard = (text: string) => {
    if (isClient && navigator.clipboard) {
      navigator.clipboard.writeText(text);
    }
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
      
      {/* Background Run Indicator */}
      {runInBackground && (
        <div className="absolute -top-2 -left-2 bg-green-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-xs font-bold">
          🔄
        </div>
      )}
      
      {/* Main Widget Button */}
      <button
        onClick={openModal}
        className={`relative p-4 rounded-full shadow-2xl transition-all duration-300 hover:scale-110 ${
          newUidDetected 
            ? 'bg-green-500 animate-pulse ring-4 ring-green-300' 
            : runInBackground
            ? 'bg-purple-600 ring-2 ring-purple-300'
            : 'bg-blue-600 hover:bg-blue-700'
        }`}
        title="Real-time UIDs Monitor"
      >
        <div className="flex items-center justify-center">
          {newUidDetected ? (
            <span className="text-white text-xl">🎉</span>
          ) : runInBackground ? (
            <span className="text-white text-xl">🔄</span>
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
        {runInBackground && (
          <div className="text-xs text-purple-400 mt-1">🔄 Background Mode</div>
        )}
      </div>
    </div>
  );

  // Modal Component
  const Modal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Modal Header */}
        <div className="bg-linear-to-r from-blue-600 to-purple-600 p-6 text-white">
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
                {runInBackground ? 'ACTIVE' : 'INACTIVE'}
              </div>
              <div className="text-sm text-purple-800">Background Mode</div>
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
                onClick={toggleBackgroundMonitoring}
                className={`px-4 py-2 rounded-lg transition-colors font-semibold ${
                  runInBackground 
                    ? 'bg-red-500 hover:bg-red-600 text-white' 
                    : 'bg-green-500 hover:bg-green-600 text-white'
                }`}
              >
                {runInBackground ? 'Stop Background' : 'Run in Background'}
              </button>
              <button
                onClick={testSound}
                disabled={!isClient}
                className="bg-yellow-500 hover:bg-yellow-600 disabled:bg-yellow-300 text-white px-4 py-2 rounded-lg transition-colors"
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
            
            {/* Notification Permission Status */}
            <div className="mt-3 text-center">
              <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm ${
                notificationPermission === 'granted' 
                  ? 'bg-green-100 text-green-800' 
                  : notificationPermission === 'denied'
                  ? 'bg-red-100 text-red-800'
                  : 'bg-yellow-100 text-yellow-800'
              }`}>
                <span className="w-2 h-2 bg-current rounded-full mr-2"></span>
                Notifications: {notificationPermission.toUpperCase()}
              </div>
            </div>
            
            {/* Background Mode Info */}
            {runInBackground && (
              <div className="mt-4 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                <div className="flex items-center">
                  <div className="text-purple-500 text-xl mr-2">🔄</div>
                  <div>
                    <h4 className="font-semibold text-purple-800">Background Mode Active</h4>
                    <p className="text-sm text-purple-700">
                      You will receive browser notifications when new users register, even when this tab is closed.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* NEW UID ALERT */}
          {newUidDetected && (
            <div className="bg-linear-to-r from-green-100 to-emerald-100 border-l-4 border-green-500 p-4 mb-6 rounded-lg animate-pulse">
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
                          onClick={() => copyToClipboard(uid)}
                          disabled={!isClient}
                          className="text-xs bg-blue-100 hover:bg-blue-200 disabled:bg-blue-50 text-blue-700 px-3 py-1 rounded transition-colors"
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
              {runInBackground && (
                <span className="ml-2 text-purple-600">
                  | 🔄 Background mode enabled
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // Don't render anything during SSR to avoid localStorage issues
  if (!isClient) {
    return null;
  }

  return (
    <>
      <FloatingWidget />
      {isModalOpen && <Modal />}
    </>
  );
}