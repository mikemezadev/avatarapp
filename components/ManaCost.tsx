import React from 'react';
import { MANA_SYMBOLS } from '../constants';

interface ManaCostProps {
  manaCost?: string;
}

export const ManaCost: React.FC<ManaCostProps> = ({ manaCost }) => {
  if (!manaCost) return null;

  const symbols = manaCost.match(/\{([^}]+)\}/g);
  if (!symbols) return <span>{manaCost}</span>;

  return (
    <div className="flex items-center gap-0.5">
      {symbols.map((symbol, idx) => {
        const key = symbol.replace(/\{|\}/g, '');
        const iconUrl = MANA_SYMBOLS[key] || MANA_SYMBOLS[key.replace('/', '')] || '';
        
        if (iconUrl) {
          return (
            <img 
              key={idx} 
              src={iconUrl} 
              alt={key} 
              className="w-4 h-4 shadow-sm rounded-full"
              title={key}
            />
          );
        }
        return <span key={idx} className="font-bold text-gray-700 mx-0.5">{key}</span>;
      })}
    </div>
  );
};
