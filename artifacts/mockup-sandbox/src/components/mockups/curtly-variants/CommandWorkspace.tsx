import React, { useState } from 'react';
import { 
  BookOpen, 
  Archive, 
  Bot, 
  Settings, 
  LogOut, 
  ChevronRight, 
  User, 
  FileText, 
  Upload, 
  Play, 
  Search, 
  Globe, 
  Download, 
  Save,
  Sparkles,
  MoreVertical
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

export default function CommandWorkspace() {
  const [activeTab, setActiveTab] = useState('generate');
  const [input, setInput] = useState('The mitochondria is the powerhouse of the cell. It generates most of the chemical energy needed to power the cell\'s biochemical reactions. Chemical energy produced by the mitochondria is stored in a small molecule called adenosine triphosphate (ATP).\n\nCellular respiration is the process by which biological fuels are oxidized in the presence of an inorganic electron acceptor, such as oxygen, to produce large amounts of energy, to drive the bulk production of ATP.');
  
  return (
    <div className="min-h-screen bg-[#0f1117] text-gray-300 font-sans flex flex-col overflow-hidden selection:bg-[#3b82f6]/30">
      
      {/* Top Header */}
      <header className="h-12 border-b border-[#1a1d2e] bg-[#0f1117] flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-[#3b82f6]">
            <BookOpen className="w-5 h-5" />
            <span className="font-semibold text-sm tracking-wide">CURTLY</span>
          </div>
          
          <div className="h-4 w-px bg-[#1a1d2e] mx-2"></div>
          
          <div className="flex items-center text-xs text-gray-500 gap-1.5 font-mono">
            <span>Home</span>
            <ChevronRight className="w-3 h-3" />
            <span className="text-gray-300">Generate</span>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs text-gray-400 font-mono bg-[#1a1d2e] px-2 py-1 rounded-md">
            <span className="w-2 h-2 rounded-full bg-green-500"></span>
            System Online
          </div>
          <button className="flex items-center gap-2 hover:bg-[#1a1d2e] p-1.5 rounded-md transition-colors">
            <Avatar className="w-6 h-6 border border-[#3b82f6]/30">
              <AvatarImage src="https://github.com/shadcn.png" />
              <AvatarFallback className="bg-[#1a1d2e] text-xs">US</AvatarFallback>
            </Avatar>
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar (Icon Navigation) */}
        <aside className="w-16 border-r border-[#1a1d2e] bg-[#0a0b0f] flex flex-col items-center py-4 gap-4 shrink-0">
          <button 
            onClick={() => setActiveTab('generate')}
            className={`p-3 rounded-xl transition-all ${activeTab === 'generate' ? 'bg-[#3b82f6]/10 text-[#3b82f6] shadow-[inset_2px_0_0_#3b82f6]' : 'text-gray-500 hover:text-gray-300 hover:bg-[#1a1d2e]'}`}
            title="Generate"
          >
            <BookOpen className="w-5 h-5" />
          </button>
          <button 
            onClick={() => setActiveTab('archives')}
            className={`p-3 rounded-xl transition-all ${activeTab === 'archives' ? 'bg-[#3b82f6]/10 text-[#3b82f6] shadow-[inset_2px_0_0_#3b82f6]' : 'text-gray-500 hover:text-gray-300 hover:bg-[#1a1d2e]'}`}
            title="Archives"
          >
            <Archive className="w-5 h-5" />
          </button>
          <button 
            onClick={() => setActiveTab('ask')}
            className={`p-3 rounded-xl transition-all ${activeTab === 'ask' ? 'bg-[#3b82f6]/10 text-[#3b82f6] shadow-[inset_2px_0_0_#3b82f6]' : 'text-gray-500 hover:text-gray-300 hover:bg-[#1a1d2e]'}`}
            title="Ask AI"
          >
            <Bot className="w-5 h-5" />
          </button>
          
          <div className="mt-auto flex flex-col gap-4">
            <button className="p-3 rounded-xl text-gray-500 hover:text-gray-300 hover:bg-[#1a1d2e] transition-all" title="Settings">
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </aside>

        {/* Main Split Area */}
        <main className="flex-1 flex overflow-hidden">
          
          {/* Left Panel: Source Material Editor */}
          <section className="w-1/2 min-w-[400px] border-r border-[#1a1d2e] flex flex-col bg-[#0f1117] relative">
            <div className="h-10 border-b border-[#1a1d2e] flex items-center px-4 justify-between shrink-0 bg-[#0a0b0f]">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-gray-400" />
                <span className="text-xs font-mono text-gray-300">source.txt</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono text-gray-500">{input.length} chars</span>
              </div>
            </div>
            
            <div className="flex-1 relative flex">
              {/* Line Numbers */}
              <div className="w-12 bg-[#0a0b0f] border-r border-[#1a1d2e] flex flex-col items-end py-4 pr-3 text-xs font-mono text-gray-600 select-none">
                {Array.from({ length: 20 }).map((_, i) => (
                  <div key={i} className="leading-6">{i + 1}</div>
                ))}
              </div>
              
              {/* Editor */}
              <textarea 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                className="flex-1 bg-transparent text-gray-300 font-mono text-sm p-4 leading-6 focus:outline-none resize-none"
                spellCheck={false}
              />
            </div>
            
            {/* Uploaded Files Section */}
            <div className="h-24 border-t border-[#1a1d2e] bg-[#0a0b0f] p-3 flex flex-col gap-2 shrink-0">
              <div className="text-[10px] uppercase font-mono tracking-wider text-gray-500 flex justify-between items-center">
                <span>Attachments</span>
                <button className="hover:text-gray-300"><Upload className="w-3 h-3" /></button>
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1">
                <div className="flex items-center gap-2 bg-[#1a1d2e] border border-[#2a2d3e] px-3 py-1.5 rounded-md text-xs font-mono min-w-max">
                  <FileText className="w-3.5 h-3.5 text-blue-400" />
                  <span className="text-gray-300">biology_notes.pdf</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 ml-2"></span>
                </div>
              </div>
            </div>

            {/* Generate Action */}
            <div className="p-4 bg-[#0a0b0f] border-t border-[#1a1d2e]">
              <button className="w-full bg-[#3b82f6] hover:bg-[#2563eb] text-white font-medium py-3 rounded-lg shadow-[0_0_15px_rgba(59,130,246,0.3)] transition-all flex items-center justify-center gap-2">
                <Sparkles className="w-4 h-4" />
                GENERATE REVIEWER
              </button>
            </div>
          </section>

          {/* Right Panel: Reviewer Output */}
          <section className="flex-1 flex flex-col bg-[#0f1117] min-w-[400px]">
            {/* Output Toolbar */}
            <div className="h-10 border-b border-[#1a1d2e] flex items-center px-2 justify-between shrink-0 bg-[#0a0b0f]">
              <div className="flex items-center gap-1">
                <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-400 hover:text-white hover:bg-[#1a1d2e] rounded-md transition-colors">
                  <Play className="w-3.5 h-3.5" /> Take Quiz
                </button>
                <div className="w-px h-4 bg-[#1a1d2e] mx-1"></div>
                <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-400 hover:text-white hover:bg-[#1a1d2e] rounded-md transition-colors">
                  <Bot className="w-3.5 h-3.5" /> Ask AI
                </button>
                <div className="w-px h-4 bg-[#1a1d2e] mx-1"></div>
                <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-400 hover:text-white hover:bg-[#1a1d2e] rounded-md transition-colors">
                  <Globe className="w-3.5 h-3.5" /> Web Sources
                </button>
              </div>
              
              <div className="flex items-center gap-1">
                <button className="p-1.5 text-gray-400 hover:text-white hover:bg-[#1a1d2e] rounded-md transition-colors" title="Export">
                  <Download className="w-4 h-4" />
                </button>
                <button className="p-1.5 text-gray-400 hover:text-white hover:bg-[#1a1d2e] rounded-md transition-colors" title="Save to Archives">
                  <Save className="w-4 h-4" />
                </button>
                <button className="p-1.5 text-gray-400 hover:text-white hover:bg-[#1a1d2e] rounded-md transition-colors" title="More">
                  <MoreVertical className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Document Content */}
            <ScrollArea className="flex-1 p-8">
              <div className="max-w-2xl mx-auto">
                <h1 className="text-2xl font-semibold text-white mb-6 font-sans tracking-tight">Cellular Respiration Reviewer</h1>
                
                <div className="space-y-6">
                  {/* Definition Block */}
                  <div className="group border border-[#1a1d2e] rounded-lg bg-[#0a0b0f]/50 p-4 hover:border-[#3b82f6]/50 transition-colors relative">
                    <div className="absolute -left-px top-4 bottom-4 w-[2px] bg-[#3b82f6] rounded-r-sm"></div>
                    <div className="flex items-baseline gap-3 mb-2">
                      <span className="font-mono text-sm text-[#3b82f6] font-semibold bg-[#3b82f6]/10 px-2 py-0.5 rounded">Mitochondria</span>
                    </div>
                    <p className="text-sm text-gray-300 leading-relaxed">
                      The powerhouse of the cell; an organelle that generates most of the chemical energy needed to power the cell's biochemical reactions.
                    </p>
                  </div>

                  <div className="group border border-[#1a1d2e] rounded-lg bg-[#0a0b0f]/50 p-4 hover:border-[#3b82f6]/50 transition-colors relative">
                    <div className="absolute -left-px top-4 bottom-4 w-[2px] bg-[#3b82f6] rounded-r-sm"></div>
                    <div className="flex items-baseline gap-3 mb-2">
                      <span className="font-mono text-sm text-[#3b82f6] font-semibold bg-[#3b82f6]/10 px-2 py-0.5 rounded">ATP</span>
                    </div>
                    <p className="text-sm text-gray-300 leading-relaxed">
                      Adenosine triphosphate; a small molecule where chemical energy produced by the mitochondria is stored.
                    </p>
                  </div>

                  <div className="group border border-[#1a1d2e] rounded-lg bg-[#0a0b0f]/50 p-4 hover:border-[#3b82f6]/50 transition-colors relative">
                    <div className="absolute -left-px top-4 bottom-4 w-[2px] bg-[#3b82f6] rounded-r-sm"></div>
                    <div className="flex items-baseline gap-3 mb-2">
                      <span className="font-mono text-sm text-[#3b82f6] font-semibold bg-[#3b82f6]/10 px-2 py-0.5 rounded">Cellular Respiration</span>
                    </div>
                    <p className="text-sm text-gray-300 leading-relaxed">
                      The process by which biological fuels are oxidized in the presence of an inorganic electron acceptor, such as oxygen, to produce large amounts of energy.
                    </p>
                  </div>
                </div>
              </div>
            </ScrollArea>
          </section>

        </main>
      </div>
    </div>
  );
}
