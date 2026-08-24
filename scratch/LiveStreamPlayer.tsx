"use client";

import { useEffect, useRef, useState } from "react";
import AgoraRTC, { ICameraVideoTrack, IMicrophoneAudioTrack } from "agora-rtc-sdk-ng";
import { VideoOff, Tv, Video, Copy, Eye, EyeOff, Check, AlertTriangle, Radio, Square, Upload, Loader2, X } from "lucide-react";
import { Button } from "@components/ui/button";
import toast from "react-hot-toast";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";

type LiveStreamPlayerProps = {
    liveClassId: string;
    token: string;
    viewerToken?: string;
    channel: string;
    appId: string;
    rtmpServer?: string;
    rtmpStreamKey?: string;
    rtmpUrl?: string;
};

const LiveStreamPlayer = ({
    liveClassId,
    token,
    viewerToken = "",
    channel,
    appId,
    rtmpServer = "",
    rtmpStreamKey = "",
    rtmpUrl = ""
}: LiveStreamPlayerProps) => {
    const videoRef = useRef<HTMLDivElement>(null);
    const obsVideoRef = useRef<HTMLDivElement>(null);
    const [localVideoTrack, setLocalVideoTrack] = useState<ICameraVideoTrack | null>(null);
    const [localAudioTrack, setLocalAudioTrack] = useState<IMicrophoneAudioTrack | null>(null);
    const [remoteVideoTrack, setRemoteVideoTrack] = useState<any>(null);
    const [streamMode, setStreamMode] = useState<"WEBRTC" | "OBS">("WEBRTC");
    const [copiedServer, setCopiedServer] = useState(false);
    const [copiedKey, setCopiedKey] = useState(false);
    const [showStreamKey, setShowStreamKey] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
    const [showEndModal, setShowEndModal] = useState(false);
    const [selectedUploadType, setSelectedUploadType] = useState<"none" | "local" | "recorded">("none");
    const [localFile, setLocalFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);

    const recorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);

    const startRecording = () => {
        if (!localVideoTrack && !localAudioTrack) {
            toast.error("No audio/video track available to record.");
            return;
        }
        try {
            const tracks: MediaStreamTrack[] = [];
            if (localVideoTrack) {
                const track = localVideoTrack.getMediaStreamTrack();
                tracks.push(track);
            }
            if (localAudioTrack) {
                const track = localAudioTrack.getMediaStreamTrack();
                tracks.push(track);
            }
            
            const stream = new MediaStream(tracks);
            chunksRef.current = [];
            
            let options = { mimeType: "video/webm;codecs=vp9,opus" };
            if (!MediaRecorder.isTypeSupported(options.mimeType)) {
                options = { mimeType: "video/webm;codecs=vp8,opus" };
                if (!MediaRecorder.isTypeSupported(options.mimeType)) {
                    options = { mimeType: "video/webm" };
                }
            }
            
            const recorder = new MediaRecorder(stream, options);
            recorder.ondataavailable = (e) => {
                if (e.data && e.data.size > 0) {
                    chunksRef.current.push(e.data);
                }
            };
            
            recorder.onstop = () => {
                const blob = new Blob(chunksRef.current, { type: "video/webm" });
                setRecordedBlob(blob);
                setSelectedUploadType("recorded");
                toast.success("Recording captured successfully!");
            };
            
            recorder.start(1000);
            recorderRef.current = recorder;
            setIsRecording(true);
            toast.success("Recording started...");
        } catch (err) {
            console.error("Failed to start recording:", err);
            toast.error("Failed to start local recording.");
        }
    };

    const stopRecording = () => {
        if (recorderRef.current && recorderRef.current.state !== "inactive") {
            recorderRef.current.stop();
            setIsRecording(false);
        }
    };

    const clientRef = useRef<any>(null);
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    useEffect(() => {
        if (streamMode !== "WEBRTC") return;

        const client = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });
        clientRef.current = client;
        
        let videoTrack: ICameraVideoTrack | null = null;
        let audioTrack: IMicrophoneAudioTrack | null = null;
        let isMounted = true;

        const initAgora = async () => {
            try {
                if (!appId) {
                    toast.error("Agora App ID is missing. Please add it to your .env file to join the stream.");
                    return;
                }
                await client.join(appId, channel, token, 666666);
                
                let localTracks: any[] = [];
                
                try {
                    audioTrack = await AgoraRTC.createMicrophoneAudioTrack();
                    localTracks.push(audioTrack);
                } catch (audioErr) {
                    console.warn("Could not get audio track:", audioErr);
                    toast.error("Microphone not found or permission denied.");
                }

                try {
                    videoTrack = await AgoraRTC.createCameraVideoTrack();
                    localTracks.push(videoTrack);
                } catch (videoErr: any) {
                    console.warn("Camera not available, falling back to screen share:", videoErr);
                    
                    if (window.location.hostname !== 'localhost' && window.location.protocol !== 'https:') {
                        toast.error("Camera requires HTTPS or localhost! You are on HTTP over a network.");
                    } else {
                        toast.error("Camera not found or denied. Trying Screen Share.");
                    }

                    try {
                        const screenTrackResult = await AgoraRTC.createScreenVideoTrack({}, "auto");
                        if (Array.isArray(screenTrackResult)) {
                            videoTrack = screenTrackResult[0] as ICameraVideoTrack; 
                        } else {
                            videoTrack = screenTrackResult as unknown as ICameraVideoTrack;
                        }
                        localTracks.push(videoTrack);
                    } catch (screenErr) {
                        console.error("Screen share failed:", screenErr);
                        toast.error("Screen share also failed. Please check permissions.");
                    }
                }

                if (!isMounted) {
                    if (audioTrack) audioTrack.close();
                    if (videoTrack) videoTrack.close();
                    client.leave();
                    return;
                }

                if (audioTrack) setLocalAudioTrack(audioTrack);
                if (videoTrack) {
                    setLocalVideoTrack(videoTrack);
                }

                if (localTracks.length > 0) {
                    await client.publish(localTracks);
                }

                toast.success("Joined live stream successfully!");
            } catch (error: any) {
                if (error?.code === "OPERATION_ABORTED" || error?.message?.includes("cancel token canceled")) {
                    console.warn("Agora join aborted (likely React StrictMode). Ignoring.");
                    return;
                }
                console.error("Agora Error:", error);
                toast.error("Failed to start live stream.");
            }
        };

        initAgora();

        return () => {
            isMounted = false;
            if (audioTrack) {
                audioTrack.stop();
                audioTrack.close();
            }
            if (videoTrack) {
                videoTrack.stop();
                videoTrack.close();
            }
            if (client.connectionState !== "DISCONNECTED") {
                client.leave();
            }
            setLocalAudioTrack(null);
            setLocalVideoTrack(null);
        };
    }, [channel, token, appId, streamMode]);

    // Handle video track playback safely when DOM is ready
    useEffect(() => {
        if (localVideoTrack && videoRef.current && streamMode === "WEBRTC") {
            localVideoTrack.play(videoRef.current);
            
            return () => {
                localVideoTrack.stop();
            };
        }
    }, [localVideoTrack, streamMode]);

    // Handle OBS stream preview by joining as a subscriber (audience)
    useEffect(() => {
        if (streamMode !== "OBS") return;

        const client = AgoraRTC.createClient({ mode: "live", codec: "vp8" });
        let isMounted = true;

        const initAgoraOBSViewer = async () => {
            try {
                if (!appId) return;
                client.setClientRole("audience");

                // Join using the viewerToken (falls back to publisher token if unavailable)
                const tokenToUse = viewerToken || token;
                await client.join(appId, channel, tokenToUse, 888888);

                // Listen for remote user publishing
                client.on("user-published", async (user, mediaType) => {
                    if (user.uid === 666666) {
                        await client.subscribe(user, mediaType);
                        if (mediaType === "video" && isMounted) {
                            setRemoteVideoTrack(user.videoTrack);
                        }
                    }
                });

                client.on("user-unpublished", (user, mediaType) => {
                    if (user.uid === 666666 && mediaType === "video") {
                        setRemoteVideoTrack(null);
                    }
                });

                // Check if host is already publishing
                const hostUser = client.remoteUsers.find(u => u.uid === 666666);
                if (hostUser && hostUser.hasVideo) {
                    await client.subscribe(hostUser, "video");
                    if (isMounted) {
                        setRemoteVideoTrack(hostUser.videoTrack);
                    }
                }
            } catch (err) {
                console.error("Agora OBS Viewer Error:", err);
            }
        };

        initAgoraOBSViewer();

        return () => {
            isMounted = false;
            if (client.connectionState !== "DISCONNECTED") {
                client.leave();
            }
            setRemoteVideoTrack(null);
        };
    }, [channel, token, viewerToken, appId, streamMode]);

    useEffect(() => {
        if (remoteVideoTrack && obsVideoRef.current && streamMode === "OBS") {
            remoteVideoTrack.play(obsVideoRef.current);
            return () => {
                remoteVideoTrack.stop();
            };
        }
    }, [remoteVideoTrack, streamMode]);

    const handleSwitchMode = async (mode: "WEBRTC" | "OBS") => {
        if (mode === "OBS") {
            // Stop & Close Local Tracks
            if (localAudioTrack) {
                try {
                    localAudioTrack.stop();
                    localAudioTrack.close();
                } catch (e) {
                    console.error("Error closing audio track:", e);
                }
                setLocalAudioTrack(null);
            }
            if (localVideoTrack) {
                try {
                    localVideoTrack.stop();
                    localVideoTrack.close();
                } catch (e) {
                    console.error("Error closing video track:", e);
                }
                setLocalVideoTrack(null);
            }
            const client = clientRef.current;
            if (client && client.connectionState !== "DISCONNECTED") {
                try {
                    await client.unpublish();
                    await client.leave();
                } catch (e) {
                    console.error("Error leaving Agora channel:", e);
                }
            }
        }
        setStreamMode(mode);
    };

    const handleCopy = async (text: string, type: "server" | "key") => {
        try {
            await navigator.clipboard.writeText(text);
            if (type === "server") {
                setCopiedServer(true);
                toast.success("RTMP Server URL copied!");
                setTimeout(() => setCopiedServer(false), 2000);
            } else {
                setCopiedKey(true);
                toast.success("Stream Key copied!");
                setTimeout(() => setCopiedKey(false), 2000);
            }
        } catch (err) {
            console.error("Copy failed:", err);
            toast.error("Failed to copy credentials.");
        }
    };

    const handleEnd = () => {
        if (isRecording) {
            stopRecording();
        }
        setShowEndModal(true);
    };

    const handleConfirmEnd = async () => {
        setUploading(true);
        try {
            const userToken = localStorage.getItem("token");
            
            if (selectedUploadType !== "none") {
                let fileToUpload: File | Blob | null = null;
                let fileName = `recorded_class_${Date.now()}`;
                
                if (selectedUploadType === "local" && localFile) {
                    fileToUpload = localFile;
                    fileName = localFile.name;
                } else if (selectedUploadType === "recorded" && recordedBlob) {
                    fileToUpload = recordedBlob;
                    fileName = `browser_recording_${Date.now()}.webm`;
                    
                    try {
                        const url = URL.createObjectURL(recordedBlob);
                        const a = document.createElement("a");
                        a.href = url;
                        a.download = fileName;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        URL.revokeObjectURL(url);
                    } catch (e) {
                        console.error("Local download failed:", e);
                    }
                }
                
                if (fileToUpload) {
                    const formData = new FormData();
                    formData.append("video", fileToUpload, fileName);
                    
                    await axios.patch(`/api/v1/admin/contents/${liveClassId}`, formData, {
                        headers: { 
                            Authorization: `Bearer ${userToken}`,
                            "Content-Type": "multipart/form-data"
                        },
                        onUploadProgress: (progressEvent) => {
                            const percentCompleted = Math.round(
                                (progressEvent.loaded * 100) / (progressEvent.total || 1)
                            );
                            setUploadProgress(percentCompleted);
                        }
                    });
                    toast.success("Recording uploaded and class converted to video successfully!");
                }
            } else {
                await axios.put(`/api/v1/admin/contents/${liveClassId}/end-live`, {}, {
                    headers: { Authorization: `Bearer ${userToken}` },
                });
            }

            if (localAudioTrack) {
                localAudioTrack.stop();
                localAudioTrack.close();
            }
            if (localVideoTrack) {
                localVideoTrack.stop();
                localVideoTrack.close();
            }
            const client = clientRef.current;
            if (client && client.connectionState !== "DISCONNECTED") {
                try {
                    await client.unpublish();
                    await client.leave();
                } catch(e) {
                    console.error("Error leaving Agora channel:", e);
                }
            }
            
            toast.success("Live stream ended successfully.");
            queryClient.invalidateQueries({ queryKey: ["live-classes"] });
            navigate("/courses/content");
        } catch (error: any) {
            console.error("Error ending live:", error);
            toast.error(error.response?.data?.message || "Failed to end stream properly.");
        } finally {
            setUploading(false);
            setShowEndModal(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-black relative">
            {/* Mode Switcher Header */}
            <div className="bg-slate-900 border-b border-slate-800 p-3 flex flex-col sm:flex-row justify-between items-center gap-3 shrink-0">
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                        <Tv className="text-indigo-400 h-5 w-5 animate-pulse" />
                        <span className="font-semibold text-sm text-slate-200 tracking-wide">Stream Control Dashboard</span>
                    </div>
                    {streamMode === "WEBRTC" && (
                        <div className="flex items-center gap-2 ml-4">
                            {!isRecording ? (
                                <Button
                                    size="sm"
                                    onClick={startRecording}
                                    className="h-8 bg-red-600 hover:bg-red-500 text-white border-0 flex items-center gap-1.5"
                                >
                                    <Radio size={14} className="animate-pulse" />
                                    <span>Record Class</span>
                                </Button>
                            ) : (
                                <Button
                                    size="sm"
                                    onClick={stopRecording}
                                    className="h-8 bg-slate-850 hover:bg-slate-800 text-red-500 flex items-center gap-1.5 border border-red-500/30"
                                >
                                    <Square size={12} className="fill-red-500 text-red-500" />
                                    <span>Stop Recording</span>
                                </Button>
                            )}
                            {recordedBlob && !isRecording && (
                                <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/25">
                                    Recording Captured
                                </span>
                            )}
                        </div>
                    )}
                </div>
                <div className="flex gap-1.5 bg-slate-950 p-1 rounded-lg border border-slate-800 w-full sm:w-auto">
                    <button
                        onClick={() => handleSwitchMode("WEBRTC")}
                        className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md font-semibold text-xs transition-all ${
                            streamMode === "WEBRTC"
                                ? "bg-indigo-600 text-white shadow-md scale-[1.02]"
                                : "text-slate-400 hover:text-slate-200"
                        }`}
                    >
                        <Video size={14} />
                        <span>WebRTC</span>
                        <span className="hidden sm:inline">(Browser)</span>
                    </button>
                    <button
                        onClick={() => handleSwitchMode("OBS")}
                        className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md font-semibold text-xs transition-all ${
                            streamMode === "OBS"
                                ? "bg-indigo-600 text-white shadow-md scale-[1.02]"
                                : "text-slate-400 hover:text-slate-200"
                        }`}
                    >
                        <Tv size={14} />
                        <span>OBS</span>
                        <span className="hidden sm:inline">Studio</span>
                    </button>
                </div>
            </div>

            {/* Main Streaming Panel */}
            <div className="flex-1 relative flex items-center justify-center overflow-hidden">
                {streamMode === "WEBRTC" ? (
                    <>
                        <div ref={videoRef} className="absolute inset-0 w-full h-full [&>div>video]:object-contain bg-black" />
                        {!localVideoTrack && (
                            <div className="flex flex-col items-center justify-center text-slate-500 z-10 p-4 text-center">
                                <VideoOff size={48} className="mb-4 animate-pulse" />
                                <p className="text-sm font-medium tracking-wide">Requesting camera/screen access...</p>
                            </div>
                        )}
                    </>
                ) : (
                    /* OBS Layout: Stack on small screens, Side-by-side on large screens */
                    <div className="w-full h-full flex flex-col md:flex-row p-4 gap-4 bg-black overflow-y-auto">
                        {/* Stream Preview Container */}
                        <div className="flex-1 min-h-[300px] md:min-h-0 bg-slate-950 rounded-xl border border-slate-800 relative flex items-center justify-center overflow-hidden">
                            <div ref={obsVideoRef} className="absolute inset-0 w-full h-full [&>div>video]:object-contain bg-black" />
                            {!remoteVideoTrack && (
                                <div className="flex flex-col items-center justify-center text-slate-500 z-10 p-4 text-center">
                                    <VideoOff size={48} className="mb-4 animate-pulse" />
                                    <p className="text-sm font-medium tracking-wide text-slate-300">Waiting for OBS stream...</p>
                                    <p className="text-xs text-slate-500 mt-1">Start streaming in OBS to see the preview here.</p>
                                </div>
                            )}
                            {remoteVideoTrack && (
                                <div className="absolute top-3 left-3 bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow flex items-center gap-1 z-20">
                                    <span className="h-1.5 w-1.5 rounded-full bg-white animate-ping" />
                                    LIVE PREVIEW
                                </div>
                            )}
                        </div>

                        {/* OBS Stream Configuration Container */}
                        <div className="w-full md:w-[420px] shrink-0 p-4 sm:p-5 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl z-10 flex flex-col gap-4 text-slate-200 justify-center">
                            <div className="flex items-center gap-3 pb-3 border-b border-slate-800">
                                <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-lg shrink-0">
                                    <Tv size={20} />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-sm sm:text-base text-white">OBS Stream Configuration</h3>
                                    <p className="text-[10px] sm:text-xs text-slate-400">Use these credentials in your streaming software (OBS, vMix, etc.)</p>
                                </div>
                            </div>

                            {/* RTMP Server URL */}
                            <div className="flex flex-col gap-1.5 text-left">
                                <label className="text-[10px] sm:text-xs font-semibold text-slate-400 tracking-wider uppercase">RTMP Server URL</label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        readOnly
                                        value={rtmpServer}
                                        className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm text-slate-300 outline-none focus:border-slate-700 min-w-0"
                                    />
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => handleCopy(rtmpServer, "server")}
                                        className="bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-300 hover:text-white shrink-0 min-w-[70px] sm:min-w-[80px] h-8 sm:h-9"
                                    >
                                        {copiedServer ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                                        <span className="ml-1 text-[10px] sm:text-xs font-medium">{copiedServer ? "Copied" : "Copy"}</span>
                                    </Button>
                                </div>
                            </div>

                            {/* Stream Key */}
                            <div className="flex flex-col gap-1.5 text-left">
                                <label className="text-[10px] sm:text-xs font-semibold text-slate-400 tracking-wider uppercase">Stream Key</label>
                                <div className="flex gap-2">
                                    <input
                                        type={showStreamKey ? "text" : "password"}
                                        readOnly
                                        value={rtmpStreamKey}
                                        className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm text-slate-300 outline-none focus:border-slate-700 tracking-wider font-mono min-w-0"
                                    />
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => setShowStreamKey(!showStreamKey)}
                                        className="bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-300 hover:text-white shrink-0 h-8 sm:h-9"
                                    >
                                        {showStreamKey ? <EyeOff size={14} /> : <Eye size={14} />}
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => handleCopy(rtmpStreamKey, "key")}
                                        className="bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-300 hover:text-white shrink-0 min-w-[70px] sm:min-w-[80px] h-8 sm:h-9"
                                    >
                                        {copiedKey ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                                        <span className="ml-1 text-[10px] sm:text-xs font-medium">{copiedKey ? "Copied" : "Copy"}</span>
                                    </Button>
                                </div>
                            </div>

                            {/* Warning / Tip Box */}
                            <div className="flex gap-2 sm:gap-3 bg-amber-500/10 border border-amber-500/20 text-amber-300 p-3 sm:p-4 rounded-lg text-[10px] sm:text-xs leading-relaxed text-left">
                                <AlertTriangle size={16} className="shrink-0 text-amber-400 mt-0.5" />
                                <p>
                                    <strong>Instructions:</strong> Open OBS Studio &gt; Settings &gt; Stream. Select Service: <strong>"Custom"</strong>. Paste the Server and Stream Key above, then click <strong>"Start Streaming"</strong> in OBS.
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Footer Control Panel */}
            <div className="p-4 bg-slate-900 border-t border-slate-800 flex justify-center shrink-0">
                <Button 
                    variant="destructive" 
                    size="lg" 
                    className="font-semibold tracking-wide w-48 shadow-lg hover:shadow-red-900/25 transition-all"
                    onClick={handleEnd}
                >
                    End Live Stream
                </Button>
            </div>

            {/* End Stream and Upload Recording Modal */}
            {showEndModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-2xl w-full max-w-lg p-6 text-slate-200 flex flex-col gap-5 text-left animate-in fade-in zoom-in-95 duration-250">
                        <div className="flex justify-between items-start">
                            <div>
                                <h3 className="text-lg font-bold text-white">End Live Class</h3>
                                <p className="text-xs text-slate-400 mt-1">
                                    You are ending the live session. Select how you want to handle the recording.
                                </p>
                            </div>
                            <button 
                                onClick={() => !uploading && setShowEndModal(false)}
                                className="text-slate-400 hover:text-white"
                                disabled={uploading}
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="flex flex-col gap-3">
                            <label className="text-xs font-semibold text-slate-400">RECORDING OPTIONS</label>
                            
                            {recordedBlob && (
                                <button
                                    onClick={() => setSelectedUploadType("recorded")}
                                    className={`p-3 rounded-lg border text-left flex items-center gap-3 transition-all ${
                                        selectedUploadType === "recorded"
                                            ? "border-indigo-600 bg-indigo-500/10 text-white"
                                            : "border-slate-800 bg-slate-950 text-slate-400 hover:text-slate-205"
                                    }`}
                                    disabled={uploading}
                                >
                                    <Radio size={16} className="text-indigo-400" />
                                    <div className="flex-1">
                                        <div className="text-xs font-semibold">Use Browser Capture</div>
                                        <div className="text-[10px] text-slate-400">Save the video recorded directly from your browser stream</div>
                                    </div>
                                </button>
                            )}

                            <button
                                onClick={() => setSelectedUploadType("local")}
                                className={`p-3 rounded-lg border text-left flex items-center gap-3 transition-all ${
                                    selectedUploadType === "local"
                                        ? "border-indigo-600 bg-indigo-500/10 text-white"
                                        : "border-slate-800 bg-slate-950 text-slate-400 hover:text-slate-205"
                                    }`}
                                disabled={uploading}
                            >
                                <Upload size={16} className="text-indigo-400" />
                                <div className="flex-1">
                                    <div className="text-xs font-semibold">Upload Local Video File</div>
                                    <div className="text-[10px] text-slate-400">Select and upload an MP4 recording from OBS or local storage</div>
                                </div>
                            </button>

                            <button
                                onClick={() => setSelectedUploadType("none")}
                                className={`p-3 rounded-lg border text-left flex items-center gap-3 transition-all ${
                                    selectedUploadType === "none"
                                        ? "border-indigo-600 bg-indigo-500/10 text-white"
                                        : "border-slate-800 bg-slate-950 text-slate-400 hover:text-slate-205"
                                }`}
                                disabled={uploading}
                            >
                                <X size={16} className="text-red-400" />
                                <div className="flex-1">
                                    <div className="text-xs font-semibold">End Without Recording</div>
                                    <div className="text-[10px] text-slate-400">End the class now. You can upload the video file later.</div>
                                </div>
                            </button>
                        </div>

                        {selectedUploadType === "local" && (
                            <div className="bg-slate-950 p-4 border border-slate-800 rounded-lg flex flex-col gap-2">
                                <label className="text-xs font-semibold text-slate-400">SELECT VIDEO FILE</label>
                                <input
                                    type="file"
                                    accept="video/*"
                                    onChange={(e) => setLocalFile(e.target.files?.[0] || null)}
                                    className="text-xs text-slate-300 file:bg-indigo-600 file:text-white file:border-0 file:py-1.5 file:px-3 file:rounded-md file:mr-3 file:text-xs file:font-semibold hover:file:bg-indigo-500 cursor-pointer"
                                    disabled={uploading}
                                />
                                {localFile && (
                                    <p className="text-[10px] text-slate-400 mt-1">Selected: {localFile.name} ({(localFile.size / 1024 / 1024).toFixed(2)} MB)</p>
                                )}
                            </div>
                        )}

                        {uploading && (
                            <div className="flex flex-col gap-2">
                                <div className="flex justify-between text-xs font-semibold text-slate-400">
                                    <span className="flex items-center gap-1.5">
                                        <Loader2 className="animate-spin h-3.5 w-3.5 text-indigo-400" />
                                        {selectedUploadType === "recorded" ? "Uploading capture..." : "Uploading file..."}
                                    </span>
                                    <span>{uploadProgress}%</span>
                                </div>
                                <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                                    <div 
                                        className="bg-indigo-600 h-full transition-all duration-300" 
                                        style={{ width: `${uploadProgress}%` }}
                                    />
                                </div>
                            </div>
                        )}

                        <div className="flex justify-end gap-3 mt-2 border-t border-slate-800 pt-4">
                            <Button
                                variant="outline"
                                className="bg-transparent border-slate-700 text-slate-300 hover:text-white"
                                onClick={() => setShowEndModal(false)}
                                disabled={uploading}
                            >
                                Cancel
                            </Button>
                            <Button
                                variant="destructive"
                                onClick={handleConfirmEnd}
                                disabled={uploading || (selectedUploadType === "local" && !localFile) || (selectedUploadType === "recorded" && !recordedBlob)}
                                className="font-semibold"
                            >
                                Confirm & End Class
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default LiveStreamPlayer;
