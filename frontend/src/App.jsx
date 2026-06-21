import { useState, useRef, useEffect } from 'react'
import { Settings2, Sparkles, X, Download, Trash2, CheckCircle, AlertCircle, Wand2, RefreshCw } from 'lucide-react'
import './index.css'

const ASPECT_RATIO_NAMES = {
  "1280x720": "Landscape (1280x720)",
  "720x1280": "Portrait (720x1280)",
  "1024x1024": "Square (1024x1024)",
  "1152x896": "Wide (1152x896)",
  "896x1152": "Tall (896x1152)"
}

function App() {
  const [prompt, setPrompt] = useState("")
  const [negative, setNegative] = useState("blurry, low quality, text, watermark, distorted, bad anatomy")
  const [aspectRatio, setAspectRatio] = useState("1280x720")
  const [seed, setSeed] = useState(-1)
  const [steps, setSteps] = useState(3)
  const [guidance, setGuidance] = useState(1.0)
  
  const [showSettings, setShowSettings] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [imageUrl, setImageUrl] = useState(null)
  const [history, setHistory] = useState([])
  const [variations, setVariations] = useState([])
  const [error, setError] = useState(null)
  const [progress, setProgress] = useState({ current: 0, total: 0, status: "idle" })
  
  // Lightbox state
  const [selectedImage, setSelectedImage] = useState(null)
  const [activeGroupParent, setActiveGroupParent] = useState(null)
  const [generatingParentImage, setGeneratingParentImage] = useState(null)

  const inputRef = useRef(null)
  const settingsRef = useRef(null)
  const buttonRef = useRef(null)

  // State to hold the aspect ratio that was active when generation started
  const [generatingAspectRatio, setGeneratingAspectRatio] = useState("1280x720")

  // Auto-hide error messages after 1 second
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 1000)
      return () => clearTimeout(timer)
    }
  }, [error])

  // Focus input on load and fetch history
  useEffect(() => {
    if (inputRef.current) inputRef.current.focus()
    fetchHistory()
  }, [])

  // Fetch variations and metadata when an image is selected
  useEffect(() => {
    if (!selectedImage) {
      setVariations([])
      return
    }
    if (selectedImage === "generating") {
      return
    }

    const loadMetadata = async () => {
      try {
        const filename = selectedImage.split('/').pop()
        const res = await fetch(`http://127.0.0.1:8000/metadata/${filename}`)
        const data = await res.json()
        
        if (data.status === "success" && data.metadata) {
          const meta = data.metadata
          setPrompt(meta.prompt || "")
          setNegative(meta.negative || "")
          setAspectRatio(meta.aspect_ratio || "1024x1024")
          setSeed(meta.seed || -1)
          setSteps(meta.steps || 3)
          setGuidance(meta.guidance || 1.0)
        }
      } catch (e) {
        console.error("Failed to fetch metadata:", e)
      }
    }
    loadMetadata()

    const fetchVariations = async () => {
      try {
        const filename = selectedImage.split('/').pop()
        const res = await fetch(`http://127.0.0.1:8000/variations/${filename}`)
        const data = await res.json()
        if (data.status === "success") {
          setVariations(data.variations)
        } else {
          setVariations([])
        }
      } catch (e) {
        console.error("Failed to fetch variations:", e)
        setVariations([])
      }
    }
    fetchVariations()
  }, [selectedImage])

  const fetchHistory = async () => {
    try {
      const res = await fetch("http://127.0.0.1:8000/history")
      const data = await res.json()
      if (data.status === "success") {
        setHistory(data.history)
      }
    } catch (err) {
      console.log("Could not fetch history")
    }
  }

  // Poll progress when generating
  useEffect(() => {
    let interval;
    if (isGenerating) {
      interval = setInterval(async () => {
        try {
          const res = await fetch("http://127.0.0.1:8000/progress");
          const data = await res.json();
          if (data.status === "success" && data.progress) {
             setProgress(data.progress);
          }
        } catch (e) { }
      }, 2000);
    } else {
      setProgress({ current: 0, total: 0, status: "idle" });
    }
    return () => clearInterval(interval);
  }, [isGenerating]);

  // Close settings or lightbox on outside click / escape key
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        showSettings && 
        settingsRef.current && 
        !settingsRef.current.contains(event.target) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target)
      ) {
        setShowSettings(false)
      }
    }
    
    const handleEsc = (event) => {
      if (event.key === 'Escape') {
        setShowSettings(false)
        setSelectedImage(null)
        setActiveGroupParent(null)
      }
    }
    
    document.addEventListener("mousedown", handleClickOutside)
    document.addEventListener("keydown", handleEsc)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
      document.removeEventListener("keydown", handleEsc)
    }
  }, [showSettings])

  const handleDownload = async (url, e) => {
    e.stopPropagation()
    try {
      const response = await fetch(url)
      const blob = await response.blob()
      const blobUrl = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = blobUrl
      link.download = url.split('/').pop() || 'z-image.png'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(blobUrl)
    } catch (err) {
      console.error('Download failed:', err)
      // Fallback: open in new tab
      window.open(url, '_blank')
    }
  }

  const handleDelete = async (url, e) => {
    e.stopPropagation()
    const filename = url.split('/').pop()
    if (!filename) return
    
    const wasSelected = selectedImage === url
    const remainingVariations = variations.filter(v => v !== url)
    
    const prevHistory = [...history]
    const prevVariations = [...variations]
    
    // Optimistic UI updates
    setHistory(prev => {
      const index = prev.indexOf(url)
      if (index !== -1) {
        // If it was the parent in the grid, promote the next variation to parent
        if (remainingVariations.length > 0) {
          const newHistory = [...prev]
          newHistory[index] = remainingVariations[0]
          return newHistory
        }
      }
      return prev.filter(img => img !== url)
    })
    setVariations(remainingVariations)
    
    try {
      const response = await fetch(`http://127.0.0.1:8000/image/${filename}`, {
        method: 'DELETE'
      })
      
      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`)
      }
      
      const data = await response.json()
      if (data.status === 'success') {
        // Update selected image and active parent after successful delete
        if (wasSelected) {
          if (remainingVariations.length > 0) {
            setSelectedImage(remainingVariations[0])
            if (activeGroupParent === url) {
              setActiveGroupParent(remainingVariations[0])
            }
          } else {
            setSelectedImage(null)
            setActiveGroupParent(null)
          }
        } else {
          if (activeGroupParent === url) {
            if (remainingVariations.length > 0) {
              setActiveGroupParent(remainingVariations[0])
            } else {
              setActiveGroupParent(null)
            }
          }
        }
      } else {
        console.error('Delete failed:', data.message)
        // Revert optimistic updates
        setHistory(prevHistory)
        setVariations(prevVariations)
      }
    } catch (err) {
      console.error('Delete request failed:', err)
      // Revert optimistic updates
      setHistory(prevHistory)
      setVariations(prevVariations)
    }
  }

  const handleGenerate = async () => {
    if (!prompt.trim()) return
    
    setIsGenerating(true)
    setError(null)
    setShowSettings(false)
    // Capture the aspect ratio RIGHT NOW before any state can change
    setGeneratingAspectRatio(aspectRatio)
    setGeneratingParentImage(activeGroupParent)
    if (activeGroupParent) {
      setSelectedImage("generating")
    }
    
    // Store requested settings for optimistic fallback
    const generationSettings = {
      prompt,
      negative,
      aspect_ratio: aspectRatio,
      steps: parseInt(steps),
      guidance: parseFloat(guidance),
      seed: parseInt(seed)
    }
    
    try {
      const response = await fetch("http://127.0.0.1:8000/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(generationSettings)
      })
      
      const data = await response.json()
      
      if (data.status === "success") {
        setImageUrl(data.url)
        
        // If generating inside lightbox, automatically switch to the new variation
        if (activeGroupParent) {
          setSelectedImage(data.url)
        } else {
          // Only add to history if generated from the main grid (new parent)
          setHistory(prev => [data.url, ...prev])
        }
      } else {
        setError(data.message || "Generation failed.")
        if (activeGroupParent) {
          setSelectedImage(current => current === "generating" ? activeGroupParent : current)
        }
      }
    } catch (err) {
      setError("Failed to connect to the backend server. Is the API running?")
      if (activeGroupParent) {
        setSelectedImage(current => current === "generating" ? activeGroupParent : current)
      }
    } finally {
      setIsGenerating(false)
      setGeneratingParentImage(null)
    }
  }


  const handleReusePrompt = async (url, e) => {
    e.stopPropagation();
    const filename = url.split('/').pop()
    
    try {
      const res = await fetch(`http://127.0.0.1:8000/metadata/${filename}`)
      const data = await res.json()
      
      if (data.status === "success" && data.metadata) {
        const meta = data.metadata;
        setPrompt(meta.prompt || "")
        setNegative(meta.negative || "")
        setAspectRatio(meta.aspect_ratio || "1280x720")
        setSeed(meta.seed !== undefined ? meta.seed : -1)
        setSteps(meta.steps || 3)
        setGuidance(meta.guidance || 1.0)
        
        if (inputRef.current) inputRef.current.focus()
      } else {
        console.error("No metadata found for this image")
      }
    } catch (e) {
      console.error("Error loading metadata", e)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleGenerate()
    }
  }

  // Helper to get aspect ratio styles for the skeleton
  const getAspectRatioStyle = () => {
    const [w, h] = aspectRatio.split('x').map(Number)
    return {
      aspectRatio: `${w} / ${h}`
    }
  }



  return (
    <div className="app-container">
      {/* Main Viewing Area */}
      <main className="main-view">
        {history.length === 0 && !isGenerating ? (
          <div className="welcome-message">
            <h1>What do you want to see?</h1>
            <p>Describe your vision below to generate a masterpiece.</p>
          </div>
        ) : (
          <div className="workspace-grid">
            {isGenerating && !generatingParentImage && (
              <div className="skeleton-box" style={getAspectRatioStyle()}>
                <div className="skeleton-shimmer"></div>
                <div className="skeleton-content">
                  <Sparkles className="skeleton-icon" size={32} />
                  <p>{progress.status === "loading" ? "Loading models into VRAM..." : progress.status === "generating" ? `Generating: ${progress.current}/${progress.total}` : "Starting up..."}</p>
                  
                  {progress.total > 0 && progress.status === "generating" && (
                    <div className="progress-bar-container">
                      <div className="progress-bar-fill" style={{ width: `${(progress.current / progress.total) * 100}%` }}></div>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {history.map((url, index) => (
              <div key={index} className="grid-item-container" onClick={() => { setSelectedImage(url); setActiveGroupParent(url); }}>
                <img 
                  src={url} 
                  alt={`Generation ${index}`} 
                  className="grid-item" 
                  loading="lazy"
                />
                <div className="grid-action-btns">
                  <button 
                    className="grid-icon-btn" 
                    onClick={(e) => handleReusePrompt(url, e)}
                    title="Reuse Prompt"
                  >
                    <RefreshCw size={18} />
                  </button>
                  <button 
                    className="grid-icon-btn" 
                    onClick={(e) => handleDownload(url, e)}
                    title="Download Image"
                  >
                    <Download size={18} />
                  </button>
                  <button 
                    className="grid-icon-btn delete-btn" 
                    onClick={(e) => handleDelete(url, e)}
                    title="Delete Image"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Floating Bottom Input Bar */}
      <div className="bottom-bar-container">
        {error && <div className="error-message">{error}</div>}

        {showSettings && (
          <div className="settings-popover" ref={settingsRef}>
            <div className="input-group settings-full-width">
              <label>Negative Prompt</label>
              <input 
                type="text" 
                value={negative}
                onChange={(e) => setNegative(e.target.value)}
                placeholder="What to avoid..."
              />
            </div>

            <div className="input-group">
              <label>Aspect Ratio</label>
              <select value={aspectRatio} onChange={(e) => setAspectRatio(e.target.value)}>
                <option value="1280x720">Landscape (1280x720)</option>
                <option value="720x1280">Portrait (720x1280)</option>
                <option value="1024x1024">Square (1024x1024)</option>
                <option value="1152x896">Wide (1152x896)</option>
                <option value="896x1152">Tall (896x1152)</option>
              </select>
            </div>

            <div className="input-group">
              <label>Seed</label>
              <input 
                type="number" 
                value={seed}
                onChange={(e) => setSeed(e.target.value)}
                placeholder="-1 for random"
              />
            </div>

            <div className="input-group">
              <label>Steps</label>
              <div className="slider-container">
                <input 
                  type="range" 
                  min="1" max="100" step="1" 
                  value={steps}
                  onChange={(e) => setSteps(e.target.value)}
                />
                <div className="slider-value">{steps}</div>
              </div>
            </div>

            <div className="input-group">
              <label>Guidance Scale</label>
              <div className="slider-container">
                <input 
                  type="range" 
                  min="0" max="5" step="0.1" 
                  value={guidance}
                  onChange={(e) => setGuidance(e.target.value)}
                />
                <div className="slider-value">{guidance}</div>
              </div>
            </div>
          </div>
        )}

        <div className="chat-input-bar">
          <button 
            ref={buttonRef}
            className={`icon-btn ${showSettings ? 'active' : ''}`}
            onClick={() => setShowSettings(!showSettings)}
            title="Settings"
          >
            <Settings2 size={24} />
          </button>
          
          <input 
            ref={inputRef}
            type="text"
            className="prompt-input"
            placeholder="Type your prompt here..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isGenerating}
          />
          
          <button 
            className="generate-btn"
            onClick={handleGenerate}
            disabled={isGenerating || !prompt.trim()}
            title="Generate Image"
          >
            {isGenerating ? <div className="loader" /> : <Sparkles size={24} />}
          </button>
        </div>
      </div>

      {/* Fullscreen Lightbox Overlay */}
      {selectedImage && (
        <div className="lightbox-overlay">
          <div className="lightbox-topbar">
            <div className="lightbox-controls-left">
              <button className="lightbox-close" onClick={() => { setSelectedImage(null); setActiveGroupParent(null); }} title="Close">
                <X size={28} />
              </button>
            </div>

            <div className="lightbox-filmstrip">
              {history.map((url, index) => (
                <img 
                  key={index} 
                  src={url} 
                  alt={`Thumb ${index}`} 
                  className={`filmstrip-thumb ${selectedImage === url || activeGroupParent === url ? 'active' : ''}`}
                  onClick={(e) => { e.stopPropagation(); setSelectedImage(url); setActiveGroupParent(url); }}
                />
              ))}
            </div>

            <div className="lightbox-controls-right">
              {selectedImage !== "generating" && (
                <>
                  <button className="lightbox-close" onClick={(e) => handleDownload(selectedImage, e)} title="Download">
                    <Download size={28} />
                  </button>
                  <button className="lightbox-close delete-btn" onClick={(e) => handleDelete(selectedImage, e)} title="Delete">
                    <Trash2 size={28} />
                  </button>
                </>
              )}
            </div>
          </div>
          
          <div className="lightbox-content" onClick={() => { setSelectedImage(null); setActiveGroupParent(null); }}>
            <div className="lightbox-image-wrapper" onClick={(e) => e.stopPropagation()}>
              {selectedImage === "generating" ? (
                (() => {
                  const [w, h] = generatingAspectRatio.split('x').map(Number)
                  const ratio = w / h
                  const maxH = window.innerHeight * 0.6
                  const maxW = window.innerWidth * 0.6
                  let skH = maxH, skW = maxH * ratio
                  if (skW > maxW) { skW = maxW; skH = maxW / ratio }
                  return (
                    <div className="skeleton-box" style={{ 
                      width: `${Math.round(skW)}px`, 
                      height: `${Math.round(skH)}px`, 
                      margin: '0 auto',
                      boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
                      borderRadius: '16px',
                      flexGrow: 0,
                      flexShrink: 0
                    }}>
                      <div className="skeleton-shimmer"></div>
                      <div className="skeleton-content">
                        <Sparkles className="skeleton-icon" size={48} />
                        <p style={{ fontSize: '1.2rem', marginTop: '1rem' }}>
                          {progress.status === "loading" ? "Loading models into VRAM..." : progress.status === "generating" ? `Generating: ${progress.current}/${progress.total}` : "Starting up..."}
                        </p>
                        {progress.total > 0 && progress.status === "generating" && (
                          <div className="progress-bar-container" style={{ width: '80%', marginTop: '1rem' }}>
                            <div className="progress-bar-fill" style={{ width: `${(progress.current / progress.total) * 100}%` }}></div>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })()
              ) : (
                <img 
                  src={selectedImage} 
                  alt="Selected" 
                  className="lightbox-image" 
                />
              )}
            </div>

            {(variations.length > 0 || (isGenerating && activeGroupParent === generatingParentImage)) && (
              <div className="lightbox-variations-sidebar" onClick={(e) => e.stopPropagation()}>
                {isGenerating && activeGroupParent === generatingParentImage && (
                  <div 
                    className={`variation-thumb variation-skeleton-thumb ${selectedImage === "generating" ? 'active' : ''}`}
                    onClick={() => setSelectedImage("generating")}
                    title="Generating Variation..."
                  >
                    <div className="skeleton-shimmer"></div>
                    <Sparkles className="skeleton-icon-mini" size={14} />
                  </div>
                )}
                {variations.map((url, index) => (
                  <img 
                    key={index} 
                    src={url} 
                    alt={`Variation ${index}`} 
                    className={`variation-thumb ${selectedImage === url ? 'active' : ''}`}
                    onClick={(e) => { e.stopPropagation(); setSelectedImage(url); }}
                    title="Tweaked Variation"
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  )
}

export default App
