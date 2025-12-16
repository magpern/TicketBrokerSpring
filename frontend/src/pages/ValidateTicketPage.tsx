import { useEffect, useRef, useState } from "react";
import api from "../services/api";
import { Show } from "../types/booking";
import "./ValidateTicketPage.css";

// Declare jsQR for TypeScript
declare global {
  interface Window {
    jsQR: (
      data: Uint8ClampedArray,
      width: number,
      height: number,
      options?: { inversionAttempts?: string }
    ) => {
      data: string;
    } | null;
    webkitAudioContext?: typeof AudioContext;
  }
}

function ValidateTicketPage() {
  const [shows, setShows] = useState<Show[]>([]);
  const [selectedShowId, setSelectedShowId] = useState<string>("");
  const [ticketReference, setTicketReference] = useState("");
  const [mode, setMode] = useState<"manual" | "camera">("manual");
  const [loading, setLoading] = useState(false);
  const [popup, setPopup] = useState<{
    show: boolean;
    type: "error" | "warning" | "used" | "success";
    icon: string;
    title: string;
    message: string;
    details: string;
  } | null>(null);
  const [validOverlay, setValidOverlay] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const videoTrackRef = useRef<MediaStreamTrack | null>(null);
  const overlayTimeoutRef = useRef<number | null>(null);
  const focusIntervalRef = useRef<number | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [focusFeedback, setFocusFeedback] = useState(false);

  useEffect(() => {
    api.get("/public/shows").then((response) => {
      setShows(response.data);
    });

    // Load jsQR library
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js";
    script.async = true;
    document.body.appendChild(script);

    return () => {
      stopCamera();
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, []);

  const startCamera = async () => {
    try {
      // Request autofocus in initial constraints
      // Note: focusMode is not in standard TypeScript types but is supported by browsers
      const videoConstraints = {
        facingMode: "environment",
        width: { ideal: 1280, max: 1920 },
        height: { ideal: 720, max: 1080 },
        frameRate: { ideal: 30, max: 60 },
        // Request autofocus - try continuous first, fallback to manual
        focusMode: "continuous",
      } as MediaTrackConstraints;

      let stream: MediaStream;
      try {
        // Try with autofocus in initial request
        stream = await navigator.mediaDevices.getUserMedia({
          video: videoConstraints,
        });
      } catch (focusError) {
        // If that fails, try without focusMode and apply it later
        console.log("Initial request with focusMode failed, retrying without:", focusError);
        const fallbackConstraints: MediaTrackConstraints = {
          facingMode: "environment",
          width: { ideal: 1280, max: 1920 },
          height: { ideal: 720, max: 1080 },
          frameRate: { ideal: 30, max: 60 },
        };
        stream = await navigator.mediaDevices.getUserMedia({
          video: fallbackConstraints,
        });
      }

      streamRef.current = stream;
      const videoTrack = stream.getVideoTracks()[0];
      videoTrackRef.current = videoTrack;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();

        // Apply autofocus constraints after stream starts (more reliable)
        if (videoTrack) {
          // Wait a bit for the stream to stabilize
          await new Promise(resolve => setTimeout(resolve, 500));
          
          console.log("Setting up autofocus for video track:", {
            id: videoTrack.id,
            label: videoTrack.label,
            readyState: videoTrack.readyState,
          });
          
          try {
            // Check capabilities
            const capabilities = videoTrack.getCapabilities?.() as Record<
              string,
              unknown
            > | undefined;

            console.log("Video track capabilities:", JSON.stringify(capabilities, null, 2));

            let focusEnabled = false;
            
            // Try ImageCapture API first (works better on Android/Samsung)
            if ('ImageCapture' in window) {
              try {
                const imageCapture = new (window as any).ImageCapture(videoTrack);
                if (imageCapture.setOptions) {
                  await imageCapture.setOptions({ focusMode: 'continuous' });
                  console.log("ImageCapture continuous autofocus enabled");
                  focusEnabled = true;
                }
              } catch (imageCaptureError) {
                console.log("ImageCapture API not available or failed:", imageCaptureError);
              }
            }

            if (capabilities?.focusMode) {
              const focusModes = capabilities.focusMode as string[];
              
              // Try continuous autofocus first (best for QR scanning)
              if (focusModes.includes("continuous")) {
                try {
                  await videoTrack.applyConstraints({
                    focusMode: "continuous" as any,
                  } as MediaTrackConstraints);
                  console.log("Continuous autofocus enabled");
                  focusEnabled = true;
                  
                  // Some devices need periodic focus triggers even in continuous mode
                  // Trigger focus every 3 seconds to ensure it stays active
                  focusIntervalRef.current = window.setInterval(() => {
                    if (videoTrack.readyState === "live") {
                      videoTrack.applyConstraints({
                        focusMode: "continuous" as any,
                      } as MediaTrackConstraints).catch(() => {
                        // Ignore errors
                      });
                    } else {
                      if (focusIntervalRef.current) {
                        clearInterval(focusIntervalRef.current);
                        focusIntervalRef.current = null;
                      }
                    }
                  }, 3000); // Trigger every 3 seconds
                } catch (err) {
                  console.log("Failed to enable continuous autofocus:", err);
                }
              } 
              // Fallback to single-shot autofocus
              if (!focusEnabled && focusModes.includes("single-shot")) {
                try {
                  await videoTrack.applyConstraints({
                    focusMode: "single-shot" as any,
                  } as MediaTrackConstraints);
                  console.log("Single-shot autofocus enabled");
                  focusEnabled = true;
                  
                  // Trigger periodic refocus for better QR scanning
                  focusIntervalRef.current = window.setInterval(() => {
                    if (videoTrack.readyState === "live") {
                      videoTrack.applyConstraints({
                        focusMode: "single-shot" as any,
                      } as MediaTrackConstraints).catch(() => {
                        // Ignore errors
                      });
                    } else {
                      if (focusIntervalRef.current) {
                        clearInterval(focusIntervalRef.current);
                        focusIntervalRef.current = null;
                      }
                    }
                  }, 2000); // Refocus every 2 seconds
                } catch (err) {
                  console.log("Failed to enable single-shot autofocus:", err);
                }
              }
              // Try manual focus with auto
              if (!focusEnabled && focusModes.includes("manual")) {
                try {
                  const settings = videoTrack.getSettings?.() as Record<
                    string,
                    unknown
                  > | undefined;
                  if (settings?.focusDistance !== undefined) {
                    // Some devices support auto focus through manual mode
                    await videoTrack.applyConstraints({
                      focusMode: "manual" as any,
                      focusDistance: 0 as any, // 0 often means "auto" on some devices
                    } as MediaTrackConstraints);
                    console.log("Manual autofocus attempted");
                    focusEnabled = true;
                  }
                } catch (err) {
                  console.log("Failed to enable manual autofocus:", err);
                }
              }
            }
            
            // Even if capabilities don't show focusMode, try to enable it anyway
            // Some devices support it but don't report it properly
            if (!focusEnabled) {
              console.log("Capabilities don't show focusMode, trying anyway...");
              const focusModesToTry = ["continuous", "single-shot", "manual"];
              for (const mode of focusModesToTry) {
                try {
                  await videoTrack.applyConstraints({
                    focusMode: mode as any,
                  } as MediaTrackConstraints);
                  console.log(`Successfully enabled ${mode} autofocus (not in capabilities)`);
                  focusEnabled = true;
                  
                  // If single-shot or manual, set up periodic refocus
                  if (mode === "single-shot" || mode === "manual") {
                    focusIntervalRef.current = window.setInterval(() => {
                      if (videoTrack.readyState === "live") {
                        videoTrack.applyConstraints({
                          focusMode: mode as any,
                        } as MediaTrackConstraints).catch((err) => {
                          console.log("Periodic focus failed:", err);
                        });
                      } else {
                        if (focusIntervalRef.current) {
                          clearInterval(focusIntervalRef.current);
                          focusIntervalRef.current = null;
                        }
                      }
                    }, 2000);
                  }
                  break;
                } catch (err) {
                  console.log(`Failed to enable ${mode} autofocus:`, err);
                  // Try next mode
                }
              }
            }
            
            console.log("Autofocus setup complete, enabled:", focusEnabled);
          } catch (err) {
            console.error("Could not apply autofocus:", err);
          }
        }
      }
    } catch (error) {
      console.error("Error accessing camera:", error);
      alert(
        "Kunde inte komma åt kameran. Kontrollera att du har gett tillstånd för kameraåtkomst."
      );
    }
  };

  const stopCamera = () => {
    // Clear focus interval if running
    if (focusIntervalRef.current) {
      clearInterval(focusIntervalRef.current);
      focusIntervalRef.current = null;
    }

    videoTrackRef.current = null;

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
      videoRef.current.pause();
    }

    if (canvasRef.current) {
      const context = canvasRef.current.getContext("2d");
      if (context) {
        context.clearRect(
          0,
          0,
          canvasRef.current.width,
          canvasRef.current.height
        );
      }
    }

    setIsScanning(false);
  };

  // Manual focus trigger (tap-to-focus)
  const triggerFocus = async () => {
    setFocusFeedback(true);
    
    const videoTrack = videoTrackRef.current;
    const video = videoRef.current;
    const stream = streamRef.current;
    
    console.log("Trigger focus called", {
      hasVideoTrack: !!videoTrack,
      trackReadyState: videoTrack?.readyState,
      hasVideo: !!video,
      hasStream: !!stream,
    });

    if (!videoTrack || videoTrack.readyState !== "live") {
      console.log("Cannot focus: videoTrack not available or not live");
      setTimeout(() => setFocusFeedback(false), 1000);
      return;
    }

    if (!video) {
      console.log("Cannot focus: video element not available");
      setTimeout(() => setFocusFeedback(false), 1000);
      return;
    }

    try {
      // Calculate center point of interest (for QR codes, center is usually best)
      const pointOfInterest = { x: 0.5, y: 0.5 };
      
      // Method 1: Try ImageCapture API with focus point
      if ('ImageCapture' in window) {
        try {
          const imageCapture = new (window as any).ImageCapture(videoTrack);
          
          // Set focus point to center
          if (imageCapture.setFocusPoint) {
            await imageCapture.setFocusPoint(pointOfInterest);
            console.log("ImageCapture: Focus point set to center");
          }
          
          // Try to trigger focus with single-shot
          if (imageCapture.setOptions) {
            await imageCapture.setOptions({ 
              focusMode: 'single-shot',
              pointsOfInterest: [pointOfInterest]
            });
            console.log("ImageCapture: Focus triggered");
            // Wait a bit for focus to settle
            await new Promise(resolve => setTimeout(resolve, 300));
          }
        } catch (imageCaptureError) {
          console.log("ImageCapture API failed:", imageCaptureError);
        }
      }

      // Method 2: Try applying constraints with point of interest
      try {
        const constraints: any = {
          focusMode: "single-shot",
          pointsOfInterest: [pointOfInterest],
        };
        
        await videoTrack.applyConstraints(constraints as MediaTrackConstraints);
        console.log("Constraints: Focus applied with point of interest");
        await new Promise(resolve => setTimeout(resolve, 200));
      } catch (err) {
        console.log("Constraints with pointOfInterest failed:", err);
      }

      // Method 3: Try cycling through focus distances (for manual mode devices)
      try {
        const capabilities = videoTrack.getCapabilities?.() as Record<string, unknown> | undefined;
        if (capabilities?.focusDistance) {
          const focusDistance = capabilities.focusDistance as { min: number; max: number; step: number };
          // Cycle through focus distances to trigger refocus
          const distances = [focusDistance.min, (focusDistance.min + focusDistance.max) / 2, focusDistance.max, focusDistance.min];
          for (const distance of distances) {
            try {
              await videoTrack.applyConstraints({
                focusMode: "manual" as any,
                focusDistance: distance as any,
              } as MediaTrackConstraints);
              await new Promise(resolve => setTimeout(resolve, 100));
            } catch (err) {
              // Continue
            }
          }
          console.log("Cycled through focus distances");
        }
      } catch (cycleError) {
        console.log("Focus distance cycling failed:", cycleError);
      }

      // Method 4: Try multiple constraint applications in sequence
      const focusModes = ["single-shot", "continuous"];
      for (const mode of focusModes) {
        try {
          await videoTrack.applyConstraints({
            focusMode: mode as any,
          } as MediaTrackConstraints);
          console.log(`Applied ${mode} focus mode`);
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (err) {
          console.log(`Failed to apply ${mode}:`, err);
        }
      }
      
      // Visual feedback
      setTimeout(() => {
        setFocusFeedback(false);
      }, 1000);
    } catch (error) {
      console.error("Manual focus trigger failed:", error);
      setFocusFeedback(false);
    }
  };

  // Play beep sound
  const playBeep = (type: "success" | "error" = "success") => {
    try {
      const AudioContextClass =
        window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return;
      const audioContext = new AudioContextClass();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      if (type === "success") {
        // Success: higher pitch, shorter
        oscillator.frequency.value = 800;
        oscillator.type = "sine";
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(
          0.01,
          audioContext.currentTime + 0.2
        );
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.2);
      } else {
        // Error: lower pitch, longer
        oscillator.frequency.value = 400;
        oscillator.type = "sawtooth";
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(
          0.01,
          audioContext.currentTime + 0.4
        );
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.4);
      }
    } catch (error) {
      console.log("Could not play beep sound:", error);
    }
  };

  // Trigger vibration
  const triggerVibration = (pattern: number | number[] = 200) => {
    if ("vibrate" in navigator) {
      try {
        navigator.vibrate(pattern);
      } catch (error) {
        console.log("Vibration not supported:", error);
      }
    }
  };

  // Manual QR code scan (triggered by button)
  const scanQRCode = () => {
    if (!videoRef.current || !canvasRef.current || !window.jsQR) {
      showPopup(
        "error",
        "❌",
        "Fel",
        "Kamera inte redo",
        "Starta kameran först"
      );
      return;
    }

    if (isScanning) {
      return; // Prevent multiple simultaneous scans
    }

    setIsScanning(true);

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d", { willReadFrequently: true });

    if (!context) {
      setIsScanning(false);
      return;
    }

    try {
      if (
        video.readyState >= 2 &&
        video.videoWidth > 0 &&
        video.videoHeight > 0
      ) {
        const videoWidth = video.videoWidth;
        const videoHeight = video.videoHeight;

        if (videoWidth > 0 && videoHeight > 0) {
          canvas.width = videoWidth;
          canvas.height = videoHeight;
          context.drawImage(video, 0, 0, videoWidth, videoHeight);

          const imageData = context.getImageData(0, 0, videoWidth, videoHeight);
          let code = window.jsQR(
            imageData.data,
            imageData.width,
            imageData.height
          );

          if (!code) {
            code = window.jsQR(
              imageData.data,
              imageData.width,
              imageData.height,
              {
                inversionAttempts: "attemptBoth",
              }
            );
          }

          if (code && code.data) {
            console.log("QR Code detected:", code.data);
            setTicketReference(code.data);
            validateTicket(code.data);
          } else {
            // No QR code found
            triggerVibration([100, 50, 100]); // Short vibration pattern
            showPopup(
              "error",
              "❌",
              "Ingen QR-kod",
              "Ingen QR-kod hittades i bilden",
              "Försök igen"
            );
          }
        }
      } else {
        showPopup(
          "error",
          "❌",
          "Kamera inte redo",
          "Vänta tills kameran är startad",
          ""
        );
      }
    } catch (error) {
      console.error("QR scanning error:", error);
      showPopup("error", "❌", "Fel", "Ett fel uppstod vid skanning", "");
    } finally {
      setIsScanning(false);
    }
  };

  const toggleCamera = () => {
    if (mode === "camera") {
      stopCamera();
      setMode("manual");
    } else {
      setMode("camera");
      startCamera();
    }
  };

  const switchToManual = () => {
    stopCamera();
    setMode("manual");
  };

  const validateTicket = async (reference?: string) => {
    const ticketRef = reference || ticketReference.trim();

    if (!ticketRef) {
      showPopup("error", "❌", "Fel", "Ange en biljettreferens", "");
      return;
    }

    if (!selectedShowId) {
      showPopup("error", "❌", "Fel", "Välj föreställning först", "");
      return;
    }

    setLoading(true);

    try {
      const response = await api.post("/public/tickets/validate", {
        ticketReference: ticketRef,
        showId: selectedShowId ? parseInt(selectedShowId) : null,
      });

      const data = response.data;

      if (data.valid) {
        // Valid ticket - show green overlay with feedback
        triggerVibration([200, 100, 200]); // Success vibration pattern
        playBeep("success");
        setValidOverlay(true);
        // Clear any existing timeout
        if (overlayTimeoutRef.current) {
          clearTimeout(overlayTimeoutRef.current);
        }
        overlayTimeoutRef.current = setTimeout(() => {
          setValidOverlay(false);
          setTicketReference("");
          overlayTimeoutRef.current = null;
        }, 4000); // Show for 4 seconds instead of 2
      } else {
        // Invalid/used/wrong show
        let popupType: "error" | "warning" | "used" = "error";
        let icon = "❌";
        let title = "Ogiltig Biljett";

        if (data.status === "used") {
          popupType = "used";
          icon = "⚠️";
          title = "Biljett Redan Använd";
        } else if (data.status === "wrong_show") {
          popupType = "warning";
          icon = "⚠️";
          title = "Fel Föreställning";
        }

        let details = `Referens: ${data.ticketReference}`;
        if (data.usedAt) {
          details += `<br>Senast skannad: ${new Date(
            data.usedAt
          ).toLocaleString("sv-SE")}`;
        }

        // Error feedback
        triggerVibration([300, 100, 300]); // Error vibration pattern
        playBeep("error");

        showPopup(
          popupType,
          icon,
          title,
          data.message || "Biljett inte giltig",
          details
        );
      }
    } catch (error: unknown) {
      console.error("Validation error:", error);
      let errorMessage = "Ett fel uppstod vid validering";

      if (error && typeof error === "object" && "response" in error) {
        const axiosError = error as {
          response?: { status?: number; data?: { message?: string } };
        };
        if (
          axiosError.response?.status === 404 ||
          axiosError.response?.status === 400
        ) {
          errorMessage =
            axiosError.response?.data?.message || "Biljett hittades inte";
        } else if (axiosError.response?.data?.message) {
          errorMessage = axiosError.response.data.message;
        }
      }

      showPopup("error", "❌", "Fel", errorMessage, "");
    } finally {
      setLoading(false);
    }
  };

  const showPopup = (
    type: "error" | "warning" | "used" | "success",
    icon: string,
    title: string,
    message: string,
    details: string
  ) => {
    setPopup({
      show: true,
      type,
      icon,
      title,
      message,
      details,
    });
  };

  const dismissPopup = () => {
    setPopup(null);
    setTicketReference("");
  };

  const dismissOverlay = () => {
    if (overlayTimeoutRef.current) {
      clearTimeout(overlayTimeoutRef.current);
      overlayTimeoutRef.current = null;
    }
    setValidOverlay(false);
    setTicketReference("");
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      validateTicket();
    }
  };

  return (
    <div className="validate-ticket-page">
      <div className="validate-ticket-container">
        <div className="validate-header">
          <h1>🎫 Validera Biljett</h1>
        </div>

        <div className="camera-container">
          {mode === "camera" && (
            <div 
              className="camera-section"
              onClick={(e) => {
                e.stopPropagation();
                // Only trigger if clicking directly on camera section, not on button
                if ((e.target as HTMLElement).closest('.scan-button-container')) {
                  return;
                }
                triggerFocus();
              }}
              onTouchStart={(e) => {
                e.stopPropagation();
                // Only trigger if touching directly on camera section, not on button
                if ((e.target as HTMLElement).closest('.scan-button-container')) {
                  return;
                }
                e.preventDefault();
                triggerFocus();
              }}
            >
              <video 
                ref={videoRef} 
                autoPlay 
                muted 
                playsInline
                onClick={(e) => {
                  e.stopPropagation();
                  triggerFocus();
                }}
                onTouchStart={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  triggerFocus();
                }}
                style={{ cursor: "pointer", pointerEvents: "auto", width: "100%", height: "100%" }}
              ></video>
              {focusFeedback && (
                <div className="focus-indicator">🔍 Fokuserar...</div>
              )}
              <canvas ref={canvasRef} style={{ display: "none" }}></canvas>

            {validOverlay && (
              <div 
                className="valid-overlay"
                onClick={dismissOverlay}
                onTouchStart={dismissOverlay}
                role="button"
                tabIndex={0}
                aria-label="Dismiss validation result"
              >
                <div className="valid-content">
                  <div className="valid-icon">✅</div>
                  <div className="valid-text">Biljett Godkänd!</div>
                  <div className="valid-hint">Tryck för att fortsätta</div>
                </div>
              </div>
            )}

              {/* Manual scan button */}
              <div className="scan-button-container">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    scanQRCode();
                  }}
                  disabled={isScanning || loading}
                  className="scan-qr-button"
                >
                  {isScanning ? (
                    <>
                      <span className="scan-spinner"></span>
                      <span>Skannar...</span>
                    </>
                  ) : (
                    <>
                      <span className="scan-icon">📷</span>
                      <span>Skanna QR-kod</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {mode === "manual" && (
            <div className="manual-section">
              <input
                type="text"
                value={ticketReference}
                onChange={(e) => setTicketReference(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ange biljettreferens..."
                className="ticket-input"
                autoFocus
              />
              <button onClick={() => validateTicket()} className="validate-btn">
                Validera Biljett
              </button>
            </div>
          )}

          {loading && (
            <div className="loading">
              <div className="loading-spinner"></div>
              <div className="loading-text">Validerar biljett...</div>
            </div>
          )}
        </div>

        <div className="show-selection">
          <label htmlFor="showSelect" className="show-label">
            Föreställning:
          </label>
          <select
            id="showSelect"
            className="show-select"
            value={selectedShowId}
            onChange={(e) => setSelectedShowId(e.target.value)}
          >
            <option value="">Välj föreställning...</option>
            {shows.map((show) => (
              <option key={show.id} value={show.id}>
                {show.startTime} - {show.endTime}
              </option>
            ))}
          </select>
        </div>

        <div className="action-buttons">
          <button
            onClick={toggleCamera}
            className={`action-btn camera ${mode === "camera" ? "active" : ""}`}
          >
            <span className="btn-icon">📷</span>
            Kamera
          </button>
          <button
            onClick={switchToManual}
            className={`action-btn manual ${mode === "manual" ? "active" : ""}`}
          >
            <span className="btn-icon">✏️</span>
            Manuell
          </button>
        </div>

        {popup && popup.show && (
          <div className={`ticket-popup ${popup.type}`}>
            <div className="popup-content">
              <div className="popup-header">
                <span className="popup-icon">{popup.icon}</span>
                <span className="popup-title">{popup.title}</span>
              </div>
              <div className="popup-message">{popup.message}</div>
              {popup.details && (
                <div
                  className="popup-details"
                  dangerouslySetInnerHTML={{ __html: popup.details }}
                />
              )}
              <button onClick={dismissPopup} className="popup-dismiss">
                Stäng
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ValidateTicketPage;
