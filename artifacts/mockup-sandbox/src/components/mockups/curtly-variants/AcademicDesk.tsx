import React, { useState } from 'react';
import { BookOpenText, Sparkles, Paperclip, CheckCircle2, User, HelpCircle, Archive, LogOut, Download, Globe, GraduationCap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function AcademicDesk() {
  const [inputText, setInputText] = useState("Cellular Respiration\n\nCellular respiration is a set of metabolic reactions and processes that take place in the cells of organisms to convert chemical energy from oxygen molecules or nutrients into adenosine triphosphate (ATP), and then release waste products. The reactions involved in respiration are catabolic reactions, which break large molecules into smaller ones, releasing energy because weak high-energy bonds, in particular in diatomic oxygen, are replaced by stronger bonds in the products. Respiration is one of the key ways a cell releases chemical energy to fuel cellular activity. The overall reaction occurs in a series of biochemical steps, some of which are redox reactions.");
  const [hasGenerated, setHasGenerated] = useState(true);
  const [files] = useState([
    { name: "Biology_Ch4_Notes.pdf", size: "2.4 MB" }
  ]);

  return (
    <div className="min-h-screen bg-[#faf7f2] text-[#4a3b32] font-sans selection:bg-[#d97706]/20">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full bg-[#faf7f2]/90 backdrop-blur-md border-b border-[#d97706]/30">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3 text-[#92400e]">
            <BookOpenText className="w-6 h-6" />
            <span className="text-2xl font-serif font-bold tracking-tight">Curtly</span>
          </div>

          <nav className="flex items-center gap-6">
            <button className="flex items-center gap-2 text-[#786452] hover:text-[#92400e] transition-colors text-sm font-serif">
              <Archive className="w-4 h-4" /> Archives
            </button>
            <div className="h-4 w-px bg-[#d97706]/30"></div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-[#f5f0e8] border border-[#d97706]/30 flex items-center justify-center text-[#92400e]">
                <User className="w-4 h-4" />
              </div>
              <button className="text-[#786452] hover:text-[#92400e] transition-colors">
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 h-[calc(100vh-4rem)]">
        <div className="flex flex-col lg:flex-row gap-8 h-full pb-8">
          
          {/* Left Panel - Notebook */}
          <div className="lg:w-1/2 flex flex-col relative h-full">
            <div className="flex-1 bg-[#f5f0e8] rounded-xl shadow-[0_4px_20px_-4px_rgba(146,64,14,0.1)] border border-[#d97706]/20 overflow-hidden relative flex flex-col">
              {/* Notebook binding styling */}
              <div className="absolute left-0 top-0 bottom-0 w-8 border-r-2 border-double border-[#d97706]/20 bg-gradient-to-r from-[#eaddcc] to-[#f5f0e8]"></div>
              
              <div className="flex-1 pl-12 pr-6 py-6 flex flex-col relative z-10">
                <h2 className="text-xl font-serif text-[#92400e] mb-6 flex items-center gap-2">
                  <span className="italic">Jot your thoughts</span>
                </h2>
                
                {/* Textarea with notebook lines */}
                <div 
                  className="flex-1 relative"
                  style={{
                    backgroundImage: 'repeating-linear-gradient(transparent, transparent 31px, rgba(217,119,6,0.1) 31px, rgba(217,119,6,0.1) 32px)',
                    backgroundAttachment: 'local',
                  }}
                >
                  <textarea
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    className="w-full h-full bg-transparent resize-none focus:outline-none text-[#5c4a3d] font-serif leading-[32px] pt-1"
                    placeholder="Begin writing here..."
                  />
                </div>

                {/* File Upload Index Cards */}
                <div className="mt-6 flex flex-wrap gap-3">
                  {files.map((file, i) => (
                    <div key={i} className="flex items-center gap-3 bg-[#faf7f2] border border-[#d97706]/30 px-4 py-2 rounded shadow-sm">
                      <Paperclip className="w-4 h-4 text-[#d97706]" />
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-[#5c4a3d]">{file.name}</span>
                        <span className="text-xs text-[#8a7561]">{file.size}</span>
                      </div>
                    </div>
                  ))}
                  <button className="flex items-center justify-center w-10 h-[52px] border border-dashed border-[#d97706]/50 rounded hover:bg-[#d97706]/5 transition-colors text-[#d97706]">
                    <span className="text-xl font-serif">+</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Wax Seal Generate Button */}
            <div className="absolute -right-8 top-1/2 -translate-y-1/2 z-20 hidden lg:block">
              <button 
                onClick={() => setHasGenerated(true)}
                className="w-16 h-16 rounded-full bg-gradient-to-br from-[#b45309] to-[#78350f] shadow-lg flex items-center justify-center border-4 border-[#faf7f2] hover:scale-105 transition-transform group"
              >
                <Sparkles className="w-6 h-6 text-[#fef3c7] group-hover:animate-pulse" />
              </button>
            </div>
            
            {/* Mobile Generate Button */}
            <div className="mt-4 flex justify-center lg:hidden">
              <button 
                onClick={() => setHasGenerated(true)}
                className="px-8 py-3 rounded-full bg-gradient-to-br from-[#b45309] to-[#78350f] text-[#fef3c7] font-serif shadow-lg flex items-center gap-2"
              >
                <Sparkles className="w-5 h-5" />
                Forge Reviewer
              </button>
            </div>
          </div>

          {/* Right Panel - Printed Review Sheet */}
          <div className="lg:w-1/2 flex flex-col h-full relative">
            <div className="flex-1 bg-[#fffbf5] rounded-xl shadow-md border border-[#eaddcc] overflow-hidden relative flex flex-col">
              
              {/* Lamp light gradient overlay */}
              <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-[#fef3c7]/40 to-transparent pointer-events-none"></div>

              {!hasGenerated ? (
                <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
                  <div className="w-16 h-16 mb-6 rounded-full bg-[#fef3c7] flex items-center justify-center text-[#d97706]">
                    <BookOpenText className="w-8 h-8 opacity-50" />
                  </div>
                  <p className="text-xl font-serif italic text-[#8a7561] max-w-sm leading-relaxed">
                    "Study without desire spoils the memory, and it retains nothing that it takes in."
                  </p>
                  <p className="mt-4 text-sm text-[#a8998b] font-serif uppercase tracking-widest">— Leonardo da Vinci</p>
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto p-8 lg:p-12 relative z-10">
                  <h1 className="text-3xl font-serif text-[#92400e] pb-4 border-b border-[#d97706]/30 mb-8 text-center">
                    Cellular Respiration Review
                  </h1>

                  <div className="space-y-8">
                    <section>
                      <h2 className="text-xl font-serif text-[#78350f] mb-4 flex items-center">
                        <span className="bg-[#fef3c7] w-8 h-px mr-3"></span>
                        Key Definitions
                        <span className="bg-[#fef3c7] flex-1 h-px ml-3"></span>
                      </h2>
                      
                      <div className="space-y-6">
                        <div className="relative pl-4 border-l-2 border-[#d97706]">
                          <h3 className="text-[#92400e] font-serif font-bold uppercase tracking-wider text-sm mb-1">Cellular Respiration</h3>
                          <p className="text-[#5c4a3d] leading-relaxed">A set of metabolic reactions and processes in cells that convert chemical energy from nutrients into ATP, releasing waste products.</p>
                        </div>
                        
                        <div className="relative pl-4 border-l-2 border-[#d97706]">
                          <h3 className="text-[#92400e] font-serif font-bold uppercase tracking-wider text-sm mb-1">Catabolic Reactions</h3>
                          <p className="text-[#5c4a3d] leading-relaxed">Reactions that break down large molecules into smaller ones, releasing energy in the process.</p>
                        </div>
                        
                        <div className="relative pl-4 border-l-2 border-[#d97706]">
                          <h3 className="text-[#92400e] font-serif font-bold uppercase tracking-wider text-sm mb-1">ATP (Adenosine Triphosphate)</h3>
                          <p className="text-[#5c4a3d] leading-relaxed">The primary energy carrier in cells, generated during cellular respiration.</p>
                        </div>
                      </div>
                    </section>

                    <section>
                      <h2 className="text-xl font-serif text-[#78350f] mb-4 flex items-center mt-10">
                        <span className="bg-[#fef3c7] w-8 h-px mr-3"></span>
                        Core Concepts
                        <span className="bg-[#fef3c7] flex-1 h-px ml-3"></span>
                      </h2>
                      
                      <ul className="list-disc list-outside ml-5 text-[#5c4a3d] space-y-3 leading-relaxed">
                        <li className="pl-2 marker:text-[#d97706]">Respiration replaces weak high-energy bonds in diatomic oxygen with stronger bonds in the products.</li>
                        <li className="pl-2 marker:text-[#d97706]">It is the primary method cells use to fuel their activities.</li>
                        <li className="pl-2 marker:text-[#d97706]">The process involves a series of biochemical steps, prominently featuring redox reactions.</li>
                      </ul>
                    </section>
                  </div>
                </div>
              )}

              {/* Action Bar (Old Newspaper Style) */}
              {hasGenerated && (
                <div className="bg-[#f5f0e8] border-t border-[#d97706]/20 p-4">
                  <div className="flex items-center justify-center gap-4 text-sm font-serif text-[#78350f]">
                    <button className="hover:text-[#d97706] transition-colors flex items-center gap-1.5">
                      <GraduationCap className="w-4 h-4" /> Take Quiz
                    </button>
                    <span className="text-[#d97706]/40">•</span>
                    <button className="hover:text-[#d97706] transition-colors flex items-center gap-1.5">
                      <HelpCircle className="w-4 h-4" /> Ask Scholar
                    </button>
                    <span className="text-[#d97706]/40">•</span>
                    <button className="hover:text-[#d97706] transition-colors flex items-center gap-1.5">
                      <Globe className="w-4 h-4" /> Cite Sources
                    </button>
                    <span className="text-[#d97706]/40">•</span>
                    <button className="hover:text-[#d97706] transition-colors flex items-center gap-1.5">
                      <Download className="w-4 h-4" /> Export
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
