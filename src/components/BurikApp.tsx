"use client";

import React, { useState, useRef, useCallback } from 'react';
import { Upload, Download, RefreshCw, Image as ImageIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function BurikApp() {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [pixelatedImage, setPixelatedImage] = useState<string | null>(null);
  const [pixelLevel, setPixelLevel] = useState<number>(50);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [dragActive, setDragActive] = useState<boolean>(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setSelectedImage(event.target?.result as string);
        setPixelatedImage(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        setSelectedImage(event.target?.result as string);
        setPixelatedImage(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const processImage = useCallback(() => {
    if (!selectedImage) return;
    setIsProcessing(true);

    setTimeout(() => {
      const img = new Image();
      img.src = selectedImage;
      img.onload = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // "WhatsApp Burik" formula: map 1-100 → internal 30-100
        const effectiveLevel = 30 + (pixelLevel / 100) * 70;
        const minRes = 40;
        const maxRes = 400;
        const currentRes = maxRes - ((effectiveLevel - 30) / 70) * (maxRes - minRes);

        const scale = currentRes / Math.max(img.width, img.height);
        const w = img.width * scale;
        const h = img.height * scale;

        // Pass 1: Downsample
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = w;
        tempCanvas.height = h;
        const tctx = tempCanvas.getContext('2d');
        if (!tctx) return;
        tctx.drawImage(img, 0, 0, w, h);

        // Pass 2: JPEG artifacts
        const quality = 1 - (effectiveLevel / 105);
        const compressedData = tempCanvas.toDataURL('image/jpeg', quality);

        // Pass 3: Upscale
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
          setIsProcessing(false);
        };
      };
    }, 500);
  }, [selectedImage, pixelLevel]);

  const handleDownload = () => {
    if (!pixelatedImage) return;
    const link = document.createElement('a');
    link.download = `burik-${pixelLevel}.png`;
    link.href = pixelatedImage;
    link.click();
  };

  const reset = () => {
    setSelectedImage(null);
    setPixelatedImage(null);
    setPixelLevel(50);
  };

  return (
    <div className="min-h-screen text-[#F5F5F7] flex flex-col font-sans selection:bg-accent/30">
      {/* Navbar */}
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
        <div className="w-full max-w-[420px] space-y-6">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <h2
              className="text-3xl font-bold tracking-tight mb-2 uppercase text-white"
              style={{ fontFamily: "'DotGothic16', monospace" }}
            >
              Burik Image Generator
            </h2>
            <p className="text-sm text-[#86868B]">Mengubah foto lu jadi burik kaya epep😂</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-card backdrop-blur-3xl border border-border p-6 rounded-[24px] shadow-2xl space-y-6"
          >
            {!selectedImage ? (
              <div
                className={`border-2 border-dashed rounded-2xl p-14 flex flex-col items-center gap-4 cursor-pointer transition-all ${
                  dragActive
                    ? 'border-accent bg-accent/5'
                    : 'border-border hover:border-[#444] bg-white/[0.02]'
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="p-4 bg-white/5 rounded-full">
                  <Upload className={`w-8 h-8 ${dragActive ? 'text-accent' : 'text-[#86868B]'}`} />
                </div>
                <span className="text-sm font-medium text-[#86868B]">Click or drag file here</span>
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={handleImageUpload}
                />
              </div>
            ) : (
              <div className="space-y-6">
                {/* Image Previews */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center px-2">
                      <span className="text-[10px] font-black uppercase tracking-widest text-[#444]">Source</span>
                      <span className="text-[10px] font-medium text-[#86868B]">Original Qual</span>
                    </div>
                    <div className="aspect-video bg-black/40 rounded-2xl overflow-hidden border border-white/5 flex items-center justify-center">
                      <img src={selectedImage} alt="Original" className="max-w-full max-h-full object-contain" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between items-center px-2">
                      <span className="text-[10px] font-black uppercase tracking-widest text-accent">Output</span>
                      <span className="text-[10px] font-medium text-accent/60">Burik Applied</span>
                    </div>
                    <div className="aspect-video bg-black/40 rounded-2xl overflow-hidden border border-white/5 flex items-center justify-center relative">
                      {pixelatedImage ? (
                        <motion.img
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          src={pixelatedImage}
                          alt="Result"
                          className="max-w-full max-h-full object-contain"
                        />
                      ) : (
                        <div className="flex flex-col items-center gap-2">
                          <ImageIcon className="w-8 h-8 text-[#222]" />
                          <div className="text-[10px] text-[#444] font-bold uppercase tracking-tighter italic">
                            Waiting for process...
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Controls */}
                <div className="space-y-4 pt-2">
                  <div className="flex justify-between items-center text-xs font-medium px-1">
                    <span className="text-[#86868B]">Kehancuran</span>
                    <span className="text-accent font-bold">{pixelLevel}%</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="100"
                    step="1"
                    value={pixelLevel}
                    onChange={(e) => setPixelLevel(parseInt(e.target.value))}
                    className="cursor-pointer"
                  />
                </div>

                <div className="flex flex-col gap-3">
                  <button
                    onClick={processImage}
                    disabled={isProcessing}
                    className="w-full bg-accent hover:bg-accent-hover disabled:bg-white/10 disabled:text-[#86868B] text-white py-3.5 rounded-full font-semibold transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                  >
                    {isProcessing ? (
                      <RefreshCw className="animate-spin" size={18} />
                    ) : (
                      "Proses Gambar"
                    )}
                  </button>

                  <div className="flex gap-2">
                    <button
                      onClick={reset}
                      className="flex-1 bg-white/5 hover:bg-white/10 text-sm py-3 rounded-full font-medium transition-all"
                    >
                      Reset
                    </button>
                    <button
                      onClick={handleDownload}
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
        </div>
      </main>

      <canvas ref={canvasRef} className="hidden" />

      <footer className="py-8 text-center text-[#444] text-[10px] font-bold uppercase tracking-[0.2em]">
        © 2026 Burik Generator
      </footer>
    </div>
  );
}
