import React, { useState } from 'react';
import { 
  Search, 
  Plus, 
  MessageSquare, 
  FileText, 
  Paperclip, 
  Send, 
  Bot, 
  User, 
  X, 
  BookOpen, 
  BrainCircuit, 
  HelpCircle, 
  FileBox,
  MoreVertical,
  UploadCloud,
  ChevronRight
} from 'lucide-react';

export default function ChatTutor() {
  const [activeTab, setActiveTab] = useState<'reviewer' | 'quiz' | 'ask'>('reviewer');

  return (
    <div className="min-h-screen bg-white text-slate-900 flex font-sans overflow-hidden">
      
      {/* LEFT SIDEBAR: Sessions */}
      <aside className="w-[280px] border-r border-slate-200 bg-slate-50/50 flex flex-col h-screen shrink-0">
        <div className="p-4 border-b border-slate-200">
          <div className="flex items-center gap-2 mb-4 text-indigo-600 font-serif font-bold text-xl">
            <BookOpen className="w-6 h-6" />
            Curtly
          </div>
          <button className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 px-4 rounded-xl font-medium transition-colors shadow-sm">
            <Plus className="w-4 h-4" />
            New Session
          </button>
        </div>
        
        <div className="p-3 border-b border-slate-200">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search sessions..." 
              className="w-full bg-white border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all shadow-sm"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 mt-2 px-2">Recent</div>
          
          <button className="w-full flex items-start gap-3 p-2 rounded-lg bg-indigo-50 border border-indigo-100/50 text-left transition-colors">
            <div className="mt-0.5 p-1.5 bg-indigo-100 text-indigo-600 rounded-md shrink-0">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div className="flex-1 overflow-hidden">
              <div className="text-sm font-medium text-slate-900 truncate">Cellular Respiration</div>
              <div className="text-xs text-slate-500 truncate">I've created your reviewer!</div>
            </div>
          </button>

          <button className="w-full flex items-start gap-3 p-2 rounded-lg hover:bg-slate-100 text-left transition-colors">
            <div className="mt-0.5 p-1.5 bg-slate-200 text-slate-600 rounded-md shrink-0">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div className="flex-1 overflow-hidden">
              <div className="text-sm font-medium text-slate-700 truncate">Microeconomics Midterm</div>
              <div className="text-xs text-slate-400 truncate">Can you explain supply and demand?</div>
            </div>
          </button>

          <button className="w-full flex items-start gap-3 p-2 rounded-lg hover:bg-slate-100 text-left transition-colors">
            <div className="mt-0.5 p-1.5 bg-slate-200 text-slate-600 rounded-md shrink-0">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div className="flex-1 overflow-hidden">
              <div className="text-sm font-medium text-slate-700 truncate">World History ch 4-6</div>
              <div className="text-xs text-slate-400 truncate">Reviewer generated.</div>
            </div>
          </button>
        </div>

        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0 font-bold text-sm">
            US
          </div>
          <div className="flex-1 text-sm font-medium text-slate-700">User Profile</div>
          <button className="text-slate-400 hover:text-slate-600 p-1">
            <MoreVertical className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* CENTER: Chat Area */}
      <main className="flex-1 flex flex-col h-screen bg-white relative min-w-0">
        <header className="h-16 border-b border-slate-200 flex items-center justify-between px-6 bg-white/80 backdrop-blur-sm z-10">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-500 flex items-center justify-center shadow-sm">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
            </div>
            <div>
              <h1 className="font-semibold text-slate-900 leading-tight">Curtly AI Tutor</h1>
              <p className="text-xs text-slate-500">Always here to help you study</p>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-6 space-y-8 scroll-smooth pb-32">
          
          {/* User Message */}
          <div className="flex justify-end gap-4 max-w-3xl ml-auto">
            <div className="flex flex-col items-end gap-2 max-w-[80%]">
              <div className="bg-slate-100 text-slate-900 px-5 py-3.5 rounded-2xl rounded-tr-sm shadow-sm text-[15px] leading-relaxed">
                Can you review my notes on cellular respiration?
              </div>
              <div className="flex items-center gap-2 bg-white border border-slate-200 px-3 py-2 rounded-xl shadow-sm self-end">
                <FileBox className="w-4 h-4 text-indigo-500" />
                <span className="text-sm font-medium">bio_notes_ch4.pdf</span>
                <span className="text-xs text-slate-400">1.2 MB</span>
              </div>
              <span className="text-xs text-slate-400 mt-1">10:42 AM</span>
            </div>
            <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0 text-xs font-bold mt-1">
              US
            </div>
          </div>

          {/* AI Response */}
          <div className="flex gap-4 max-w-3xl mr-auto">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-500 flex items-center justify-center shrink-0 shadow-sm mt-1">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div className="flex flex-col items-start gap-2 max-w-[85%] w-full">
              <div className="bg-gradient-to-br from-indigo-600 to-purple-600 text-white px-5 py-4 rounded-2xl rounded-tl-sm shadow-md text-[15px] leading-relaxed">
                <p className="mb-4">I've analyzed your notes! Here is a structured reviewer on Cellular Respiration.</p>
                
                {/* Embedded Reviewer Bubble Card */}
                <div className="bg-white/10 border border-white/20 rounded-xl p-4 backdrop-blur-sm shadow-sm text-white mb-2">
                  <div className="font-semibold text-lg mb-3 flex items-center gap-2">
                    <BookOpen className="w-5 h-5 opacity-80" /> 
                    Cellular Respiration
                  </div>
                  <div className="space-y-3">
                    <div className="bg-white/5 p-3 rounded-lg border border-white/10">
                      <div className="font-bold text-indigo-100 mb-1">Glycolysis</div>
                      <div className="text-sm text-white/90">First stage of respiration occurring in the cytoplasm, breaking down glucose into pyruvate.</div>
                    </div>
                    <div className="bg-white/5 p-3 rounded-lg border border-white/10">
                      <div className="font-bold text-indigo-100 mb-1">Krebs Cycle</div>
                      <div className="text-sm text-white/90">Series of chemical reactions used by all aerobic organisms to release stored energy.</div>
                    </div>
                  </div>
                  <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between">
                    <span className="text-xs text-indigo-200">12 concepts extracted</span>
                    <button className="text-xs font-medium bg-white text-indigo-600 px-3 py-1.5 rounded-lg hover:bg-indigo-50 transition-colors flex items-center gap-1.5">
                      Open in Study Panel <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                <p className="mt-4 font-medium text-white/95">What would you like to do next?</p>
              </div>

              {/* Quick Replies */}
              <div className="flex flex-wrap gap-2 mt-2">
                <button className="bg-white border border-indigo-200 text-indigo-700 hover:bg-indigo-50 px-4 py-2 rounded-full text-sm font-medium transition-colors shadow-sm flex items-center gap-2">
                  <BrainCircuit className="w-4 h-4" /> Take Quiz
                </button>
                <button className="bg-white border border-indigo-200 text-indigo-700 hover:bg-indigo-50 px-4 py-2 rounded-full text-sm font-medium transition-colors shadow-sm flex items-center gap-2">
                  <HelpCircle className="w-4 h-4" /> Ask a question
                </button>
                <button className="bg-white border border-indigo-200 text-indigo-700 hover:bg-indigo-50 px-4 py-2 rounded-full text-sm font-medium transition-colors shadow-sm flex items-center gap-2">
                  <Search className="w-4 h-4" /> Add web sources
                </button>
              </div>
              <span className="text-xs text-slate-400 mt-1">10:43 AM</span>
            </div>
          </div>
          
        </div>

        {/* Input Area */}
        <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-white via-white to-transparent pt-12">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-center justify-center gap-2 mb-3 text-xs font-medium text-slate-400 bg-slate-50 border border-slate-200/60 py-1.5 px-4 rounded-full w-fit mx-auto shadow-sm">
              <UploadCloud className="w-3.5 h-3.5" />
              Drop files here or type your question below
            </div>
            <div className="bg-white border-2 border-slate-200 focus-within:border-indigo-500 rounded-2xl p-2 shadow-[0_4px_20px_-8px_rgba(0,0,0,0.1)] transition-colors flex items-end">
              <button className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors mb-0.5">
                <Paperclip className="w-5 h-5" />
              </button>
              <textarea 
                placeholder="Ask a question or request a review..." 
                className="flex-1 max-h-32 min-h-[44px] bg-transparent border-none focus:ring-0 resize-none px-3 py-2.5 outline-none text-[15px] placeholder:text-slate-400 text-slate-900"
                rows={1}
                defaultValue=""
              />
              <button className="p-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-colors mb-0.5 shadow-sm">
                <Send className="w-5 h-5 ml-0.5" />
              </button>
            </div>
            <div className="text-center mt-2 text-[11px] text-slate-400">
              AI Tutor can make mistakes. Consider verifying important information.
            </div>
          </div>
        </div>
      </main>

      {/* RIGHT PANEL: Study Panel */}
      <aside className="w-[340px] border-l border-slate-200 bg-slate-50 flex flex-col h-screen shrink-0 shadow-[-8px_0_24px_-16px_rgba(0,0,0,0.05)] z-20">
        <header className="h-16 border-b border-slate-200 flex items-center justify-between px-5 bg-white shrink-0">
          <h2 className="font-semibold text-slate-900 flex items-center gap-2">
            Study Panel
          </h2>
          <button className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-lg transition-colors">
            <X className="w-4 h-4" />
          </button>
        </header>

        <div className="flex p-2 bg-white border-b border-slate-200 shrink-0 gap-1">
          <button 
            onClick={() => setActiveTab('reviewer')}
            className={`flex-1 py-1.5 px-3 text-sm font-medium rounded-md transition-all flex items-center justify-center gap-2 ${activeTab === 'reviewer' ? 'bg-indigo-50 text-indigo-700 shadow-sm border border-indigo-100' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            <BookOpen className="w-4 h-4" />
            Reviewer
          </button>
          <button 
            onClick={() => setActiveTab('quiz')}
            className={`flex-1 py-1.5 px-3 text-sm font-medium rounded-md transition-all flex items-center justify-center gap-2 ${activeTab === 'quiz' ? 'bg-indigo-50 text-indigo-700 shadow-sm border border-indigo-100' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            <BrainCircuit className="w-4 h-4" />
            Quiz
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 bg-white">
          {activeTab === 'reviewer' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-bold text-slate-900 mb-4 border-b border-slate-100 pb-2">Cellular Respiration</h3>
                
                <div className="space-y-4">
                  <div className="group">
                    <div className="font-bold text-indigo-700 flex items-baseline gap-2 mb-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0 relative top-[-3px]"></div>
                      Glycolysis
                    </div>
                    <div className="text-[15px] text-slate-700 leading-relaxed pl-3.5 border-l-2 border-slate-100 group-hover:border-indigo-200 transition-colors">
                      The first stage of cellular respiration occurring in the cytoplasm, where glucose is broken down into two molecules of pyruvate, producing a net yield of 2 ATP and 2 NADH.
                    </div>
                  </div>

                  <div className="group">
                    <div className="font-bold text-indigo-700 flex items-baseline gap-2 mb-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0 relative top-[-3px]"></div>
                      Krebs Cycle (Citric Acid Cycle)
                    </div>
                    <div className="text-[15px] text-slate-700 leading-relaxed pl-3.5 border-l-2 border-slate-100 group-hover:border-indigo-200 transition-colors">
                      A series of chemical reactions used by all aerobic organisms to release stored energy through the oxidation of acetyl-CoA derived from carbohydrates, fats, and proteins. Occurs in the mitochondrial matrix.
                    </div>
                  </div>

                  <div className="group">
                    <div className="font-bold text-indigo-700 flex items-baseline gap-2 mb-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0 relative top-[-3px]"></div>
                      Electron Transport Chain
                    </div>
                    <div className="text-[15px] text-slate-700 leading-relaxed pl-3.5 border-l-2 border-slate-100 group-hover:border-indigo-200 transition-colors">
                      A cluster of proteins that transfer electrons through a membrane within mitochondria to form a gradient of protons that drives the creation of ATP.
                    </div>
                  </div>
                  
                  <div className="group">
                    <div className="font-bold text-indigo-700 flex items-baseline gap-2 mb-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0 relative top-[-3px]"></div>
                      ATP Synthase
                    </div>
                    <div className="text-[15px] text-slate-700 leading-relaxed pl-3.5 border-l-2 border-slate-100 group-hover:border-indigo-200 transition-colors">
                      An enzyme that creates the energy storage molecule adenosine triphosphate (ATP).
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="p-4 bg-indigo-50/50 rounded-xl border border-indigo-100 mt-8">
                <h4 className="text-xs font-semibold text-indigo-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5" />
                  Source Info
                </h4>
                <div className="text-sm text-slate-600">
                  Generated from <span className="font-medium text-slate-900">bio_notes_ch4.pdf</span> (1.2MB).
                </div>
              </div>
            </div>
          )}
          
          {activeTab === 'quiz' && (
            <div className="flex flex-col items-center justify-center h-full text-center p-6 pb-20">
              <div className="w-16 h-16 bg-purple-100 text-purple-600 rounded-2xl flex items-center justify-center mb-4">
                <BrainCircuit className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Ready to test your knowledge?</h3>
              <p className="text-slate-500 text-sm mb-6">Take a quick 5-question quiz based on the reviewer to see how well you've grasped the material.</p>
              <button className="bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 px-6 rounded-xl font-medium transition-colors shadow-sm w-full">
                Start Quiz
              </button>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
