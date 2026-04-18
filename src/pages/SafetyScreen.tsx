import { 
  AlertTriangle, 
  ShieldCheck, 
  ShieldAlert, 
  Settings, 
  Mic, 
  Camera, 
  Navigation2,
  AlertOctagon,
  Navigation
} from 'lucide-react';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { db } from '../firebase';
import { collection, addDoc, serverTimestamp, doc, updateDoc, getDoc } from 'firebase/firestore';
import { analyzeDistressMessage } from '../services/geminiService';
import { motion, AnimatePresence } from 'motion/react';

export default function SafetyScreen({ user }: { user: any }) {
  const [status, setStatus] = useState<'Safe' | 'Monitoring' | 'Crisis'>('Safe');
  const [inactivityTimer, setInactivityTimer] = useState(60);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [textInput, setTextInput] = useState('');
  const [lastAlert, setLastAlert] = useState<any>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<{lat: number, lng: number}>({ lat: 40.7128, lng: -74.0060 });
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [logs, setLogs] = useState<{time: string, msg: string, type: 'info' | 'success' | 'danger'}[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [lastAnalysis, setLastAnalysis] = useState<{reason: string, confidence: number, riskLevel: string} | null>(null);
  const [dispatchStatus, setDispatchStatus] = useState({ strength: 94, lastContact: new Date().toLocaleTimeString() });

  const monitoringRef = useRef<NodeJS.Timeout | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const recognitionRef = useRef<any>(null);

  const handleExportLog = () => {
    if (logs.length === 0) return;
    
    const logContent = logs
      .map(log => `[${log.time}] [${log.type.toUpperCase()}] ${log.msg}`)
      .join('\n');
      
    const blob = new Blob([logContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `project-catherine-log-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    addLog('LOG EXPORTED TO DISK', 'success');
  };

  const addLog = (msg: string, type: 'info' | 'success' | 'danger' = 'info') => {
    const time = new Date().toLocaleTimeString('en-US', { hour12: false });
    setLogs(prev => [{ time, msg, type }, ...prev].slice(0, 10));
  };

  useEffect(() => {
    addLog('CAT-NODE AUTH SUCCESS', 'success');

    // Simulate dispatch heartbeat
    const dispatchInterval = setInterval(() => {
      setDispatchStatus({
        strength: Math.floor(Math.random() * (99 - 85 + 1)) + 85,
        lastContact: new Date().toLocaleTimeString('en-US', { hour12: false })
      });
    }, 10000);

    // Initialize Speech Recognition
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = async (event: any) => {
        const transcript = event.results[0][0].transcript;
        setTextInput(transcript);
        setIsListening(false);
        addLog(`Voice Captured: "${transcript.substring(0, 20)}..."`, 'info');
        
        // Auto-analyze voice input
        setIsAnalyzing(true);
        const result = await analyzeDistressMessage(transcript);
        setIsAnalyzing(false);
        setLastAnalysis({
          reason: result.reason,
          confidence: result.confidence,
          riskLevel: result.riskLevel
        });

        if (result.isCrisis) {
          triggerSOS('Voice Analysis Alert', `Transcript: "${transcript}" | AI: ${result.reason}`);
          setTextInput('');
        } else {
          setInactivityTimer(60);
        }
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech Recognition Error:', event.error);
        setIsListening(false);
        addLog(`Voice Input Error: ${event.error}`, 'danger');
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }
  }, []);

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      if (!recognitionRef.current) {
        addLog('Voice Input Not Supported', 'danger');
        return;
      }
      try {
        recognitionRef.current.start();
        setIsListening(true);
        addLog('Listening for distress signals...', 'info');
      } catch (err) {
        console.error('Speech start error:', err);
      }
    }
  };

  // Camera stream management
  const toggleCamera = async () => {
    if (isCameraActive) {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
        setStream(null);
      }
      setIsCameraActive(false);
    } else {
      try {
        const newStream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: 'user' }, 
          audio: true 
        });
        setStream(newStream);
        if (videoRef.current) {
          videoRef.current.srcObject = newStream;
        }
        setIsCameraActive(true);
      } catch (err) {
        console.error('Camera access denied:', err);
      }
    }
  };

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream, isCameraActive]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  // Real-time location tracking effect
  useEffect(() => {
    const trackLocation = async () => {
      if (!navigator.geolocation) {
        console.warn('Geolocation is not supported by this browser.');
        return;
      }

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const coords = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          setCurrentLocation(coords);

          try {
            if (status === 'Crisis' && lastAlert?.id) {
              // Update the active alert document
              const alertRef = doc(db, 'alerts', lastAlert.id);
              await updateDoc(alertRef, { location: coords });
              console.log('Crisis location updated in alerts collection');
              addLog('Crisis Beacon Updated', 'danger');
            } else {
              // Update the user's general location
              const userRef = doc(db, 'users', user.uid);
              await updateDoc(userRef, { 
                location: coords,
                lastActive: serverTimestamp()
              });
              console.log('User location updated in users collection');
              addLog('Geo-Sense Heartbeat: OK', 'info');
            }
          } catch (err) {
            console.error('Failed to sync location with Firestore:', err);
            addLog('Geo-Sync Error', 'danger');
          }
        },
        (error) => {
          console.error('Error getting geolocation:', error);
        },
        { enableHighAccuracy: true }
      );
    };

    // Initial track
    trackLocation();

    // Set 15 second interval
    const intervalId = setInterval(trackLocation, 15000);

    return () => clearInterval(intervalId);
  }, [user.uid, status, lastAlert?.id]);

  const triggerSOS = useCallback(async (type: string, description: string = '') => {
    setStatus('Crisis');
    setIsMonitoring(false);
    
    const alertData = {
      userId: user.uid,
      userName: user.displayName || 'Unknown User',
      location: currentLocation,
      type,
      description,
      timestamp: new Date().toISOString(),
      status: 'Active'
    };

    try {
      const docRef = await addDoc(collection(db, 'alerts'), alertData);
      setLastAlert({ id: docRef.id, ...alertData });
      console.log('Crisis triggered and recorded:', docRef.id);
      addLog('SOS Alert Dispatched', 'danger');

      // Fetch emergency contact
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const contactPhone = userData.emergencyContact;

        if (contactPhone) {
          addLog(`Notifying Guardian: ${contactPhone}`, 'info');
          
          // Generate tracking link
          const trackingLink = `${window.location.origin}/track/${user.uid}`;

          // Post to backend API
          fetch('/api/notify-emergency', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contactPhone,
              userName: userData.name || user.displayName || 'Emergency User',
              location: currentLocation,
              trackingLink
            })
          })
          .then(res => res.json())
          .then(data => {
            console.log('Notification Response:', data);
            addLog('Guardian Notified via SMS', 'success');
          })
          .catch(err => {
            console.error('Notification Error:', err);
            addLog('Guardian Notification Failed', 'danger');
          });
        } else {
          addLog('No Guardian Contact Found', 'info');
        }
      }
    } catch (e) {
      console.error('Error adding alert:', e);
    }
  }, [user, currentLocation]);

  // Inactivity logic
  useEffect(() => {
    if (isMonitoring && status === 'Monitoring') {
      monitoringRef.current = setInterval(() => {
        setInactivityTimer((prev) => {
          if (prev <= 1) {
            triggerSOS('Inactivity Timeout', 'User failed to respond during monitoring period.');
            return 60;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (monitoringRef.current) clearInterval(monitoringRef.current);
      setInactivityTimer(60);
    }
    return () => {
      if (monitoringRef.current) clearInterval(monitoringRef.current);
    };
  }, [isMonitoring, status, triggerSOS]);

  const handleStartMonitoring = () => {
    setIsMonitoring(true);
    setStatus('Monitoring');
    setInactivityTimer(60);
  };

  const handleStopMonitoring = () => {
    setIsMonitoring(false);
    setStatus('Safe');
  };

  const handleShareLocation = async () => {
    try {
      const shareData = {
        userId: user.uid,
        userName: user.displayName || 'Unknown User',
        location: currentLocation,
        type: 'Location Broadcast',
        description: `Manual location check-in by user.`,
        timestamp: new Date().toISOString(),
        status: 'Resolved' // Location shares are informational, not active crises
      };
      
      await addDoc(collection(db, 'alerts'), shareData);
      console.log('Location broadcasted successfully');
      addLog(`Location Broadcast: ${currentLocation.lat.toFixed(2)}, ${currentLocation.lng.toFixed(2)}`, 'success');
    } catch (err) {
      console.error('Failed to share location:', err);
      addLog('Location Sync Error', 'danger');
    }
  };

  const handleTextInput = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!textInput.trim()) return;

    setIsAnalyzing(true);
    const result = await analyzeDistressMessage(textInput);
    setIsAnalyzing(false);
    setLastAnalysis({
      reason: result.reason,
      confidence: result.confidence,
      riskLevel: result.riskLevel
    });

    if (result.isCrisis) {
      triggerSOS('AI NLP Detection', `Input: "${textInput}" | Analysis: ${result.reason}`);
      setTextInput('');
    } else {
      // Reset inactivity on normal input
      setInactivityTimer(60);
      setTextInput('');
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr_320px] grid-rows-auto lg:grid-rows-[1fr_auto] gap-6 h-full">
      {/* Left Sidebar: Status & Info */}
      <div className="flex flex-col gap-6 lg:row-span-1">
        <div className={`bento-card flex-grow transition-colors duration-500 ${
          status === 'Safe' ? 'bg-safe' : 
          status === 'Monitoring' ? 'bg-warning' : 
          'bg-danger'
        }`}>
          <div className="status-indicator h-16 brutal-border bg-white flex items-center justify-center font-black text-2xl uppercase mb-6">
            {status}
          </div>
          <div className="space-y-4">
            <div className="border-b-2 border-ink border-opacity-10 pb-2">
              <div className="text-[10px] font-black uppercase opacity-60">Emergency Context</div>
              <div className="font-bold text-sm">Guard Mode Active</div>
            </div>
            <div className="border-b-2 border-ink border-opacity-10 pb-2">
              <div className="text-[10px] font-black uppercase opacity-60">Cam / Mic</div>
              <div className="font-bold text-sm">Hardware Link: {isCameraActive ? 'ACTIVE' : 'IDLE'}</div>
            </div>
            <div className="border-b-2 border-ink border-opacity-10 pb-2">
              <div className="text-[10px] font-black uppercase opacity-60">Status Analysis</div>
              <div className="font-bold text-sm italic">{status === 'Safe' ? 'Region: Low Risk' : 'Analyzing Input...'}</div>
            </div>
            <div className="pt-2">
              <div className="text-[10px] font-black uppercase opacity-60 mb-2 flex justify-between">
                <span>Dispatch Link</span>
                <span className="font-mono">{dispatchStatus.strength}%</span>
              </div>
              <div className="flex gap-1 mb-2">
                {[1, 2, 3, 4, 5].map((bar) => (
                  <div 
                    key={bar} 
                    className={`h-3 flex-grow brutal-border ${
                      bar <= (dispatchStatus.strength / 20) ? 'bg-ink' : 'bg-white opacity-20'
                    }`} 
                  />
                ))}
              </div>
              <div className="text-[8px] font-black uppercase opacity-40 flex justify-between">
                <span>Last Contact</span>
                <span>{dispatchStatus.lastContact}</span>
              </div>
            </div>
          </div>
          
          <div className="mt-4 flex flex-col gap-2">
             <button 
                onClick={toggleCamera}
                className={`brutal-button text-[10px] py-2 flex items-center justify-center gap-2 ${isCameraActive ? 'bg-danger text-white' : 'bg-white text-ink'}`}
             >
                {isCameraActive ? <Camera className="w-4 h-4" /> : <Camera className="w-4 h-4 opacity-40" />}
                {isCameraActive ? 'Disconnect Feed' : 'Establish Video Link'}
             </button>
          </div>

          {status === 'Monitoring' && (
            <div className="mt-8 pt-6 border-t-2 border-black border-opacity-20">
               <div className="text-[10px] font-black uppercase mb-1">Inactivity Timeout</div>
               <div className="h-4 bg-white brutal-border overflow-hidden">
                <motion.div 
                  initial={{ width: "100%" }}
                  animate={{ width: `${(inactivityTimer / 60) * 100}%` }}
                  className="h-full bg-black"
                />
              </div>
              <div className="text-right font-black mt-1">{inactivityTimer}S</div>
            </div>
          )}
        </div>

        {/* AI Silent Input inside Sidebar or Bottom? Let's put it on bottom. */}
      </div>

      {/* Main Area: SOS Button */}
      <div className="bento-card items-center justify-center lg:row-span-1 min-h-[400px] relative overflow-hidden">
        {isCameraActive && (
          <div className="absolute inset-0 z-0">
            <video 
              ref={videoRef}
              autoPlay 
              muted 
              playsInline 
              className="w-full h-full object-cover opacity-20 grayscale brightness-125"
            />
          </div>
        )}
        
        <div className="flex flex-col items-center gap-8 relative z-10">
           <button 
            onClick={() => triggerSOS('Manual SOS')}
            className="w-64 h-64 rounded-full bg-danger brutal-border shadow-[0_12px_0_0_rgba(161,30,22,1),0_16px_0_0_rgba(0,0,0,1)] hover:translate-y-2 hover:shadow-[0_8px_0_0_rgba(161,30,22,1),0_12px_0_0_rgba(0,0,0,1)] active:translate-y-4 active:shadow-none transition-all flex items-center justify-center text-white"
          >
            <span className="text-6xl font-black italic">SOS</span>
          </button>
          
          <div className="flex flex-col items-center gap-4 w-full max-w-sm">
            <button 
              onClick={isMonitoring ? handleStopMonitoring : handleStartMonitoring}
              className={`w-full brutal-button py-4 text-white text-xl ${isMonitoring ? 'bg-black' : 'bg-accent'}`}
            >
              {isMonitoring ? 'Stop Monitoring' : 'Start Guard Mode'}
            </button>
            <p className="text-[10px] font-black uppercase tracking-tighter opacity-50 text-center">
              Hold for 3 seconds to cancel accidental SOS triggers during guard mode
            </p>
          </div>
        </div>
      </div>

      {/* Right Sidebar: Location & Risk */}
      <div className="flex flex-col gap-6 lg:row-span-1">
        <div className="bento-card p-0 overflow-hidden flex-grow relative bg-[#E5E5E5] min-h-[200px]">
          {/* Mock Map Background */}
          <div className="absolute inset-0 opacity-20" style={{ 
            backgroundImage: 'linear-gradient(#000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px)',
            backgroundSize: '20px 20px'
          }}></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
            <div className="w-5 h-5 bg-accent rounded-full border-4 border-white shadow-[0_0_0_8px_rgba(88,86,214,0.2)] animate-pulse"></div>
          </div>
          <div className="absolute bottom-4 right-4 bg-white brutal-border px-2 py-1 text-[8px] font-mono font-black">
            {currentLocation.lat.toFixed(4)}° {currentLocation.lat >= 0 ? 'N' : 'S'}, {currentLocation.lng.toFixed(4)}° {currentLocation.lng >= 0 ? 'E' : 'W'}
          </div>

          <div className="absolute top-4 right-4 flex flex-col gap-2">
            <button 
              onClick={handleShareLocation}
              className="brutal-button bg-white p-2"
              title="Broadcast Location"
            >
              <Navigation className="w-4 h-4" />
            </button>
          </div>

          <div className="absolute bottom-0 left-0 right-0 p-4 bg-white border-t-4 border-black">
             <div className="text-[10px] font-black uppercase opacity-60">Risk Prediction</div>
             <div className="text-xl font-black uppercase text-safe">LOW RISK</div>
             <p className="text-[10px] font-bold mt-1 leading-tight">Well-lit corridor identified. Active police patrols in sector 4.</p>
          </div>
        </div>

        {/* Small Simulation Card */}
        <div className="bento-card bg-warning bg-opacity-10 py-4">
          <h4 className="text-[10px] font-black uppercase mb-3 opacity-60">Simulation Terminal</h4>
          <div className="grid grid-cols-1 gap-2">
            <button onClick={() => triggerSOS('Simulated Distress')} className="brutal-button bg-white py-2 text-[10px]">Trigger Crisis</button>
            <button onClick={() => { setIsMonitoring(true); setStatus('Monitoring'); setInactivityTimer(2); }} className="brutal-button bg-white py-2 text-[10px]">Trigger Timeout</button>
          </div>
        </div>
      </div>

      {/* Bottom Row / Full Width: AI Input & Logs */}
      <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-[1fr_400px] gap-6">
        <div className="bento-card justify-center">
           <h3 className="text-xs font-black uppercase mb-4 opacity-60">Natural Language Response</h3>
           <form onSubmit={handleTextInput} className="flex gap-4">
              <div className="relative flex-grow">
                <input 
                  type="text" 
                  placeholder="Ex: 'I am being stalked by a group'..."
                  className="w-full brutal-border p-4 pr-12 font-bold outline-none ring-0 placeholder:opacity-30"
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                />
                <button 
                  type="button"
                  onClick={toggleListening}
                  className={`absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full transition-all duration-300 z-20 ${
                    isListening ? 'bg-danger text-white shadow-[0_0_20px_rgba(239,68,68,0.5)]' : 'text-ink opacity-40 hover:opacity-100'
                  }`}
                >
                  <AnimatePresence mode="wait">
                    {isListening ? (
                      <motion.div
                        key="listening"
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ 
                          scale: [1, 1.2, 1],
                          opacity: 1
                        }}
                        transition={{ 
                          repeat: Infinity, 
                          duration: 1.5,
                          ease: "easeInOut"
                        }}
                      >
                        <Mic className="w-5 h-5" />
                      </motion.div>
                    ) : (
                      <motion.div
                        key="idle"
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                      >
                        <Mic className="w-5 h-5" />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </button>
                {isListening && (
                  <motion.div 
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="absolute -top-6 right-0 text-[8px] font-black text-danger uppercase tracking-widest flex items-center gap-1"
                  >
                    <div className="w-1.5 h-1.5 bg-danger rounded-full animate-pulse" />
                    Voice Comm Active
                  </motion.div>
                )}
              </div>
              <button 
                type="submit"
                disabled={isAnalyzing}
                className={`brutal-button px-10 uppercase ${isAnalyzing ? 'bg-gray-400' : 'bg-safe'} text-white`}
              >
                {isAnalyzing ? 'Analyzing...' : 'Dispatch Hub'}
              </button>
           </form>

           <AnimatePresence>
             {lastAnalysis && (
               <motion.div 
                 initial={{ opacity: 0, y: 10 }}
                 animate={{ opacity: 1, y: 0 }}
                 className="mt-4 pt-4 border-t-2 border-black border-opacity-10 grid grid-cols-2 md:grid-cols-3 gap-4"
               >
                 <div>
                   <div className="text-[8px] font-black uppercase opacity-60">AI Classification</div>
                   <div className="text-[10px] font-black">{lastAnalysis.reason}</div>
                 </div>
                 <div>
                   <div className="text-[8px] font-black uppercase opacity-60">Risk Assessment</div>
                   <div className={`text-[10px] font-black uppercase ${
                     lastAnalysis.riskLevel === 'high' ? 'text-danger' : 
                     lastAnalysis.riskLevel === 'medium' ? 'text-warning' : 'text-safe'
                   }`}>
                     {lastAnalysis.riskLevel} Risk
                   </div>
                 </div>
                 <div className="col-span-2 md:col-span-1">
                   <div className="text-[8px] font-black uppercase opacity-60">Model Confidence</div>
                   <div className="flex items-center gap-2">
                     <div className="flex-grow h-1.5 bg-gray-200 brutal-border overflow-hidden">
                       <motion.div 
                         initial={{ width: 0 }}
                         animate={{ width: `${lastAnalysis.confidence * 100}%` }}
                         className={`h-full ${lastAnalysis.confidence > 0.8 ? 'bg-safe' : 'bg-warning'}`}
                       />
                     </div>
                     <span className="text-[10px] font-black">{Math.round(lastAnalysis.confidence * 100)}%</span>
                   </div>
                 </div>
               </motion.div>
             )}
           </AnimatePresence>
        </div>

        <div className="bento-card">
           <div className="flex justify-between items-start mb-4">
             <h3 className="text-xs font-black uppercase opacity-60">Secure System Log</h3>
             <button 
               onClick={handleExportLog}
               className="text-[8px] font-black uppercase tracking-widest px-2 py-1 brutal-border bg-white hover:bg-safe transition-colors"
             >
               Export Terminal
             </button>
           </div>
           <div className="space-y-1 font-mono text-[10px] font-bold overflow-auto max-h-[100px]">
              {logs.length === 0 && (
                <div className="opacity-30 italic">No activity recorded...</div>
              )}
              {logs.map((log, idx) => (
                <div key={idx} className={`flex justify-between ${
                  log.type === 'success' ? 'text-safe' : log.type === 'danger' ? 'text-danger' : ''
                }`}>
                  <span>[{log.time}]</span> 
                  <span>{log.msg}</span>
                </div>
              ))}
           </div>
        </div>
      </div>

      <AnimatePresence>
        {status === 'Crisis' && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-danger p-8 flex flex-col items-center justify-center text-white"
          >
            <AlertOctagon className="w-32 h-32 mb-8 animate-pulse text-white" />
            <h1 className="text-6xl font-black uppercase italic mb-4">CRISIS DETECTED</h1>
            <p className="text-xl font-bold uppercase mb-12 tracking-widest bg-ink px-4 py-2">Police Dispatch Terminal Active</p>
            
            <div className="max-w-md w-full p-8 bento-card bg-white text-ink">
              <h3 className="font-black uppercase mb-6 text-xl border-b-4 border-ink pb-2">Incident #CAT-{lastAlert?.id?.substring(0, 6)}</h3>
              <div className="space-y-4 text-xs font-black uppercase">
                <div className="flex justify-between border-b-2 border-ink border-opacity-10 pb-1"><span>Target</span> <span>{user.displayName}</span></div>
                <div className="flex justify-between border-b-2 border-ink border-opacity-10 pb-1"><span>Tactical Type</span> <span className="text-danger">{lastAlert?.type}</span></div>
                <div className="flex justify-between"><span>GPS Node</span> <span className="font-mono">{lastAlert?.location.lat.toFixed(4)}, {lastAlert?.location.lng.toFixed(4)}</span></div>
              </div>
            </div>

            <button 
              onClick={() => setStatus('Safe')}
              className="mt-12 brutal-button bg-white text-ink px-16 py-6 text-2xl"
            >
              Issue 'All Safe' Code
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

