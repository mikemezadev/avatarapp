
import React, { useState, useRef, useEffect } from 'react';
import { CollectionProvider, useCollection } from './components/CollectionContext';
import { AuthProvider, useAuth } from './components/AuthContext';
import { LibraryView } from './components/LibraryView';
import { DecksView } from './components/DecksView';
import { DeckBuilder } from './components/DeckBuilder';
import { StatsDashboard } from './components/StatsDashboard';
import { RulesView } from './components/RulesView';
import { AuthModal } from './components/AuthModal';
import { WelcomeView } from './components/WelcomeView';
import { ViewState, UniverseType } from './types';
import { UNIVERSES } from './constants';

const UniverseIcon = ({ config, className, preferIcon = false }: { config: any, className: string, preferIcon?: boolean }) => {
  if (config.iconType === 'svg' && (preferIcon || !config.logo)) {
     return (
        <svg viewBox={config.viewBox || "0 0 350 480"} className={className} fill="currentColor">
            <path d={config.icon} />
        </svg>
     );
  }
  
  if (config.logo) {
      return <img src={config.logo} alt={config.name} className={`${className} object-contain`} />;
  }
  
  // Fallback if no logo and not forcing icon (though config usually has one or the other)
  if (config.iconType === 'svg') {
     return (
        <svg viewBox={config.viewBox || "0 0 350 480"} className={className} fill="currentColor">
            <path d={config.icon} />
        </svg>
     );
  }

  return <i className={`fa-solid ${config.icon} ${className}`}></i>;
}

const Navigation: React.FC = () => {
  const { activeView, setActiveView, activeUniverse, switchUniverse, universeConfig } = useCollection();
  const { user, logout } = useAuth();
  const [isAuthModalOpen, setAuthModalOpen] = useState(false);
  const [isUniverseDropdownOpen, setIsUniverseDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsUniverseDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!activeUniverse || !universeConfig) return null;

  return (
  <>
  <nav className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm backdrop-blur-md bg-white/90">
    <div className="max-w-7xl mx-auto px-4">
      <div className="flex justify-between items-center h-16">
        
        {/* Universe Dropdown */}
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsUniverseDropdownOpen(!isUniverseDropdownOpen)}
                className="flex items-center gap-3 hover:bg-gray-100 p-2 rounded-lg transition-colors group"
                title="Switch Universe"
            >
                <div className={`w-8 h-8 flex items-center justify-center ${universeConfig.themeColor} transition-transform group-hover:scale-105`}>
                    <UniverseIcon config={universeConfig} className="w-6 h-6" preferIcon={true} />
                </div>
                <div className="flex flex-col items-start">
                     <span className="font-bold text-lg md:text-xl text-gray-800 tracking-tight leading-none hidden md:block">
                        {universeConfig.name}
                     </span>
                </div>
                <i className={`fa-solid fa-chevron-down text-xs text-gray-400 transition-transform duration-200 ${isUniverseDropdownOpen ? 'rotate-180' : ''}`}></i>
            </button>

            {isUniverseDropdownOpen && (
                <div className="absolute top-full left-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-gray-200 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                     <div className="px-4 py-2 text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
                        Select Universe
                     </div>
                     {Object.entries(UNIVERSES).map(([key, config]) => (
                         <button
                            key={key}
                            onClick={() => {
                                switchUniverse(key as UniverseType);
                                setIsUniverseDropdownOpen(false);
                            }}
                            className={`w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors ${activeUniverse === key ? 'bg-primary/5' : ''}`}
                         >
                            <div className={`w-8 h-8 flex items-center justify-center rounded-md bg-gray-50 border border-gray-100 ${config.themeColor}`}>
                                 <UniverseIcon config={config} className="w-5 h-5" preferIcon={true} />
                            </div>
                            <span className={`text-sm font-bold flex-1 ${activeUniverse === key ? 'text-primary' : 'text-gray-700'}`}>
                                {config.name}
                            </span>
                            {activeUniverse === key && <i className="fa-solid fa-check text-primary"></i>}
                         </button>
                     ))}
                     <div className="h-px bg-gray-100 my-2"></div>
                     <button
                        onClick={() => {
                            switchUniverse(null);
                            setIsUniverseDropdownOpen(false);
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-gray-500 hover:text-gray-900 hover:bg-gray-50 transition-colors flex items-center gap-3"
                     >
                         <div className="w-8 flex justify-center">
                            <i className="fa-solid fa-house"></i>
                         </div>
                         <span>Back to Welcome Screen</span>
                     </button>
                </div>
            )}
        </div>
        
        <div className="flex items-center gap-4">
            <div className="flex bg-gray-100 p-1 rounded-lg overflow-x-auto no-scrollbar">
                {[
                    { id: 'library', label: 'Library', icon: 'fa-book' },
                    // Conditionally render Jumpstart Decks
                    ...(universeConfig.hasJumpstart ? [{ id: 'jumpstart', label: 'Jumpstart Decks', icon: 'fa-layer-group' }] : []),
                    { id: 'builder', label: 'Builder', icon: 'fa-compass-drafting' },
                    { id: 'dashboard', label: 'Stats', icon: 'fa-chart-pie' },
                    { id: 'rules', label: 'Rules', icon: 'fa-scroll' },
                ].map(item => (
                    <button
                        key={item.id}
                        onClick={() => setActiveView(item.id as ViewState)}
                        className={`px-3 md:px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 flex items-center gap-2 whitespace-nowrap ${
                            activeView === item.id 
                            ? 'bg-white text-primary shadow-sm' 
                            : 'text-gray-500 hover:text-gray-900'
                        }`}
                    >
                        <i className={`fa-solid ${item.icon}`}></i>
                        <span className="hidden sm:inline">{item.label}</span>
                    </button>
                ))}
            </div>

            {/* Auth Button */}
            <div className="pl-4 border-l border-gray-200">
                {user ? (
                    <div className="flex items-center gap-3">
                        <div className="flex flex-col items-end hidden sm:flex">
                            <span className="text-xs font-bold text-gray-500 uppercase">Welcome</span>
                            <span className="text-sm font-bold text-primary leading-none">{user.username}</span>
                        </div>
                        <button 
                            onClick={logout}
                            className="w-10 h-10 rounded-full bg-red-50 text-red-500 hover:bg-red-100 flex items-center justify-center transition-colors"
                            title="Log Out"
                        >
                            <i className="fa-solid fa-right-from-bracket"></i>
                        </button>
                    </div>
                ) : (
                    <button 
                        onClick={() => setAuthModalOpen(true)}
                        className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 font-bold shadow-md hover:shadow-lg transition-all flex items-center gap-2"
                    >
                        <i className="fa-solid fa-user"></i>
                        <span>Log In</span>
                    </button>
                )}
            </div>
        </div>
      </div>
    </div>
  </nav>
  <AuthModal isOpen={isAuthModalOpen} onClose={() => setAuthModalOpen(false)} />
  </>
)};

const CardPreviewOverlay: React.FC = () => {
    const { previewCard, previewImage } = useCollection();
    
    if (!previewCard) return null;

    const imageUrl = previewImage || 
                     previewCard.image_uris?.normal || 
                     previewCard.card_faces?.[0]?.image_uris?.normal || 
                     'https://via.placeholder.com/250x350?text=No+Image';

    return (
        <div className="fixed inset-0 z-[100] pointer-events-none flex items-center justify-center bg-black/20 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-transparent shadow-2xl rounded-xl overflow-hidden transform scale-125">
                <img src={imageUrl} alt={previewCard.name} className="w-[300px] h-auto rounded-xl" />
                <div className="absolute bottom-0 inset-x-0 bg-black/70 text-white p-2 text-center text-xs backdrop-blur-md">
                    Click card for details
                </div>
            </div>
        </div>
    );
};

const Content: React.FC = () => {
    const { loading, activeView, activeUniverse } = useCollection();
    const { loading: authLoading } = useAuth();

    // Show loading while auth initializes
    if (authLoading) {
        return (
            <div className="h-screen flex flex-col items-center justify-center bg-gray-50 text-gray-400">
                <i className="fa-solid fa-circle-notch fa-spin text-4xl text-primary mb-4"></i>
                <p>Initializing...</p>
            </div>
        );
    }

    // If no universe selected, show welcome screen
    if (!activeUniverse) {
        return <WelcomeView />;
    }

    if (loading) {
        return (
            <div className="h-screen flex flex-col items-center justify-center bg-gray-50 text-gray-400">
                <i className="fa-solid fa-circle-notch fa-spin text-4xl text-primary mb-4"></i>
                <p>Loading {activeUniverse === 'atla' ? 'Avatar Archives' : (activeUniverse === 'ecl' ? 'Lorwyn Eclipsed Database' : 'Final Fantasy Database')}...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 font-sans text-gray-900">
            <Navigation />
            <CardPreviewOverlay />
            <main className="pb-20">
                {activeView === 'library' && <LibraryView />}
                {activeView === 'jumpstart' && <DecksView />}
                {activeView === 'builder' && <DeckBuilder />}
                {activeView === 'dashboard' && <StatsDashboard />}
                {activeView === 'rules' && <RulesView />}
            </main>
        </div>
    );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <CollectionProvider>
        <Content />
      </CollectionProvider>
    </AuthProvider>
  );
};

export default App;
