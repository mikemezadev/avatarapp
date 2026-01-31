
import React from 'react';
import { useCollection } from './CollectionContext';
import { UNIVERSES } from '../constants';

const UniverseIcon = ({ config, className }: { config: any, className: string }) => {
  // Always prefer SVG path if available for consistent flat icon look on welcome screen
  if (config.icon && config.iconType === 'svg') {
     return (
        <svg viewBox={config.viewBox || "0 0 350 480"} className={className} fill="currentColor">
            <path d={config.icon} />
        </svg>
     );
  }
  
  if (config.logo) {
      return <img src={config.logo} alt={config.name} className={className} />;
  }
  
  return <i className={`fa-solid ${config.icon} ${className}`}></i>;
}

export const WelcomeView: React.FC = () => {
  const { switchUniverse } = useCollection();

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 animate-in fade-in zoom-in duration-500">
        <div className="text-center mb-12">
            <h1 className="text-5xl font-extrabold text-gray-900 mb-4 tracking-tight">Universes Beyond</h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">Choose your collection manager.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-7xl w-full">
            {/* ATLA Option */}
            <button 
                onClick={() => switchUniverse('atla')}
                className="group relative h-96 rounded-3xl overflow-hidden shadow-xl hover:shadow-2xl transition-all hover:-translate-y-2 border border-gray-200 bg-white"
            >
                <div className="absolute inset-0 bg-gradient-to-br from-gray-50 to-white group-hover:from-blue-50 group-hover:to-white transition-colors duration-500"></div>
                <div className="absolute inset-0 flex flex-col items-center justify-center p-12 z-10">
                    <UniverseIcon config={UNIVERSES.atla} className="w-56 h-auto mb-8 drop-shadow-sm group-hover:scale-110 transition-transform duration-500 object-contain text-gray-900" />
                    <h3 className="text-2xl font-bold text-gray-800 mb-2">Avatar: The Last Airbender</h3>
                    
                    <div className="mt-4 px-6 py-3 bg-gray-900 text-white rounded-full text-sm font-bold opacity-0 group-hover:opacity-100 transition-all transform translate-y-4 group-hover:translate-y-0 shadow-lg">
                        Enter Collection <i className="fa-solid fa-arrow-right ml-2"></i>
                    </div>
                </div>
            </button>

            {/* Final Fantasy Option */}
            <button 
                onClick={() => switchUniverse('ff')}
                className="group relative h-96 rounded-3xl overflow-hidden shadow-xl hover:shadow-2xl transition-all hover:-translate-y-2 border border-gray-200 bg-white"
            >
                <div className="absolute inset-0 bg-gradient-to-br from-gray-50 to-white group-hover:from-purple-50 group-hover:to-white transition-colors duration-500"></div>
                <div className="absolute inset-0 flex flex-col items-center justify-center p-12 z-10">
                    <UniverseIcon config={UNIVERSES.ff} className="w-56 h-auto mb-8 drop-shadow-sm group-hover:scale-110 transition-transform duration-500 object-contain text-gray-900" />
                    <h3 className="text-2xl font-bold text-gray-800 mb-2">Final Fantasy</h3>
                    
                    <div className="mt-4 px-6 py-3 bg-gray-900 text-white rounded-full text-sm font-bold opacity-0 group-hover:opacity-100 transition-all transform translate-y-4 group-hover:translate-y-0 shadow-lg">
                        Enter Collection <i className="fa-solid fa-arrow-right ml-2"></i>
                    </div>
                </div>
            </button>

            {/* Lorwyn Eclipsed Option */}
            <button 
                onClick={() => switchUniverse('ecl')}
                className="group relative h-96 rounded-3xl overflow-hidden shadow-xl hover:shadow-2xl transition-all hover:-translate-y-2 border border-gray-200 bg-white"
            >
                <div className="absolute inset-0 bg-gradient-to-br from-gray-50 to-white group-hover:from-emerald-50 group-hover:to-white transition-colors duration-500"></div>
                <div className="absolute inset-0 flex flex-col items-center justify-center p-12 z-10">
                    <UniverseIcon config={UNIVERSES.ecl} className="w-56 h-56 mb-8 drop-shadow-sm group-hover:scale-110 transition-transform duration-500 text-gray-900" />
                    <h3 className="text-2xl font-bold text-gray-800 mb-2">Lorwyn Eclipsed</h3>
                    
                    <div className="mt-4 px-6 py-3 bg-gray-900 text-white rounded-full text-sm font-bold opacity-0 group-hover:opacity-100 transition-all transform translate-y-4 group-hover:translate-y-0 shadow-lg">
                        Enter Collection <i className="fa-solid fa-arrow-right ml-2"></i>
                    </div>
                </div>
            </button>
        </div>
        
        <p className="mt-12 text-sm text-gray-400">
            Select a universe to manage your decks, cards, and collection statistics.
        </p>
    </div>
  );
};
