"use client";

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Upload, Download, RefreshCw, Image as ImageIcon, Video, Film } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

type Tab = 'image' | 'video';

export default function BurikApp() {
  const [tab, setTab] = useState<Tab>('image');

  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [pixelatedImage, setPixelatedImage] = useState<string | null>(null);
  const [imagePixelLevel, setImagePixelLevel] = useState<number>(50);
  const [isImageProcessing, setIsImageProcessing] = useState<boolean>(false);
  const [imageDragActive, setImageDragActive] = useState<boolean>(false);
  const [imageHasProcessed, setImageHasProcessed] = useState<boolean>(false);

  const [selectedVideo, setSelectedVideo] = useState<File | null>(null);
  const [selectedVideoURL, setSelectedVideoURL] = useState<string | null>(null);
  const [processedVideoURL, setProcessedVideoURL] = useState<string | null>(null);
  const [videoPixelLevel, setVideoPixelLevel] = useState<number>(50);
  const [isVideoProcessing, setIsVideoProcessing] = useState<boolean>(false);
  const [videoDragActive, setVideoDragActive] = useState<boolean>(false);
  const [videoHasProcessed, setVideoHasProcessed] = useState<boolean>(false);
  const [videoProgress, setVideoProgress] = useState<string>('');
  const [ffmpegLoaded, setFfmpegLoaded] = useState<boolean>(false);
  const [ffmpegLoading, setFfmpegLoading] = useState<boolean>(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const imageFileRef = useRef<HTMLInputElement | null>(null);
  const videoFileRef = useRef<HTMLInputElement | null>(null);
  const ffmpegRef = useRef<FFmpeg | null>(null);

  useEffect(() => {
    return () => {
      if (selectedVideoURL) URL.revokeObjectURL(selectedVideoURL);
      if (processedVideoURL) URL.revokeObjectURL(processedVideoURL);
    };
  }, [selectedVideoURL, processedVideoURL]);

  const loadFFmpeg = async () => {
    if (ffmpegLoaded || ffmpegLoading) return;
    setFfmpegLoading(true);
    try {
      const ffmpeg = new FFmpeg();
      ffmpegRef.current = ffmpeg;
      const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';
      await ffmpeg.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
      });
      setFfmpegLoaded(true);
    } catch (e) {
      console.error('FFmpeg load failed', e);
    } finally {
      setFfmpegLoading(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setSelectedImage(ev.target?.result as string);
      setPixelatedImage(null);
      setImageHasProcessed(false);
    };
    reader.readAsDataURL(file);
  };

  const handleImageDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setImageDragActive(e.type === 'dragenter' || e.type === 'dragover');
  };

  const handleImageDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setImageDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setSelectedImage(ev.target?.result as string);
      setPixelatedImage(null);
      setImageHasProcessed(false);
    };
    reader.readAsDataURL(file);
  };

  const processImage = useCallback(() => {
    if (!selectedImage) return;
    setIsImageProcessing(true);
    setTimeout(() => {
      const img = new Image();
      img.src = selectedImage;
      img.onload = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        const effectiveLevel = 30 + (imagePixelLevel / 100) * 70;
        const minRes = 40;
        const maxRes = 400;
        const currentRes = maxRes - ((effectiveLevel - 30) / 70) * (maxRes - minRes);
        const scale = currentRes / Math.max(img.width, img.height);
        const w = img.width * scale;
        const h = img.height * scale;
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = w;
        tempCanvas.height = h;
        const tctx = tempCanvas.getContext('2d');
        if (!tctx) return;
        tctx.drawImage(img, 0, 0, w, h);
        const quality = 1 - (effectiveLevel / 105);
        const compressedData = tempCanvas.toDataURL('image/jpeg', quality);
        const finalImg = new Image();
        finalImg.src = compressedData;
        finalImg.onload = () => {
          canvas.width = img.width;
          canvas.height = img.height;
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.imageSmoothingEnabled = false;
          ctx.filter = `contrast(${100 - (effectiveLevel - 30) / 10}%) brightness(${100 + (effectiveLevel - 30) / 15}%)`;
          ctx.drawImage(finalImg, 0, 0, w, h, 0, 0, canvas.width, canvas.height);
          ctx.filter = 'none';
          setPixelatedImage(canvas.toDataURL('image/png'));
          setIsImageProcessing(false);
          setImageHasProcessed(true);
        };
      };
    }, 500);
  }, [selectedImage, imagePixelLevel]);

  const handleImageDownload = () => {
    if (!pixelatedImage) return;
    const link = document.createElement('a');
    link.download = `burik-${imagePixelLevel}.png`;
    link.href = pixelatedImage;
    link.click();
  };

  const resetImage = () => {
    setSelectedImage(null);
    setPixelatedImage(null);
    setImagePixelLevel(50);
    setImageHasProcessed(false);
  };

  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (selectedVideoURL) URL.revokeObjectURL(selectedVideoURL);
    setSelectedVideo(file);
    setSelectedVideoURL(URL.createObjectURL(file));
    setProcessedVideoURL(null);
    setVideoHasProcessed(false);
    setVideoProgress('');
    loadFFmpeg();
  };

  const handleVideoDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setVideoDragActive(e.type === 'dragenter' || e.type === 'dragover');
  };

  const handleVideoDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setVideoDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (!file || !file.type.startsWith('video/')) return;
    if (selectedVideoURL) URL.revokeObjectURL(selectedVideoURL);
    setSelectedVideo(file);
    setSelectedVideoURL(URL.createObjectURL(file));
    setProcessedVideoURL(null);
    setVideoHasProcessed(false);
    setVideoProgress('');
    loadFFmpeg();
  };

  const processVideo = async () => {
    if (!selectedVideo || !ffmpegRef.current || !ffmpegLoaded) return;
    setIsVideoProcessing(true);
    setVideoProgress('Menulis file...');
    setProcessedVideoURL(null);

    try {
      const ffmpeg = ffmpegRef.current;
      const effectiveLevel = 30 + (videoPixelLevel / 100) * 70;
      const scaleW = Math.round(128 + (1 - (effectiveLevel - 30) / 70) * (640 - 128));
      const fps = Math.round(5 + (1 - (effectiveLevel - 30) / 70) * 25);
      const videoBitrate = Math.round(50 + (1 - (effectiveLevel - 30) / 70) * 2000);
      const audioSampleRate = Math.round(4000 + (1 - (effectiveLevel - 30) / 70) * 40000);
      const audioBitrate = Math.round(8 + (1 - (effectiveLevel - 30) / 70) * 120);
      const lowpassFreq = Math.round(300 + (1 - (effectiveLevel - 30) / 70) * 15000);

      ffmpeg.on('progress', ({ progress }) => {
        setVideoProgress(`Memproses... ${Math.round(progress * 100)}%`);
      });

      const ext = selectedVideo.name.slice(selectedVideo.name.lastIndexOf('.'));
      const inputName = `input${ext}`;
      await ffmpeg.writeFile(inputName, await fetchFile(selectedVideo));
      setVideoProgress('Menjalankan FFmpeg...');

      await ffmpeg.exec([
        '-i', inputName,
        '-vf', `scale=${scaleW}:-2:flags=neighbor,fps=${fps}`,
        '-vcodec', 'libx264',
        '-b:v', `${videoBitrate}k`,
        '-acodec', 'aac',
        '-ar', `${audioSampleRate}`,
        '-b:a', `${audioBitrate}k`,
        '-af', `lowpass=f=${lowpassFreq}`,
        '-movflags', '+faststart',
        'output.mp4',
      ]);

      setVideoProgress('Menyiapkan hasil...');
      const data = await ffmpeg.readFile('output.mp4');
      const blob = new Blob([data], { type: 'video/mp4' });
      if (processedVideoURL) URL.revokeObjectURL(processedVideoURL);
      setProcessedVideoURL(URL.createObjectURL(blob));
      setVideoHasProcessed(true);
      setVideoProgress('');
      await ffmpeg.deleteFile(inputName);
      await ffmpeg.deleteFile('output.mp4');
    } catch (e) {
      console.error(e);
      setVideoProgress('Gagal memproses video.');
    } finally {
      setIsVideoProcessing(false);
    }
  };

  const handleVideoDownload = () => {
    if (!processedVideoURL) return;
    const link = document.createElement('a');
    link.download = `burik-video-${videoPixelLevel}.mp4`;
    link.href = processedVideoURL;
    link.click();
  };

  const resetVideo = () => {
    if (selectedVideoURL) URL.revokeObjectURL(selectedVideoURL);
    if (processedVideoURL) URL.revokeObjectURL(processedVideoURL);
    setSelectedVideo(null);
    setSelectedVideoURL(null);
    setProcessedVideoURL(null);
    setVideoPixelLevel(50);
    setVideoHasProcessed(false);
    setVideoProgress('');
  };

  return (
    <div className="min-h-screen text-[#F5F5F7] flex flex-col font-sans selection:bg-accent/30">
      <nav className="h-20 flex items-center justify-between px-6 md:px-12 z-50">
        <div className="flex items-center gap-2 group cursor-default">
          <svg width="32" height="32" viewBox="0 0 40 40" className="drop-shadow-[0_0_8px_rgba(232,160,32,0.5)]">
            <rect width="40" height="40" rx="10" fill="#E8A020" />
            <path d="M10 10H14V14H10V10ZM14 14H18V18H14V14ZM18 18H22V22H18V18ZM22 22H26V26H22V22ZM26 26H30V30H26V26ZM10 30H14V26H10V30ZM30 10H26V14H30V10Z" fill="white" />
          </svg>
          <div className="flex flex-col -space-y-1">
            <span className="font-bold text-xl tracking-tighter text-white">
              BURIK<span className="text-accent">.</span>
            </span>
            <span className="text-[8px] font-black uppercase tracking-[0.3em] text-[#444]">Generator</span>
          </div>
        </div>
        <a
          href="https://wa.me/62895423300395"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs font-bold tracking-widest uppercase text-[#86868B] hover:text-accent transition-colors flex items-center gap-2"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
          Givy
        </a>
      </nav>

      <main className="flex-1 flex flex-col items-center justify-center p-6 pb-20">
        <div className="w-full max-w-[860px] space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <h2
              className="text-3xl font-bold tracking-tight mb-2 uppercase text-white"
              style={{ fontFamily: "'DotGothic16', monospace" }}
            >
              Burik Generator
            </h2>
            <p className="text-sm text-[#86868B]">Mengubah foto & video lu jadi burik kaya epep😂</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-card backdrop-blur-3xl border border-border p-6 rounded-[24px] shadow-2xl space-y-6"
          >
            <div className="flex gap-1 p-1 bg-white/5 rounded-full w-fit mx-auto">
              <button
                onClick={() => setTab('image')}
                className={`flex items-center gap-2 px-5 py-2 rounded-full text-sm font-semibold transition-all ${
                  tab === 'image' ? 'bg-accent text-white' : 'text-[#86868B] hover:text-white'
                }`}
              >
                <ImageIcon size={14} />
                Image
              </button>
              <button
                onClick={() => { setTab('video'); loadFFmpeg(); }}
                className={`flex items-center gap-2 px-5 py-2 rounded-full text-sm font-semibold transition-all ${
                  tab === 'video' ? 'bg-accent text-white' : 'text-[#86868B] hover:text-white'
                }`}
              >
                <Film size={14} />
                Video
              </button>
            </div>

            <AnimatePresence mode="wait">
              {tab === 'image' && (
                <motion.div
                  key="image"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.15 }}
                  className="space-y-5"
                >
                  {!selectedImage ? (
                    <div
                      className={`border-2 border-dashed rounded-2xl p-14 flex flex-col items-center gap-3 cursor-pointer transition-all ${
                        imageDragActive ? 'border-accent bg-accent/5' : 'border-border hover:border-[#444] bg-white/[0.02]'
                      }`}
                      onDragEnter={handleImageDrag}
                      onDragLeave={handleImageDrag}
                      onDragOver={handleImageDrag}
                      onDrop={handleImageDrop}
                      onClick={() => imageFileRef.current?.click()}
                    >
                      <div className="p-4 bg-white/5 rounded-full">
                        <Upload className={`w-8 h-8 ${imageDragActive ? 'text-accent' : 'text-[#86868B]'}`} />
                      </div>
                      <span className="text-sm font-medium text-[#86868B]">Click or drag file here</span>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-[#444]">PNG · JPG · WEBP</span>
                      <input ref={imageFileRef} type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                    </div>
                  ) : (
                    <div className="space-y-5">
                      <div className="space-y-3">
                        <div className="flex justify-between items-center px-1">
                          <span className="text-[#86868B] text-xs font-medium">Kehancuran</span>
                          <span className="text-accent font-bold text-xs">{imagePixelLevel}%</span>
                        </div>
                        <input
                          type="range" min="1" max="100" step="1"
                          value={imagePixelLevel}
                          onChange={(e) => setImagePixelLevel(parseInt(e.target.value))}
                          className="cursor-pointer"
                        />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <span className="text-[10px] font-black uppercase tracking-widest text-[#444] px-1">Before</span>
                          <div className="aspect-square bg-black/40 rounded-2xl overflow-hidden border border-white/5 flex items-center justify-center">
                            <img src={selectedImage} alt="Original" className="max-w-full max-h-full object-contain" />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <span className="text-[10px] font-black uppercase tracking-widest text-accent px-1">After</span>
                          <div className="aspect-square bg-black/40 rounded-2xl overflow-hidden border border-white/5 flex items-center justify-center">
                            {pixelatedImage ? (
                              <motion.img initial={{ opacity: 0 }} animate={{ opacity: 1 }} src={pixelatedImage} alt="Result" className="max-w-full max-h-full object-contain" />
                            ) : (
                              <div className="flex flex-col items-center gap-2">
                                <ImageIcon className="w-8 h-8 text-[#222]" />
                                <div className="text-[10px] text-[#444] font-bold uppercase tracking-tighter italic">Waiting for process...</div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col gap-3">
                        <button
                          onClick={processImage}
                          disabled={isImageProcessing}
                          className="w-full bg-accent hover:bg-accent-hover disabled:bg-white/10 disabled:text-[#86868B] text-white py-3.5 rounded-full font-semibold transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                        >
                          {isImageProcessing ? <RefreshCw className="animate-spin" size={18} /> : imageHasProcessed ? 'Proses Ulang' : 'Proses Gambar'}
                        </button>
                        <div className="flex gap-2">
                          <button onClick={resetImage} className="flex-1 bg-white/5 hover:bg-white/10 text-sm py-3 rounded-full font-medium transition-all">Reset</button>
                          <button
                            onClick={handleImageDownload}
                            disabled={!pixelatedImage}
                            className="flex-1 bg-white/10 hover:bg-white/15 disabled:opacity-30 disabled:cursor-not-allowed text-sm py-3 rounded-full font-medium transition-all flex items-center justify-center gap-2"
                          >
                            <Download size={14} />
                            Download
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </motion.div>
              )}

              {tab === 'video' && (
                <motion.div
                  key="video"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.15 }}
                  className="space-y-5"
                >
                  {!selectedVideoURL ? (
                    <div
                      className={`border-2 border-dashed rounded-2xl p-14 flex flex-col items-center gap-3 cursor-pointer transition-all ${
                        videoDragActive ? 'border-accent bg-accent/5' : 'border-border hover:border-[#444] bg-white/[0.02]'
                      }`}
                      onDragEnter={handleVideoDrag}
                      onDragLeave={handleVideoDrag}
                      onDragOver={handleVideoDrag}
                      onDrop={handleVideoDrop}
                      onClick={() => videoFileRef.current?.click()}
                    >
                      <div className="p-4 bg-white/5 rounded-full">
                        <Upload className={`w-8 h-8 ${videoDragActive ? 'text-accent' : 'text-[#86868B]'}`} />
                      </div>
                      <span className="text-sm font-medium text-[#86868B]">Click or drag file here</span>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-[#444]">MP4 · MOV · WEBM</span>
                      {ffmpegLoading && (
                        <span className="text-[10px] text-accent/60 font-bold uppercase tracking-widest flex items-center gap-2">
                          <RefreshCw size={10} className="animate-spin" />
                          Loading FFmpeg...
                        </span>
                      )}
                      <input ref={videoFileRef} type="file" className="hidden" accept="video/*" onChange={handleVideoUpload} />
                    </div>
                  ) : (
                    <div className="space-y-5">
                      <div className="space-y-3">
                        <div className="flex justify-between items-center px-1">
                          <span className="text-[#86868B] text-xs font-medium">Kehancuran</span>
                          <span className="text-accent font-bold text-xs">{videoPixelLevel}%</span>
                        </div>
                        <input
                          type="range" min="1" max="100" step="1"
                          value={videoPixelLevel}
                          onChange={(e) => setVideoPixelLevel(parseInt(e.target.value))}
                          className="cursor-pointer"
                        />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <span className="text-[10px] font-black uppercase tracking-widest text-[#444] px-1">Before</span>
                          <div className="aspect-square bg-black/40 rounded-2xl overflow-hidden border border-white/5 flex items-center justify-center">
                            <video src={selectedVideoURL} controls className="max-w-full max-h-full" />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <span className="text-[10px] font-black uppercase tracking-widest text-accent px-1">After</span>
                          <div className="aspect-square bg-black/40 rounded-2xl overflow-hidden border border-white/5 flex items-center justify-center">
                            {processedVideoURL ? (
                              <motion.video initial={{ opacity: 0 }} animate={{ opacity: 1 }} src={processedVideoURL} controls className="max-w-full max-h-full" />
                            ) : (
                              <div className="flex flex-col items-center gap-2">
                                {isVideoProcessing ? (
                                  <>
                                    <RefreshCw className="w-8 h-8 text-accent animate-spin" />
                                    <div className="text-[10px] text-accent/70 font-bold uppercase tracking-tighter text-center px-4">{videoProgress}</div>
                                  </>
                                ) : (
                                  <>
                                    <Video className="w-8 h-8 text-[#222]" />
                                    <div className="text-[10px] text-[#444] font-bold uppercase tracking-tighter italic">Waiting for process...</div>
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col gap-3">
                        <button
                          onClick={processVideo}
                          disabled={isVideoProcessing || !ffmpegLoaded}
                          className="w-full bg-accent hover:bg-accent-hover disabled:bg-white/10 disabled:text-[#86868B] text-white py-3.5 rounded-full font-semibold transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                        >
                          {isVideoProcessing ? (
                            <><RefreshCw className="animate-spin" size={18} />{videoProgress || 'Memproses...'}</>
                          ) : ffmpegLoading ? (
                            <><RefreshCw className="animate-spin" size={18} />Loading FFmpeg...</>
                          ) : videoHasProcessed ? 'Proses Ulang' : 'Proses Video'}
                        </button>
                        <div className="flex gap-2">
                          <button onClick={resetVideo} className="flex-1 bg-white/5 hover:bg-white/10 text-sm py-3 rounded-full font-medium transition-all">Reset</button>
                          <button
                            onClick={handleVideoDownload}
                            disabled={!processedVideoURL}
                            className="flex-1 bg-white/10 hover:bg-white/15 disabled:opacity-30 disabled:cursor-not-allowed text-sm py-3 rounded-full font-medium transition-all flex items-center justify-center gap-2"
                          >
                            <Download size={14} />
                            Download
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </main>

      <canvas ref={canvasRef} className="hidden" />

      <footer className="py-8 text-center text-[#444] text-[10px] font-bold uppercase tracking-[0.2em]">
        © 2026 Burik Generator
      </footer>
    </div>
  );
}
