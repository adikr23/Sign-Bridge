import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Activity, 
  Hand, 
  Settings, 
  Shield, 
  Plane, 
  Stethoscope, 
  AlertCircle, 
  Volume2, 
  Type, 
  Eye, 
  Battery, 
  Signal,
  Smile,
  ChevronRight,
  MessageSquare,
  Sparkles,
  Zap,
  LayoutDashboard,
  Cpu,
  BookOpen,
  Play,
  Share2,
  Lock,
  ChevronLeft,
  Menu,
  X,
  ChevronUp
} from "lucide-react";
import { useLuminaSocket } from "./hooks/useLuminaSocket";
import { TelemetryChart } from "./components/TelemetryChart";
import { ContextMode } from "./types/dashboard";
import { cn } from "./lib/utils";

import namasteImage from "./assets/images/regenerated_image_1777784977222.png";
import helloImage from "./assets/images/regenerated_image_1777784980034.png";

const DICTIONARY_ITEMS = [
  { name: "Namaste", category: "Greetings", description: "Both palms pressed together before the chest.", image: namasteImage, signature: [1, 1, 1, 1, 1] },
  { name: "Good Morning", category: "Greetings", description: "Soft arc movement from chest outward.", image: "", signature: [1, 0, 0, 0, 1] },
  { name: "Good Night", category: "Greetings", description: "Dominant hand rests on top of non-dominant hand.", image: "", signature: [0, 1, 1, 1, 0] },
  { name: "Hello", category: "Greetings", description: "Open hand with all five fingers extended.", image: helloImage, signature: [1, 1, 1, 1, 1] },
  { name: "Thank You", category: "Social", description: "Hand moves from chin slightly forward and out.", image: "", signature: [0, 1, 0, 0, 0] },
  { name: "Please", category: "Social", description: "Flat palm moves in a circular motion over the chest.", image: "", signature: [0, 1, 1, 1, 1] },
  { name: "I Love You", category: "Social", description: "Index, pinky and thumb extended.", image: "", signature: [1, 0, 0, 0, 1] },
  { name: "Help", category: "Emergency", description: "Fist with thumb up placed on opposite flat palm.", image: "", signature: [1, 0, 0, 0, 0] },
  { name: "Water", category: "Needs", description: "Index finger points to the side of the mouth.", image: "", signature: [1, 1, 0, 0, 0] },
  { name: "Food", category: "Needs", description: "Hand in an 'O' shape taps the lips repeatedly.", image: "", signature: [0, 0, 0, 1, 1] },
  { name: "Eat", category: "Needs", description: "Fingers pinched together tapping the mouth.", image: "", signature: [0, 0, 0, 1, 1] },
  { name: "Drink", category: "Needs", description: "Miming holding a cup and tipping it to the mouth.", image: "", signature: [1, 1, 0, 0, 0] },
  { name: "Hungry", category: "Needs", description: "Hand makes a 'C' shape and moves down the chest.", image: "", signature: [1, 1, 1, 1, 0] },
  { name: "All Done", category: "Social", description: "Both hands up, palms facing in, then twist to face out.", image: "", signature: [1, 1, 1, 1, 1] },
  { name: "More", category: "Needs", description: "Pinch fingers of both hands together and tap them.", image: "", signature: [0, 1, 1, 0, 0] },
  { name: "Stop", category: "Emergency", description: "One flat hand strikes the palm of the other hand horizontally.", image: "", signature: [1, 1, 1, 1, 1] },
  { name: "Play", category: "Social", description: "Thumb and pinky out on both hands, twisting wrists.", image: "", signature: [1, 0, 0, 0, 1] },
  { name: "Bathroom", category: "Needs", description: "Thumb placed between index and middle fingers, shaking side to side.", image: "", signature: [1, 0, 0, 0, 0] },
  { name: "Sorry", category: "Social", description: "Make a fist and rub it in a circle over the chest.", image: "", signature: [1, 0, 0, 0, 0] },
  { name: "Yes", category: "Logic", description: "A closed fist with fingers curled in.", image: "", signature: [1, 0, 0, 0, 0] },
  { name: "No", category: "Logic", description: "Fingers pinched together touching the thumb.", image: "", signature: [0, 1, 1, 0, 0] },
  { name: "Medicine", category: "Medical", description: "Middle finger circles on the opposite palm.", image: "", signature: [0, 0, 1, 0, 0] },
  { name: "Emergency", category: "Emergency", description: "Waving both hands frantically above head.", image: "", signature: [1, 1, 1, 1, 1] },
  { name: "Doctor", category: "Medical", description: "Two fingers pressed on wrist (pulse check).", image: "", signature: [0, 1, 1, 0, 0] },
];

export default function App() {
  const { telemetry, connected, sendMessage } = useLuminaSocket();
  const [activeTab, setActiveTab] = useState<"Console" | "Telemetry" | "Dictionary" | "Simulation">("Console");
  const [isSimulating, setIsSimulating] = useState(false);
  const [lastGesture, setLastGesture] = useState<string | null>(null);
  const [confidence, setConfidence] = useState(0);
  const [translatedStream, setTranslatedStream] = useState<string[]>([]);
  const [activeContext, setActiveContext] = useState<ContextMode>("General");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [hapticPulse, setHapticPulse] = useState(false);
  const [telemetryHistory, setTelemetryHistory] = useState<{ x: number[], y: number[], z: number[] }>({ x: [], y: [], z: [] });
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState("All");
  const [isDictionaryExpanded, setIsDictionaryExpanded] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const simIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const categories = ["All", ...Array.from(new Set(DICTIONARY_ITEMS.map(i => i.category)))];

  const filteredItems = DICTIONARY_ITEMS.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         item.category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = filterCategory === "All" || item.category === filterCategory;
    return matchesSearch && matchesCategory;
  });
  
  // Real-time Recognition Brain
  useEffect(() => {
    if (!telemetry || !connected) return;

    const { flex, accel } = telemetry;
    
    // Update Telemetry History (limited to last 20 points)
    setTelemetryHistory(prev => ({
      x: [...prev.x.slice(-19), (parseFloat(accel.x) * 50) + 50],
      y: [...prev.y.slice(-19), (parseFloat(accel.y) * 50) + 50],
      z: [...prev.z.slice(-19), (parseFloat(accel.z) * 10) + 50]
    }));

    let detected: string | null = null;
    let baseConfidence = 92;

    // Recognition Logic (Emulating ML Model)
    const isClenched = flex.every(v => v > 60);
    const isShaking = Math.abs(parseFloat(accel.x)) > 0.8;
    const isPointing = flex[0] > 70 && flex.slice(1).every(v => v < 30);

    if (isClenched && !isShaking) detected = "HELLO";
    else if (isShaking && !isClenched) detected = "AFRAID";
    else if (isPointing) detected = "HELP";

    // Adaptive Context Boosting
    if (activeContext === "Medical" && detected === "HELP") baseConfidence += 5;
    if (activeContext === "Emergency" && detected === "HELP") baseConfidence += 7;

    if (detected && detected !== lastGesture) {
      setLastGesture(detected);
      setConfidence(Math.min(99, baseConfidence + Math.random() * 2));
      setTranslatedStream(prev => [...prev.slice(-4), detected].filter(Boolean) as string[]);
      
      // Haptic & Voice Feedback
      setHapticPulse(true);
      setTimeout(() => setHapticPulse(false), 200);
      
      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(detected.toLowerCase());
        utterance.rate = 0.9;
        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend = () => setIsSpeaking(false);
        window.speechSynthesis.speak(utterance);
      }
    } else if (!detected) {
      // Small cooldown to prevent flickers
      const timer = setTimeout(() => {
        if (!detected) {
          setConfidence(0);
          setLastGesture(null);
        }
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [telemetry, lastGesture, connected, activeContext]);

  const toggleSimulation = () => {
    const nextState = !isSimulating;
    setIsSimulating(nextState);
    
    if (nextState) {
      const modes = ["HEADING_HELLO", "HEADING_AFRAID", "HEADING_HELP"];
      let i = 0;
      simIntervalRef.current = setInterval(() => {
        sendMessage({ type: "SET_SIMULATION", mode: modes[i % modes.length] });
        i++;
      }, 4000);
    } else {
      if (simIntervalRef.current) {
        clearInterval(simIntervalRef.current);
        simIntervalRef.current = null;
      }
      sendMessage({ type: "SET_SIMULATION", mode: "STANDBY" });
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (simIntervalRef.current) clearInterval(simIntervalRef.current);
    };
  }, []);

  // Scroll Spy for Navigation
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const id = entry.target.id;
            const tabName = id.charAt(0).toUpperCase() + id.slice(1);
            if (["Console", "Telemetry", "Dictionary", "Simulation"].includes(tabName)) {
              setActiveTab(tabName as any);
            }
          }
        });
      },
      { rootMargin: "-20% 0px -60% 0px" }
    );

    const sections = document.querySelectorAll("section[id]");
    sections.forEach((section) => observer.observe(section));

    return () => observer.disconnect();
  }, []);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className="min-h-screen bg-brand-bg text-white font-sans selection:bg-brand-accent/30 selection:text-white">
      {/* Navigation Header */}
      <header className="fixed top-0 left-0 right-0 z-50 glass-surface border-b border-white/5 py-4 px-6 md:px-12">
        <div className="w-full flex items-center justify-between gap-8 h-12">
          <button 
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="flex items-center gap-4 group text-left"
          >
            <div className="w-10 h-10 bg-brand-blue rounded-xl flex items-center justify-center text-white shadow-[0_0_20px_rgba(30,144,255,0.3)] group-hover:shadow-[0_0_30px_rgba(30,144,255,0.5)] transition-all group-hover:scale-105">
              <Activity size={24} />
            </div>
            <h1 className="font-display font-bold text-2xl tracking-tight hidden sm:block group-hover:text-brand-blue transition-colors">SignBridge</h1>
          </button>
          
          <nav className="hidden lg:flex items-center gap-2 bg-white/5 p-1 rounded-2xl border border-white/5">
            {["Console", "Telemetry", "Dictionary", "Simulation"].map((tab) => (
              <button 
                key={tab}
                onClick={() => scrollToSection(tab.toLowerCase())}
                className={cn(
                  "px-5 py-2 rounded-xl text-sm font-bold transition-all",
                  activeTab === tab 
                    ? "bg-white/10 text-white shadow-lg" 
                    : "text-white/40 hover:text-white/80 hover:bg-white/5"
                )}
              >
                {tab}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-3">
             <div className="hidden md:flex items-center gap-2 backdrop-blur-md bg-white/5 p-1 border border-white/10 rounded-xl">
              {[
                { id: "General", icon: Shield },
                { id: "Medical", icon: Stethoscope },
                { id: "Emergency", icon: AlertCircle }
              ].map((mode) => (
                <button
                  key={mode.id}
                  onClick={() => {
                    setActiveContext(mode.id as ContextMode);
                    sendMessage({ type: "SET_CONTEXT", context: mode.id });
                  }}
                  className={cn(
                    "p-2 rounded-lg transition-all flex items-center gap-2",
                    activeContext === mode.id ? "bg-white/10 text-brand-accent shadow-inner border border-white/5" : "text-white/40 hover:bg-white/5"
                  )}
                  title={mode.id + " Context"}
                >
                  <mode.icon size={16} />
                </button>
              ))}
            </div>
            
            {/* Mobile Menu Toggle */}
            <button 
              className="lg:hidden p-2 text-white/50 hover:text-white bg-white/5 rounded-xl border border-white/10"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Dropdown */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="lg:hidden overflow-hidden bg-[#0A101E] border-t border-white/5 mt-4 -mx-6 md:-mx-12 px-6 md:px-12"
            >
              <nav className="flex flex-col gap-2 py-6">
                <div className="space-y-2">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-white/30 mb-3 px-4">Navigation</p>
                  {["Console", "Telemetry", "Dictionary", "Simulation"].map((tab) => (
                    <button 
                      key={tab}
                      onClick={() => {
                        scrollToSection(tab.toLowerCase());
                        setIsMobileMenuOpen(false);
                      }}
                      className={cn(
                        "text-left px-6 py-4 rounded-xl text-lg font-bold transition-all w-full",
                        activeTab === tab 
                          ? "bg-brand-accent/10 text-brand-accent border border-brand-accent/20" 
                          : "text-white/40 hover:text-white hover:bg-white/5 border border-transparent"
                      )}
                    >
                      {tab}
                    </button>
                  ))}
                </div>

                <div className="mt-4 border-t border-white/5 pt-6 space-y-3">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-white/30 mb-3 px-4">Context Mode</p>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: "General", icon: Shield },
                      { id: "Medical", icon: Stethoscope },
                      { id: "Emergency", icon: AlertCircle }
                    ].map((mode) => (
                      <button
                        key={mode.id}
                        onClick={() => {
                          setActiveContext(mode.id as ContextMode);
                          sendMessage({ type: "SET_CONTEXT", context: mode.id });
                          setIsMobileMenuOpen(false);
                        }}
                        className={cn(
                          "flex flex-col items-center justify-center gap-2 p-4 rounded-xl transition-all border",
                          activeContext === mode.id 
                            ? "bg-brand-accent/10 border-brand-accent/30 text-brand-accent shadow-inner" 
                            : "bg-white/5 border-transparent text-white/40 hover:bg-white/10 hover:text-white"
                        )}
                      >
                        <mode.icon size={20} />
                        <span className="text-[10px] font-bold uppercase tracking-tighter truncate w-full text-center">{mode.id}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </nav>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      <main className="pt-20 pb-16 px-6 md:px-12 w-full space-y-8">
        {/* Hero Section */}
        <section id="hero" className="py-6 md:py-10 max-w-2xl">
          <div className="badge-iot mb-4 w-fit">
            <div className={cn("w-1.5 h-1.5 rounded-full", connected ? "bg-brand-accent animate-pulse" : "bg-red-500")} />
            {connected ? "IOT CONNECTED" : "HARDWARE DISCONNECTED"}
          </div>
          <h1 className="text-4xl md:text-5xl font-display font-bold tracking-tight mb-4 leading-tight">
            Sign to Speech <br/><span className="text-brand-accent">In Real Time.</span>
          </h1>
          <p className="text-base md:text-lg text-white/50 leading-relaxed max-w-xl">
            Empowering communication through sensor-fusion. Our dashboard interprets glove telemetry and provides instant vocalization.
          </p>
        </section>

        {/* Dashboard Overview Cards */}
        <section id="overview">
          <div className="flex items-center gap-2 mb-4 text-white/60">
             <div className="p-1.5 bg-brand-accent/10 rounded-lg text-brand-accent">
               <LayoutDashboard size={18} />
             </div>
             <h2 className="font-bold tracking-tight text-lg">System Status</h2>
          </div>
          
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: "Hardware", value: connected ? "Online" : "Offline", icon: Zap, color: connected ? "text-yellow-400" : "text-red-500" },
              { label: "Current Sign", value: lastGesture || "Waiting...", icon: Hand, color: "text-brand-accent" },
              { label: "Confidence", value: confidence > 0 ? `${Math.round(confidence)}%` : "0%", icon: Sparkles, color: "text-blue-400" },
              { label: "Audio Engine", value: isSpeaking ? "Speaking" : "Ready", icon: Volume2, color: "text-green-400" }
            ].map((stat, i) => (
              <div key={i} className="dashboard-card p-4 group hover:scale-[1.02]">
                <div className="flex items-center gap-2 mb-2">
                  <div className={cn("p-1.5 rounded-lg bg-white/5 group-hover:bg-white/10 transition-colors", stat.color)}>
                    <stat.icon size={16} />
                  </div>
                  <span className="text-xs font-medium text-white/40">{stat.label}</span>
                </div>
                <p className="text-xl md:text-2xl font-display font-bold tracking-tight">{stat.value}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Live Translation Console */}
        <section id="console">
          <div className="flex items-center gap-2 mb-4 text-white/60">
             <div className="p-1.5 bg-brand-accent/10 rounded-lg text-brand-accent">
               <Zap size={18} />
             </div>
             <h2 className="font-bold tracking-tight text-lg">Live Translation Engine</h2>
          </div>

          <div className="dashboard-card p-1 relative overflow-hidden">
             {/* Haptic Pulse Overlay */}
             <AnimatePresence>
                {hapticPulse && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 0.1, scale: 2 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-brand-accent rounded-full pointer-events-none"
                  />
                )}
             </AnimatePresence>

             <div className="grid grid-cols-1 lg:grid-cols-5 gap-0">
               <div className="lg:col-span-2 p-4 md:p-6 border-b lg:border-b-0 lg:border-r border-white/5">
                 <div className="aspect-[4/3] md:aspect-square lg:aspect-square rounded-2xl overflow-hidden shadow-2xl relative group bg-brand-bg">
                    <AnimatePresence mode="wait">
                      {lastGesture ? (
                        <motion.div
                          key={lastGesture}
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 1.1 }}
                          className="w-full h-full"
                        >
                          <img 
                            src={
                              DICTIONARY_ITEMS.find(item => item.name.toUpperCase() === lastGesture)?.image ||
                              "https://images.unsplash.com/photo-1549416878-b9ca35c2d47a?auto=format&fit=crop&q=80&w=800&h=600"
                            } 
                            className="w-full h-full object-cover transition-all duration-700 hover:scale-110"
                            alt="Gesture Visual"
                          />
                        </motion.div>
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-white/10 gap-3">
                           <Hand size={48} />
                           <p className="text-[10px] md:text-sm font-bold uppercase tracking-widest">Steady your hand</p>
                        </div>
                      )}
                    </AnimatePresence>
                    <div className="absolute inset-0 bg-gradient-to-t from-brand-bg/80 to-transparent" />
                    <div className="absolute bottom-4 left-4 right-4">
                      <div className="flex items-center gap-3">
                         <div className={cn(
                           "w-8 h-8 rounded-full border-2 border-white/20 flex items-center justify-center backdrop-blur-md transition-colors",
                           isSpeaking ? "text-brand-accent border-brand-accent/40" : "text-white/40"
                         )}>
                            {isSpeaking ? <Volume2 size={14} className="animate-bounce" /> : <Play size={14} fill="currentColor" />}
                         </div>
                         <div className="h-0.5 flex-1 bg-white/20 rounded-full overflow-hidden">
                            <motion.div 
                              animate={{ x: isSpeaking ? ["-100%", "100%"] : "0%" }} 
                              transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }} 
                              className="w-1/3 h-full bg-brand-accent" 
                            />
                         </div>
                      </div>
                    </div>
                 </div>
               </div>

                <div className="lg:col-span-3 p-6 md:p-8 flex flex-col justify-center gap-6">
                  <div className="space-y-4">
                    <p className="text-[10px] uppercase tracking-[0.2em] text-white/30 font-bold">Predicted Sentence Stream</p>
                    <div className="min-h-[80px] md:min-h-[100px] flex flex-wrap items-baseline gap-x-3 gap-y-3">
                      {translatedStream.length > 0 ? (
                        translatedStream.map((word, idx) => (
                          <motion.span
                            key={`${word}-${idx}`}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-3xl md:text-5xl font-display font-bold tracking-tight text-white hover:text-brand-accent transition-colors flex items-center"
                          >
                            {word}
                            {idx < translatedStream.length - 1 && <span className="opacity-0 w-3"> </span>}
                          </motion.span>
                        ))
                      ) : (
                        <h3 className="text-3xl md:text-5xl font-display font-bold tracking-tighter text-white/10 italic">
                          Awaiting gesture...
                        </h3>
                      )}
                      <motion.span 
                        animate={{ opacity: [1, 0, 1] }} 
                        transition={{ repeat: Infinity, duration: 0.8 }}
                        className="inline-block w-1.5 h-8 md:h-10 bg-brand-accent align-middle shadow-lg shadow-brand-accent/50"
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 pt-4 border-t border-white/5">
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-brand-accent/10 rounded-full">
                       <div className={cn("w-1.5 h-1.5 rounded-full", confidence > 0 ? "bg-brand-accent animate-pulse" : "bg-white/20")} />
                       <span className="text-xs font-bold text-brand-accent">{Math.round(confidence)}% Prediction Confidence</span>
                    </div>
                    <button 
                      onClick={() => setTranslatedStream([])}
                      className="text-[10px] font-bold uppercase tracking-widest text-white/30 hover:text-white transition-colors"
                    >
                      Clear Stream
                    </button>
                  </div>
               </div>
             </div>
          </div>
        </section>

        {/* Simulation Mode */}
        <section id="simulation">
          <div className="flex items-center gap-3 mb-8 text-white/60">
             <div className="p-2 bg-brand-accent/10 rounded-lg text-brand-accent">
               <Activity size={20} />
             </div>
             <h2 className="font-bold tracking-tight text-xl">Development Tool: Hardware Simulation</h2>
          </div>

          <div className="dashboard-card bg-[#0A101E] border-white/5 p-8 flex flex-col md:flex-row md:items-center justify-between gap-8">
             <div className="space-y-2">
               <h3 className="text-2xl font-bold tracking-tight">Virtual Signal Generator</h3>
               <p className="text-white/40 font-medium">Injects specific motion and flex patterns directly into the processing engine to verify translation accuracy.</p>
             </div>
             <div className="flex items-center gap-4">
                <button 
                  onClick={toggleSimulation}
                  className={cn(
                    "flex items-center gap-3 px-8 py-4 rounded-2xl font-bold transition-all shadow-xl",
                    isSimulating ? "bg-red-500 text-white shadow-red-500/20" : "bg-brand-blue text-white shadow-brand-blue/20"
                  )}
                >
                  {isSimulating ? <Lock size={20} /> : <Play size={20} fill="currentColor" />}
                  {isSimulating ? "Stop Signal" : "Start Simulation"}
                </button>
             </div>
          </div>
        </section>

        {/* Hardware Telemetry */}
        <section id="telemetry">
          <div className="flex items-center gap-2 mb-4 text-white/60">
             <div className="p-1.5 bg-brand-accent/10 rounded-lg text-brand-accent">
               <Cpu size={18} />
             </div>
             <h2 className="font-bold tracking-tight text-lg">Real-time Telemetry Data</h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
             <div className="dashboard-card p-4 md:p-6">
                <h4 className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-white/40 mb-6 px-1 flex items-center gap-2">
                   <Hand size={12} /> Flex State (Raw)
                </h4>
                <div className="space-y-6">
                   {["Thumb", "Index", "Middle", "Ring", "Pinky"].map((sensor, i) => (
                     <div key={i} className="space-y-2.5 font-mono group">
                       <div className="flex justify-between items-end">
                         <span className="text-xs md:text-sm font-medium text-white/70">Sensor_{i+1} ({sensor})</span>
                         <span className="text-xs md:text-sm font-bold text-white/90">{telemetry ? Math.round(telemetry.flex[i]) : 0}</span>
                       </div>
                       <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                          <motion.div 
                            animate={{ width: telemetry ? `${telemetry.flex[i]}%` : "0%" }}
                            className="h-full bg-brand-accent rounded-full"
                          />
                       </div>
                     </div>
                   ))}
                </div>
             </div>

             <div className="dashboard-card p-4 md:p-6">
                <h4 className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-white/40 mb-6 px-1 flex items-center gap-2">
                   <Zap size={12} /> IMU Displacement
                </h4>
                <div className="space-y-6">
                   <TelemetryChart label="Axis X (Lateral)" data={telemetryHistory.x} color="#FF3B30" />
                   <TelemetryChart label="Axis Y (Vertical)" data={telemetryHistory.y} color="#34C759" />
                   <TelemetryChart label="Axis Z (Depth)" data={telemetryHistory.z} color="#007AFF" />
                </div>
             </div>
          </div>
        </section>

        {/* Sign Dictionary */}
        <section id="dictionary" className="space-y-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
             <div className="flex items-center gap-3 text-white/60">
                <div className="p-2 bg-brand-accent/10 rounded-lg text-brand-accent">
                   <BookOpen size={20} />
                </div>
                <div className="flex items-center gap-4">
                  <h2 className="font-bold tracking-tight text-xl">
                    {isDictionaryExpanded ? "Intelligent Dictionary" : "Dictionary Preview"}
                  </h2>
                  <span className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-[10px] font-bold text-white/30 uppercase tracking-widest">
                    {isDictionaryExpanded ? `${filteredItems.length} Total Signs` : "Top Mapping"}
                  </span>
                </div>
             </div>

             {isDictionaryExpanded && (
               <motion.div 
                 initial={{ opacity: 0, x: 20 }}
                 animate={{ opacity: 1, x: 0 }}
                 className="flex items-center gap-4 flex-1 max-w-xl"
               >
                  <div className="relative flex-1">
                     <input 
                       type="text" 
                       placeholder="Search signs or categories..." 
                       value={searchQuery}
                       onChange={(e) => setSearchQuery(e.target.value)}
                       className="w-full bg-white/5 border border-white/10 rounded-xl px-12 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent/50 transition-all font-medium"
                     />
                     <Sparkles className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={18} />
                  </div>
                  <button 
                    onClick={() => {
                      setIsDictionaryExpanded(false);
                      setSearchQuery("");
                      setFilterCategory("All");
                    }}
                    className="p-3 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 text-white/40 hover:text-white transition-all"
                    title="Collapse Dictionary"
                  >
                    <ChevronUp size={20} />
                  </button>
               </motion.div>
             )}
          </div>

          {isDictionaryExpanded && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-3 flex-wrap"
            >
               {categories.map(cat => (
                 <button
                   key={cat}
                   onClick={() => setFilterCategory(cat)}
                   className={cn(
                     "px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all border border-transparent",
                     filterCategory === cat 
                      ? "bg-brand-accent text-brand-bg shadow-lg shadow-brand-accent/20" 
                      : "bg-white/5 text-white/40 hover:bg-white/10 hover:border-white/5"
                   )}
                 >
                   {cat}
                 </button>
               ))}
            </motion.div>
          )}

          <div className={cn(
            "grid gap-4 transition-all duration-500",
            isDictionaryExpanded 
              ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5" 
              : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-5"
          )}>
            <AnimatePresence mode="popLayout">
              {filteredItems.slice(0, isDictionaryExpanded ? undefined : 4).map((item, i) => (
                <motion.div 
                  key={item.name}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="dashboard-card p-0 overflow-hidden group border-white/10 hover:border-brand-accent/30 flex flex-col"
                >
                   <div className="aspect-[4/3] relative bg-white/5 border-b border-white/10 flex items-center justify-center">
                      {item.image ? (
                        <img src={item.image} className="w-full aspect-[4/3] object-cover opacity-60 group-hover:opacity-100 transition-opacity" alt={item.name} />
                      ) : (
                        <div className="flex flex-col items-center justify-center text-white/30 group-hover:text-white/50 transition-colors">
                          <Hand size={32} strokeWidth={1} />
                        </div>
                      )}
                      <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/90 to-transparent">
                         <div className="flex gap-1">
                           {item.signature.map((s, idx) => (
                             <div 
                               key={idx} 
                               className={cn(
                                "w-1 h-3 rounded-full transition-all",
                                s === 1 ? "bg-brand-accent shadow-[0_0_8px_rgba(30,230,131,0.5)]" : "bg-white/10"
                               )} 
                             />
                           ))}
                         </div>
                      </div>
                   </div>
                   <div className="p-3 md:p-4 flex-1 flex flex-col justify-between space-y-2">
                      <div>
                        <h4 className="text-base font-bold tracking-tight text-white mb-1 group-hover:text-brand-accent transition-colors">{item.name}</h4>
                        <div className="text-[10px] font-bold uppercase tracking-widest text-white/20">{item.category}</div>
                      </div>
                      
                      <p className="text-[11px] text-white/40 leading-relaxed font-normal line-clamp-2">
                        {item.description}
                      </p>

                      <div className="pt-2 border-t border-white/5 flex items-center justify-between">
                         <button className="text-[9px] font-black tracking-widest text-white/10 group-hover:text-brand-accent transition-all">
                           VIEW MAPPING
                         </button>
                         <Play size={10} className="text-white/10 group-hover:text-brand-accent" />
                      </div>
                   </div>
                </motion.div>
              ))}

              {!isDictionaryExpanded && (
                <motion.button
                  key="expand-trigger"
                  layout
                  onClick={() => setIsDictionaryExpanded(true)}
                  className="dashboard-card border-dashed border-white/10 hover:border-brand-accent/40 bg-brand-accent/[0.02] flex flex-col items-center justify-center gap-4 transition-all group min-h-[200px]"
                >
                   <div className="w-16 h-16 rounded-full bg-brand-accent/10 flex items-center justify-center text-brand-accent group-hover:scale-110 transition-transform shadow-inner">
                      <ChevronRight size={32} />
                   </div>
                   <div className="text-center">
                      <p className="text-sm font-bold uppercase tracking-widest text-white/60 mb-1">View Full Library</p>
                      <p className="text-[10px] font-bold text-white/20 uppercase tracking-tighter">Explore {DICTIONARY_ITEMS.length} Signs</p>
                   </div>
                </motion.button>
              )}
            </AnimatePresence>
            
            {isDictionaryExpanded && filteredItems.length === 0 && (
              <div className="col-span-full py-20 text-center space-y-4">
                 <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto text-white/10">
                    <BookOpen size={32} />
                 </div>
                 <p className="text-white/20 font-bold uppercase tracking-widest">No matching signs found in dataset</p>
              </div>
            )}
          </div>
        </section>
      </main>

      {/* Persistent Footer */}
      <footer className="fixed bottom-0 left-0 right-0 z-50 glass-surface border-t border-white/5 px-12 py-4">
        <div className="w-full flex items-center justify-between">
            <div className="flex items-center gap-8">
               <div className="flex items-center gap-2 text-white/40 text-[10px] font-bold uppercase tracking-widest">
                  <Signal size={14} className={connected ? "text-green-500" : "text-white/10"} /> {connected ? "Bridge Online" : "Waiting for Bridge"}
               </div>
               <div className="flex items-center gap-2 text-white/40 text-[10px] font-bold uppercase tracking-widest">
                  <Cpu size={14} /> Engine v4.0.0
               </div>
            </div>
            
            <div className="flex items-center gap-4">
               <div className="flex items-center gap-2 px-3 py-1 bg-white/5 rounded-lg border border-white/5">
                  <div className="w-1.5 h-1.5 bg-brand-accent rounded-full" />
                  <span className="text-[10px] font-bold text-white/40 uppercase">Latency: 12ms</span>
               </div>
            </div>
        </div>
      </footer>
    </div>
  );
}
