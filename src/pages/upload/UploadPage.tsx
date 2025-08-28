import { useState, useRef, useEffect } from 'react';
import { Upload, Camera, X, ChevronDown, ChevronUp } from 'lucide-react';
import type { FC } from 'react';
import './Upload.css'
import l_logo from "../../images/main-left-logo.svg"
import logout from "../../images/Logout.svg"
import r_logo from "../../images/main-right-logo.svg"
import upload from "../../images/upload-logo.svg"
import btm_img from "../../images/vehicle_detail_img.svg"
import { clearAuthData } from '../../utils/auth';
import axios from 'axios';

interface UploadPageProps {
  onUpload: (file: File) => void;
  onLogout: () => void;
  uploadedFile?: File | null;
}

const UploadPage: FC<UploadPageProps> = ({ onUpload, onLogout, uploadedFile }) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [fileName, setFileName] = useState<string>('N/A');
  const [fileType, setFileType] = useState<string>('JPEG');
  const [fileSizeMb, setFileSizeMb] = useState<string>('0.0 MB');
  const [uploadTime, setUploadTime] = useState<string>('00:00:00');
  const [responseTime, setResponseTime] = useState<string>('00:00:00');
  const uploadTimerRef = useRef<number | null>(null);

  // Inline results section state (mirrors ResultsPage)
  const [vehicleDetailsExpanded, setVehicleDetailsExpanded] = useState(true);
  const [ownerInfoExpanded, setOwnerInfoExpanded] = useState(false);
  const [pastViolationsExpanded, setPastViolationsExpanded] = useState(false);

  // Network bandwidth info
  type NetworkInfo = {
    downlink?: number;
    effectiveType?: string;
    rtt?: number;
    saveData?: boolean;
  } | null;
  const [networkInfo, setNetworkInfo] = useState<NetworkInfo>(null);

  const getNetworkBandwidthInfo = (): NetworkInfo => {
    // @ts-ignore - vendor-prefixed properties for older browsers
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (connection) {
      return {
        downlink: connection.downlink,
        effectiveType: connection.effectiveType,
        rtt: connection.rtt,
        saveData: connection.saveData,
      } as NetworkInfo;
    }
    return null;
  };

  type DetectedData = {
    licenseNumber?: string;
    chassisNumber?: string;
    vin?: string;
    make?: string;
    model?: string;
    color?: string;
    type?: string;
    transportType?: string;
    fuel?: string;
    nationalId?: string;
    ownerName?: string;
    registrationValidity?: string;
    insuranceValidity?: string;
    mvpiValidity?: string;
    vehicleStatus?: string;
    trafficViolations?: string | number;
  };

  const [detected, setDetected] = useState<DetectedData | null>(null);

  const getValue = (value?: string | number | null): string => {
    if (value === undefined || value === null) return '--NA--';
    const str = String(value).trim();
    return str.length === 0 ? '--NA--' : str;
  };

  const InfoItem: React.FC<{ label: string; value: string }> = ({ label, value }) => (
    <div className="rounded-lg border border-lime-500/30 bg-[#0b1418] p-3 sm:p-4">
      <p className="text-lime-400 font-bold text-sm sm:text-base leading-tight break-words">{value}</p>
      <p className="text-[#CBFFF6] text-[10px] sm:text-xs mt-1">{label}</p>
    </div>
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragOver(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      if (file.type.startsWith('image/')) {
        handleFileUpload(file);
      } else {
        alert('Please upload an image file');
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  const formatTime = (ms: number) => {
    const s = Math.floor(ms / 1000);
    const hh = String(Math.floor(s / 3600)).padStart(2, '0');
    const mm = String(Math.floor((s % 3600) / 60)).padStart(2, '0');
    const ss = String(s % 60).padStart(2, '0');
    return `${hh}:${mm}:${ss}`;
  };

  const handleFileUpload = async (file: File) => {
    try {
      if (!file.type.startsWith('image/')) {
        throw new Error('Please upload an image file');
      }

      const maxSize = 10 * 1024 * 1024;
      if (file.size > maxSize) {
        throw new Error('File size should not exceed 10MB');
      }

      setIsUploading(true);
      setProgress(0);
      setFileName(file.name || 'N/A');
      setFileType(file.type ? file.type.split('/').pop()?.toUpperCase() || 'JPEG' : 'JPEG');
      setFileSizeMb(`${(file.size / 1024 / 1024).toFixed(2)} MB`);

      const start = performance.now();
      if (uploadTimerRef.current) window.clearInterval(uploadTimerRef.current);
      uploadTimerRef.current = window.setInterval(() => {
        setUploadTime(formatTime(performance.now() - start));
      }, 250);

      const respStart = performance.now();


      const formData = new FormData();
      formData.append('image', file);

      const response = await axios.post(
        'https://api.anpr.grok-digital.com/api/extract',
        formData,
        {
          headers: { 'Content-Type': 'multipart/form-data' },
          onUploadProgress: (progressEvent) => {
            if (progressEvent.total) {
              const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
              setProgress(percent);
            }
          },
        }
      );

      if (uploadTimerRef.current) {
        window.clearInterval(uploadTimerRef.current);
        uploadTimerRef.current = null;
      }
      setUploadTime(formatTime(performance.now() - start));
      // const respStart = performance.now();
      setResponseTime(formatTime(performance.now() - respStart));

      // Capture network info snapshot after upload completes
      const net = getNetworkBandwidthInfo();
      setNetworkInfo(net);

      console.log('API Response:', response.data);
      // Handle nested shapes and specific vehicle_info payload
      const dRoot = response?.data ?? {} as any;
      const dLayer = (dRoot.data || dRoot.result || dRoot) as any;
      const d = (dLayer.vehicle_info || dLayer) as any;
      console.log('Detected payload keys:', Object.keys(d || {}));
      const mapped: DetectedData = {
        licenseNumber: d.license_number ?? d.licenseNumber ?? d.plate ?? d.license_no ?? d.licenseNumberText,
        chassisNumber: d.chassis_number ?? d.chassisNumber ?? d.chassis_no ?? d.chassis,
        vin: d.vin ?? d.VIN,
        make: d.make ?? d.manufacturer,
        model: d.model,
        color: d.color,
        type: d.type ?? d.vehicleType ?? d.model_type,
        transportType: d.transport_type ?? d.transportType ?? d.transport,
        fuel: d.fuel ?? d.fuel_type ?? d.fuelType,
        nationalId: d.national_id ?? d.nationalId,
        ownerName: d.owner_name ?? d.ownerName ?? d.owner,
        registrationValidity: d.registration_validity ?? d.registrationValidity,
        insuranceValidity: d.insurance_validity ?? d.insuranceValidity,
        mvpiValidity: d.mvpi_validity ?? d.mvpiValidity,
        vehicleStatus: d.vehicle_status ?? d.vehicleStatus ?? d.status,
        trafficViolations: d.traffic_violations ?? d.violationsCount ?? d.violations?.length
      };
      setDetected(mapped);
      // After receiving response, open Vehicle Details and collapse others
      setVehicleDetailsExpanded(true);
      setOwnerInfoExpanded(false);
      setPastViolationsExpanded(false);
      onUpload(file);
      return response.data;
    } catch (error) {
      console.error('Upload error:', error);
      alert(error instanceof Error ? error.message : 'Failed to upload file');
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const openNativeCamera = () => {
    if (!cameraInputRef.current) return;
    cameraInputRef.current.click();
  };

  const handleCaptureClick = async () => {
    // Mobile devices: use native camera picker
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    if (isMobile) {
      openNativeCamera();
      return;
    }

    // Browser camera requires a secure context (https or localhost)
    if (!window.isSecureContext) {
      alert('Camera requires a secure connection (https or localhost). Please switch to https.');
      return;
    }

    const tryStart = async (constraints: MediaStreamConstraints) => {
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      const hasVideo = stream.getVideoTracks().length > 0;
      if (!hasVideo) throw new Error('No video track available');

      // Ensure the modal/video is rendered before attaching the stream
      setIsCameraOpen(true);

      // Wait for the <video> to mount
      for (let i = 0; i < 20; i++) {
        if (videoRef.current) break;
        await new Promise(r => setTimeout(r, 25));
      }

      if (videoRef.current) {
        const video = videoRef.current as HTMLVideoElement & { srcObject?: MediaStream };
        try {
          // Wire the stream
          video.srcObject = stream;
        } catch {
          // Fallback for very old browsers
          // @ts-ignore
          (video as any).src = URL.createObjectURL(stream);
        }
        video.muted = true;
        video.setAttribute('playsinline', 'true');
        await new Promise<void>((resolve) => {
          const onLoaded = () => {
            video.removeEventListener('loadedmetadata', onLoaded);
            resolve();
          };
          video.addEventListener('loadedmetadata', onLoaded);
        });
        try {
          await video.play();
        } catch {
          // Ignore autoplay errors; the video element is already wired
        }
      }
    };

    try {
      // Prefer rear camera with reasonable resolution
      await tryStart({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false });
    } catch (e1) {
      try {
        // Fallback to any available camera
        await tryStart({ video: true, audio: false });
      } catch (e2) {
        console.error('Camera access failed', e1, e2);
        alert('Unable to access camera. Please check permissions and try again.');
      }
    }
  };

  const closeCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      try {
        (videoRef.current as HTMLVideoElement & { srcObject?: MediaStream }).srcObject = null as any;
      } catch {
        // ignore
      }
    }
    setIsCameraOpen(false);
  };

  const captureSnapshot = async () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    await new Promise<void>(resolve => setTimeout(resolve, 0));
    canvas.toBlob(async (blob) => {
      if (!blob) return;
      const file = new File([blob], `capture-${Date.now()}.jpg`, { type: 'image/jpeg' });
      closeCamera();
      await handleFileUpload(file);
    }, 'image/jpeg', 0.95);
  };

  useEffect(() => {
    return () => closeCamera();
  }, []);

  const handleLogout = () => {
    clearAuthData();
    onLogout();
  };

  return (
    <div className="upload-container">
      {/* Top section with upload-bg.svg background */}
      <div className="upload-top-section">
        <div className="upload-top-bg">
          {/* Header with upload section between logos */}
          <header className="upload-header">
            <img src={l_logo} alt="PrAI-Cogniplate" className="header-logo left" />
            <div className="header-upload-section">
              <div 
                className={`upload-box ${isDragOver ? 'drag-over' : ''}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <div className="upload-content">
                  <div className="upload-icon">
                    <img src={upload} alt="Upload" />
                  </div>
                  <h2 className="upload-text">
                    Drag & Drop or Upload a license plate image
                  </h2>
                  <div className="upload-buttons">
                    <button
                      onClick={handleUploadClick}
                      disabled={isUploading}
                      className={`upload-btn primary ${isUploading ? 'disabled' : ''}`}
                    >
                      <Upload className="w-5 h-5" />
                      {isUploading ? `Uploading ${progress}%` : 'Upload'}
                    </button>
                    <button
                      onClick={handleCaptureClick}
                      disabled={isUploading}
                      className="upload-btn secondary"
                    >
                      <Camera className="w-5 h-5" />
                      Capture
                    </button>
                  </div>
                </div>
              </div>
            </div>
            <div className="header-right-section">
              <img src={r_logo} alt="GROK DIGITAL" className="header-logo right" />
              <button onClick={handleLogout} className="logout-button">
                <img src={logout} alt="Logout" />
              </button>
            </div>
          </header>
        </div>
      </div>

      {/* Bottom section */}
      <div className={`upload-bottom-section ${uploadedFile ? 'no-bottom-bg' : ''}`}>
        {!uploadedFile ? (
          <>
            <p className='bottom-para'>Detects and reads vehicle license plates automatically from images using 
            advanced deep learning and OCR techniques</p>
            <div className="img-contain">
              <img src={btm_img} alt="" />
            </div>
          </>
        ) : (
          <div className="p-6 w-full">
            <div className="w-full grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="rounded-xl border border-[#1e2b32] bg-[#0f171b] overflow-hidden relative">
                {isUploading && (
                  <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/60">
                    <div className="w-12 h-12 border-4 border-lime-400 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                )}
                {uploadedFile ? (
                  <img src={URL.createObjectURL(uploadedFile)} alt="Uploaded" className="w-full h-[520px] object-cover" />
                ) : (
                  <div className="w-full h-[520px] bg-[#0b1216] flex items-center justify-center text-[#8aa0a9]">Sample Car Image</div>
                )}
              </div>

              <div className="space-y-4">
                <div className="rounded-xl border border-[#1e2b32] bg-[#0f171b]">
                  <button onClick={() => { setVehicleDetailsExpanded(!vehicleDetailsExpanded); if (!vehicleDetailsExpanded) { setOwnerInfoExpanded(false); setPastViolationsExpanded(false); } }} className="w-full px-5 py-3 flex items-center justify-between">
                    <span className="font-semibold" style={{ color: 'rgba(117, 218, 180, 1)' }}>Vehicle Details</span>
                    {vehicleDetailsExpanded ? <ChevronUp className="w-5 h-5 text-[#8aa0a9]" /> : <ChevronDown className="w-5 h-5 text-[#8aa0a9]" />}
                  </button>
                  {vehicleDetailsExpanded && (
                    <div className="px-5 pb-5">
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                        <InfoItem label="License Number" value={getValue(detected?.licenseNumber)} />
                        <InfoItem label="Chassis Number(VIN)" value={getValue(detected?.chassisNumber)} />
                        <InfoItem label="Make" value={getValue(detected?.make)} />
                        <InfoItem label="Model" value={getValue(detected?.model)} />
                        <InfoItem label="Colour" value={getValue(detected?.color)} />
                        <InfoItem label="Type" value={getValue(detected?.type)} />
                        <InfoItem label="Transport Type" value={getValue(detected?.transportType)} />
                        <InfoItem label="Fuel" value={getValue(detected?.fuel)} />
                      </div>
                    </div>
                  )}
                </div>

                <div className="rounded-xl border border-[#1e2b32] bg-[#0f171b]">
                  <button onClick={() => { setOwnerInfoExpanded(!ownerInfoExpanded); if (!ownerInfoExpanded) { setVehicleDetailsExpanded(false); setPastViolationsExpanded(false); } }} className="w-full px-5 py-3 flex items-center justify-between">
                    <span className="font-semibold" style={{ color: 'rgba(117, 218, 180, 1)' }}>Owner Info</span>
                    {ownerInfoExpanded ? <ChevronUp className="w-5 h-5 text-[#8aa0a9]" /> : <ChevronDown className="w-5 h-5 text-[#8aa0a9]" />}
                  </button>
                  {ownerInfoExpanded && (
                    <div className="px-5 pb-5">
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                        <InfoItem label="National ID" value={getValue(detected?.nationalId)} />
                        <InfoItem label="Owner Name" value={getValue(detected?.ownerName)} />
                        <InfoItem label="Registration Validity" value={getValue(detected?.registrationValidity)} />
                        <InfoItem label="Insurance Validity" value={getValue(detected?.insuranceValidity)} />
                        <InfoItem label="MVPI Validity" value={getValue(detected?.mvpiValidity)} />
                        <InfoItem label="Vehicle Status" value={getValue(detected?.vehicleStatus)} />
                        <InfoItem label="Traffic Violations" value={getValue(detected?.trafficViolations)} />
                      </div>
                    </div>
                  )}
                </div>

                <div className="rounded-xl border border-[#1e2b32] bg-[#0f171b]">
                  <button onClick={() => { setPastViolationsExpanded(!pastViolationsExpanded); if (!pastViolationsExpanded) { setVehicleDetailsExpanded(false); setOwnerInfoExpanded(false); } }} className="w-full px-5 py-3 flex items-center justify-between">
                    <span className="font-semibold" style={{ color: 'rgba(117, 218, 180, 1)' }}>Past Violations</span>
                    {pastViolationsExpanded ? <ChevronUp className="w-5 h-5 text-[#8aa0a9]" /> : <ChevronDown className="w-5 h-5 text-[#8aa0a9]" />}
                  </button>
                  {pastViolationsExpanded && (
                    <div className="px-5 pb-5 space-y-3">
                      <div className="text-[#cde6cf] text-xs sm:text-sm leading-relaxed">
                        <span className="text-lime-400 font-semibold">Going over 80 km/h</span>
                        <span className="text-[#6fbf73]"> | </span>
                        <span className="text-[#8aa0a9]">Date - -NA-</span>
                        <span className="text-[#6fbf73]"> | </span>
                        <span className="text-[#8aa0a9]">Time - -NA-</span>
                        <span className="text-[#6fbf73]"> | </span>
                        <span className="text-[#8aa0a9]">Speed Fines - -NA-</span>
                        <span className="text-[#6fbf73]"> | </span>
                        <span className="text-[#8aa0a9]">Status - -NA-</span>
                      </div>
                      <div className="h-px bg-[#1e2b32]"></div>
                      <div className="text-[#cde6cf] text-xs sm:text-sm leading-relaxed">
                        <span className="text-lime-400 font-semibold">Wrong parking</span>
                        <span className="text-[#6fbf73]"> | </span>
                        <span className="text-[#8aa0a9]">Date - -NA-</span>
                        <span className="text-[#6fbf73]"> | </span>
                        <span className="text-[#8aa0a9]">Time - -NA-</span>
                        <span className="text-[#6fbf73]"> | </span>
                        <span className="text-[#8aa0a9]">Fine - -NA-</span>
                        <span className="text-[#6fbf73]"> | </span>
                        <span className="text-[#8aa0a9]">Status - -NA-</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Hidden inputs for upload/capture triggers */}
      <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept="image/*" className="hidden" />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        capture="environment"
        onChange={(e) => {
          const files = e.target.files;
          if (files && files.length > 0) handleFileUpload(files[0]);
        }}
      />

      {/* Camera modal */}
      {isCameraOpen && (
        <div className="fixed inset-0 z-20 bg-black/80 flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-gray-900 rounded-xl border border-gray-700 overflow-hidden">
            <div className="flex items-center justify-between p-3 border-b border-gray-800">
              <span className="text-gray-200 font-medium">Camera</span>
              <button onClick={closeCamera} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4">
              <div className="aspect-video bg-black rounded-lg overflow-hidden">
                <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-contain" />
              </div>
              <div className="mt-4 flex justify-center gap-4">
                <button onClick={captureSnapshot} className="px-6 py-3 bg-lime-500 text-gray-900 font-semibold rounded-lg hover:bg-lime-400">Capture</button>
                <button onClick={closeCamera} className="px-6 py-3 bg-gray-700 text-white font-semibold rounded-lg hover:bg-gray-600">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Status bar */}
      <div className="status-bar">
        <div className="status-content">
          <div className="status-info">
            <div className="status-item">
              <span>File Name -</span>
              <span className='file-name'>{fileName}</span>
            </div>
            <div className="status-item">
              <span>File Type -</span>
              <span>{fileType}</span>
            </div>
            <div className="status-item">
              <span>File Size -</span>
              <span>{fileSizeMb}</span>
            </div>
            <div className="status-item">
              <span>Bandwidth -</span>
              <span>{networkInfo?.downlink ? `${networkInfo.downlink} Mbps` : '--NA--'}</span>
            </div>
            <div className="status-item">
              <span>Upload Time -</span>
              <span>{uploadTime}</span>
            </div>
            <div className="status-item">
              <span>Response Time -</span>
              <span>{responseTime}</span>
            </div>
            <div className="status-item">
              <span>Network Type -</span>
              <span>{networkInfo?.effectiveType ?? '--NA--'}</span>
            </div>
          </div>
          <div className="status-indicators">
            <div className="status-indicator">
              <div className="status-disconnect"></div>
              <span>Computer Vision</span>
            </div>
            <div className="status-indicator">
              <div className="status-disconnect"></div>
              <span>Backend</span>
            </div>
            <div className="status-indicator">
              <div className="status-dot"></div>
              <span>APIs</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UploadPage;


