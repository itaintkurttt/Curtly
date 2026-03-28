import React, { useState } from 'react';
import { 
  BookOpenText, User, LogOut, Upload, FileText, FileUp, 
  BrainCircuit, MessageSquareText, Download, Globe,
  CheckCircle2, ChevronRight, ChevronLeft, Sparkles, Plus,
  FileBadge
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

const STEPS = [
  { id: 1, title: 'Add Source' },
  { id: 2, title: 'Review & Generate' },
  { id: 3, title: 'Study Mode' }
];

export default function GuidedJourney() {
  const [currentStep, setCurrentStep] = useState(3);
  const [inputMode, setInputMode] = useState<'upload' | 'text'>('upload');
  
  return (
    <div className="min-h-screen bg-gray-50 text-slate-900 font-sans selection:bg-indigo-100 selection:text-indigo-900 pb-20">
      {/* Sticky Header */}
      <header className="sticky top-0 z-50 w-full bg-white/80 backdrop-blur-xl border-b border-gray-200">
        <div className="container mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 text-indigo-600">
            <BookOpenText className="w-6 h-6" />
            <span className="text-xl font-bold tracking-tight text-slate-900">Curtly</span>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-100 border border-gray-200">
              <User className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-medium text-slate-700 hidden sm:block">
                student@university.edu
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Progress Bar */}
      <div className="w-full bg-white border-b border-gray-200 py-6">
        <div className="max-w-3xl mx-auto px-4">
          <div className="flex items-center justify-between relative">
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-0.5 bg-gray-200 -z-10" />
            <div 
              className="absolute left-0 top-1/2 -translate-y-1/2 h-0.5 bg-indigo-600 -z-10 transition-all duration-500"
              style={{ width: `${((currentStep - 1) / (STEPS.length - 1)) * 100}%` }}
            />
            
            {STEPS.map((step) => {
              const isActive = currentStep === step.id;
              const isPast = currentStep > step.id;
              
              return (
                <div key={step.id} className="flex flex-col items-center gap-2 bg-white px-2">
                  <button 
                    onClick={() => setCurrentStep(step.id)}
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium border-2 transition-colors ${
                      isActive 
                        ? 'border-indigo-600 bg-indigo-600 text-white' 
                        : isPast 
                          ? 'border-indigo-600 bg-indigo-50 text-indigo-600'
                          : 'border-gray-300 bg-white text-gray-400'
                    }`}
                  >
                    {isPast ? <CheckCircle2 className="w-5 h-5" /> : step.id}
                  </button>
                  <span className={`text-xs font-medium ${isActive ? 'text-indigo-900' : isPast ? 'text-indigo-600' : 'text-gray-400'}`}>
                    {step.title}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <main className="max-w-3xl mx-auto px-4 pt-12">
        {/* STEP 1: Add Source */}
        {currentStep === 1 && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-slate-900 mb-2">What are we studying today?</h1>
              <p className="text-slate-500">Upload your lectures, notes, or readings to generate a smart reviewer.</p>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
              <div className="flex justify-center mb-6">
                <div className="inline-flex bg-gray-100 p-1 rounded-lg">
                  <button
                    onClick={() => setInputMode('upload')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      inputMode === 'upload' ? 'bg-white text-slate-900 shadow-sm' : 'text-gray-500 hover:text-slate-700'
                    }`}
                  >
                    Upload Files
                  </button>
                  <button
                    onClick={() => setInputMode('text')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      inputMode === 'text' ? 'bg-white text-slate-900 shadow-sm' : 'text-gray-500 hover:text-slate-700'
                    }`}
                  >
                    Paste Text
                  </button>
                </div>
              </div>

              {inputMode === 'upload' ? (
                <div className="border-2 border-dashed border-gray-300 rounded-xl p-12 flex flex-col items-center justify-center text-center hover:bg-gray-50 hover:border-indigo-400 transition-colors cursor-pointer group">
                  <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <FileUp className="w-8 h-8" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-1">Drop your files here</h3>
                  <p className="text-slate-500 text-sm mb-6">Supports PDF, DOCX, and PPTX up to 50MB</p>
                  <Button variant="outline" className="border-gray-300 text-slate-700">
                    <Plus className="w-4 h-4 mr-2" />
                    Browse Files
                  </Button>
                </div>
              ) : (
                <div className="h-64">
                  <Textarea 
                    placeholder="Paste your notes or lecture transcript here..." 
                    className="h-full resize-none border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 text-base"
                  />
                </div>
              )}
            </div>

            <div className="flex justify-end mt-8">
              <Button 
                onClick={() => setCurrentStep(2)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-6 rounded-xl text-lg shadow-md shadow-indigo-200"
              >
                Continue <ChevronRight className="ml-2 w-5 h-5" />
              </Button>
            </div>
          </div>
        )}

        {/* STEP 2: Review & Generate */}
        {currentStep === 2 && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-slate-900 mb-2">Ready to generate</h1>
              <p className="text-slate-500">We've successfully extracted the content from your materials.</p>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 flex flex-col items-center text-center">
              <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mb-6">
                <FileBadge className="w-10 h-10" />
              </div>
              
              <h3 className="text-xl font-semibold text-slate-900 mb-2">3 Files Processed</h3>
              <p className="text-slate-500 mb-8 max-w-sm">
                Detected approximately 12,400 words across Chapter_4_Biology.pdf, Lecture_Notes.docx, and intro.pptx.
              </p>

              <div className="bg-gray-50 rounded-xl p-4 w-full text-left flex items-start gap-4 mb-8 border border-gray-100">
                <div className="bg-indigo-100 p-2 rounded-lg text-indigo-600 mt-1">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-medium text-slate-900">AI Processing</h4>
                  <p className="text-sm text-slate-500">
                    Curtly will extract key concepts, definitions, and create a structured study guide optimized for retention.
                  </p>
                </div>
              </div>

              <div className="flex gap-4 w-full">
                <Button 
                  variant="outline" 
                  onClick={() => setCurrentStep(1)}
                  className="flex-1 py-6 rounded-xl text-slate-700"
                >
                  <ChevronLeft className="mr-2 w-5 h-5" /> Back
                </Button>
                <Button 
                  onClick={() => setCurrentStep(3)}
                  className="flex-[2] bg-indigo-600 hover:bg-indigo-700 text-white py-6 rounded-xl text-lg shadow-md shadow-indigo-200"
                >
                  <Sparkles className="mr-2 w-5 h-5" /> Generate Reviewer
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: Study Mode */}
        {currentStep === 3 && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-3xl font-bold text-slate-900">Your Reviewer is Ready</h1>
                <p className="text-slate-500 mt-1">Cellular Respiration and Metabolism</p>
              </div>
              <Button variant="ghost" className="text-slate-500 hover:text-slate-900" onClick={() => setCurrentStep(2)}>
                <ChevronLeft className="w-4 h-4 mr-1" /> Back
              </Button>
            </div>

            {/* Generated Reviewer Card */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 mb-8 prose prose-slate max-w-none prose-headings:text-indigo-950 prose-h1:text-2xl prose-h2:text-xl prose-p:text-slate-600 prose-strong:text-indigo-900">
              <h2 className="flex items-center gap-2"><Sparkles className="w-5 h-5 text-indigo-500" /> Key Concepts</h2>
              <p>Cellular respiration is the process by which biological fuels are oxidized in the presence of an inorganic electron acceptor, such as oxygen, to produce large amounts of energy, to drive the bulk production of ATP.</p>
              
              <div className="not-prose mt-6 flex flex-col gap-3">
                {[
                  { term: 'Glycolysis', def: 'The metabolic pathway that converts glucose into pyruvate, yielding energy in the form of ATP and NADH. Occurs in the cytoplasm.' },
                  { term: 'Krebs Cycle', def: 'Also known as the citric acid cycle. A series of chemical reactions used by all aerobic organisms to release stored energy through the oxidation of acetyl-CoA.' },
                  { term: 'Electron Transport Chain', def: 'A series of complexes that transfer electrons from electron donors to electron acceptors via redox reactions, creating a proton gradient that drives ATP synthesis.' },
                  { term: 'ATP Synthase', def: 'An enzyme that creates the energy storage molecule adenosine triphosphate (ATP) using a proton gradient.' }
                ].map((item, i) => (
                  <div key={i} className="flex flex-col sm:flex-row gap-2 sm:gap-4 p-4 rounded-xl bg-gray-50 border border-gray-100">
                    <div className="sm:w-1/3 font-semibold text-indigo-900">{item.term}</div>
                    <div className="sm:w-2/3 text-slate-600 text-sm leading-relaxed">{item.def}</div>
                  </div>
                ))}
              </div>
            </div>

            <h3 className="text-lg font-bold text-slate-900 mb-4 px-2">Next Steps</h3>
            
            {/* 2x2 Action Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button className="flex flex-col items-start p-6 bg-white rounded-2xl border border-gray-200 shadow-sm hover:border-purple-300 hover:shadow-md hover:-translate-y-1 transition-all text-left group">
                <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center mb-4 group-hover:bg-purple-100 transition-colors">
                  <BrainCircuit className="w-6 h-6" />
                </div>
                <h4 className="font-bold text-slate-900 text-lg mb-1">Take a Quiz</h4>
                <p className="text-sm text-slate-500 line-clamp-2">Test your knowledge with multiple choice and short answer questions.</p>
              </button>

              <button className="flex flex-col items-start p-6 bg-white rounded-2xl border border-gray-200 shadow-sm hover:border-blue-300 hover:shadow-md hover:-translate-y-1 transition-all text-left group">
                <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center mb-4 group-hover:bg-blue-100 transition-colors">
                  <MessageSquareText className="w-6 h-6" />
                </div>
                <h4 className="font-bold text-slate-900 text-lg mb-1">Ask AI Tutor</h4>
                <p className="text-sm text-slate-500 line-clamp-2">Get expert answers and deeper explanations about these concepts.</p>
              </button>

              <button className="flex flex-col items-start p-6 bg-white rounded-2xl border border-gray-200 shadow-sm hover:border-emerald-300 hover:shadow-md hover:-translate-y-1 transition-all text-left group">
                <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center mb-4 group-hover:bg-emerald-100 transition-colors">
                  <Download className="w-6 h-6" />
                </div>
                <h4 className="font-bold text-slate-900 text-lg mb-1">Export Reviewer</h4>
                <p className="text-sm text-slate-500 line-clamp-2">Download as PDF or DOCX for offline studying or printing.</p>
              </button>

              <button className="flex flex-col items-start p-6 bg-white rounded-2xl border border-gray-200 shadow-sm hover:border-orange-300 hover:shadow-md hover:-translate-y-1 transition-all text-left group">
                <div className="w-12 h-12 bg-orange-50 text-orange-600 rounded-xl flex items-center justify-center mb-4 group-hover:bg-orange-100 transition-colors">
                  <Globe className="w-6 h-6" />
                </div>
                <h4 className="font-bold text-slate-900 text-lg mb-1">Web Sources</h4>
                <p className="text-sm text-slate-500 line-clamp-2">Enrich this reviewer with latest context from the internet.</p>
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
