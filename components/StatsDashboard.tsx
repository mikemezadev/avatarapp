
import React, { useMemo } from 'react';
import { useCollection } from './CollectionContext';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid, LabelList } from 'recharts';
import { DEFAULT_FILTERS } from './CollectionContext';

export const StatsDashboard: React.FC = () => {
  const { cards, decks, collection, totalValue, setLibraryFilters, setActiveView, activeUniverse } = useCollection();

  const totalCardsOwned = (Object.values(collection.cards) as number[]).reduce((a, b) => a + b, 0) + 
                          (Object.values(collection.foilCards) as number[]).reduce((a, b) => a + b, 0);
                          
  const totalDecksOwned = Object.values(collection.decks).filter(Boolean).length;
  
  // Navigation Helper
  const navigateToFilteredLibrary = (filters: Partial<typeof DEFAULT_FILTERS>) => {
      setLibraryFilters({ ...DEFAULT_FILTERS, ...filters });
      setActiveView('library');
  };

  // Click Handlers
  const handleSetClick = (data: any, type: 'owned' | 'missing') => {
      // Find set code from name
      if (!data?.name) return;
      
      const name = data.name;
      if (name === 'Other') return; // Cannot easily filter for 'Other' with current simple filter

      const setCode = name.toLowerCase();
      navigateToFilteredLibrary({ 
          set: setCode, 
          ownershipStatus: type === 'owned' ? 'owned' : 'missing' 
      });
  };

  const handleTypeClick = (data: any) => {
      if (!data?.name) return;
      navigateToFilteredLibrary({ 
          types: [data.name],
          ownershipStatus: 'owned'
      });
  };

  const handleRarityClick = (data: any) => {
      if (!data?.name) return;
      navigateToFilteredLibrary({ 
          rarity: data.name.toLowerCase(),
          ownershipStatus: 'owned'
      });
  };

  const handlePriceClick = (data: any) => {
      if (!data?.startVal && data?.startVal !== 0) return;
      navigateToFilteredLibrary({ 
          minPrice: data.startVal,
          maxPrice: data.startVal + 5,
          ownershipStatus: 'owned'
      });
  };

  // Data for Card Type Bar Chart
  const typeData = ['Creature', 'Instant', 'Sorcery', 'Enchantment', 'Artifact', 'Land', 'Planeswalker'].map(type => ({
    name: type,
    count: cards.reduce((sum, card) => {
        const regularOwned = collection.cards[card.id] || 0;
        const foilOwned = collection.foilCards[card.id] || 0;
        const total = regularOwned + foilOwned;
        
        if (total > 0 && card.type_line.includes(type)) {
            return sum + total;
        }
        return sum;
    }, 0)
  })).filter(d => d.count > 0);

  // Data for Rarity Bar Chart
  const rarityData = ['common', 'uncommon', 'rare', 'mythic'].map(rarity => ({
    name: rarity.charAt(0).toUpperCase() + rarity.slice(1),
    count: cards.reduce((sum, card) => {
        const regularOwned = collection.cards[card.id] || 0;
        const foilOwned = collection.foilCards[card.id] || 0;
        const total = regularOwned + foilOwned;

        if (card.rarity === rarity && total > 0) {
            return sum + total;
        }
        return sum;
    }, 0)
  }));

  // Data for Set Progress (Grouped based on Universe)
  const setProgressData = useMemo(() => {
    let groups: Record<string, { name: string, total: number, owned: number }> = {};

    // Initialize groups based on active universe
    if (activeUniverse === 'atla') {
        groups = {
            'TLA': { name: 'TLA', total: 0, owned: 0 },
            'TLE': { name: 'TLE', total: 0, owned: 0 },
            'Other': { name: 'Other', total: 0, owned: 0 }
        };
    } else if (activeUniverse === 'ff') {
        groups = {
            'FIN': { name: 'FIN', total: 0, owned: 0 },
            'FIC': { name: 'FIC', total: 0, owned: 0 },
            'Other': { name: 'Other', total: 0, owned: 0 }
        };
    } else if (activeUniverse === 'ecl') {
        groups = {
            'ECL': { name: 'ECL', total: 0, owned: 0 },
            'ECC': { name: 'ECC', total: 0, owned: 0 },
            'Other': { name: 'Other', total: 0, owned: 0 }
        };
    } else {
        // Fallback
        groups = {
            'Other': { name: 'Other', total: 0, owned: 0 }
        };
    }

    cards.forEach(card => {
        const setCode = card.set ? card.set.toLowerCase() : '';
        let groupKey = 'Other';

        // Determine which group this card belongs to
        if (activeUniverse === 'atla') {
            if (setCode === 'tla') groupKey = 'TLA';
            else if (setCode === 'tle') groupKey = 'TLE';
        } else if (activeUniverse === 'ff') {
            if (setCode === 'fin') groupKey = 'FIN';
            else if (setCode === 'fic') groupKey = 'FIC';
        } else if (activeUniverse === 'ecl') {
            if (setCode === 'ecl') groupKey = 'ECL';
            else if (setCode === 'ecc') groupKey = 'ECC';
        }

        if (groups[groupKey]) {
            groups[groupKey].total++;

            // Check if owned (unique)
            const isOwned = (collection.cards[card.id] && collection.cards[card.id] > 0) || 
                            (collection.foilCards[card.id] && collection.foilCards[card.id] > 0);
            
            if (isOwned) {
                groups[groupKey].owned++;
            }
        }
    });

    return Object.values(groups).map(g => ({
        ...g,
        missing: g.total - g.owned,
        percent: g.total > 0 ? Math.round((g.owned / g.total) * 100) : 0
    }));
  }, [cards, collection, activeUniverse]);

  // Data for Price Histogram (Binning by $5 increments)
  const priceData = useMemo(() => {
      const bins: Record<string, number> = {};
      const increment = 5;

      cards.forEach(card => {
          const regQty = collection.cards[card.id] || 0;
          const foilQty = collection.foilCards[card.id] || 0;
          
          if (regQty > 0) {
              const price = parseFloat(card.prices?.usd || '0');
              const binIndex = Math.floor(price / increment) * increment;
              const binLabel = `$${binIndex}-${binIndex + increment}`;
              bins[binLabel] = (bins[binLabel] || 0) + regQty;
          }
          if (foilQty > 0) {
              const price = parseFloat(card.prices?.usd_foil || '0');
              const binIndex = Math.floor(price / increment) * increment;
              const binLabel = `$${binIndex}-${binIndex + increment}`;
              bins[binLabel] = (bins[binLabel] || 0) + foilQty;
          }
      });

      // Sort bins by value
      return Object.entries(bins).map(([name, count]) => {
          const startVal = parseInt(name.replace('$', '').split('-')[0]);
          return { name, count, startVal };
      }).sort((a, b) => a.startVal - b.startVal);

  }, [cards, collection]);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        {/* Header Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div 
                onClick={() => navigateToFilteredLibrary({ ownershipStatus: 'owned', sort: 'price', order: 'desc' })}
                className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center cursor-pointer hover:border-green-300 hover:shadow-md transition-all group"
            >
                <span className="text-gray-500 text-sm font-medium uppercase tracking-wider group-hover:text-green-600">Total Value</span>
                <span className="text-4xl font-bold text-green-600 mt-2">${totalValue.toFixed(2)}</span>
            </div>
            <div 
                onClick={() => navigateToFilteredLibrary({ ownershipStatus: 'owned' })}
                className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center cursor-pointer hover:border-primary/50 hover:shadow-md transition-all group"
            >
                <span className="text-gray-500 text-sm font-medium uppercase tracking-wider group-hover:text-primary">Cards Owned</span>
                <span className="text-4xl font-bold text-primary mt-2">{totalCardsOwned}</span>
            </div>
            <div 
                onClick={() => setActiveView('jumpstart')}
                className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center cursor-pointer hover:border-secondary/50 hover:shadow-md transition-all group"
            >
                <span className="text-gray-500 text-sm font-medium uppercase tracking-wider group-hover:text-secondary">Jumpstart Decks Collected</span>
                <span className="text-4xl font-bold text-secondary mt-2">{totalDecksOwned} <span className="text-xl text-gray-400 font-normal">/ {decks.length}</span></span>
            </div>
            <div 
                onClick={() => navigateToFilteredLibrary({ ownershipStatus: 'all' })}
                className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center cursor-pointer hover:border-orange-300 hover:shadow-md transition-all group"
            >
                <span className="text-gray-500 text-sm font-medium uppercase tracking-wider group-hover:text-orange-500">Completion</span>
                <span className="text-4xl font-bold text-orange-500 mt-2">
                    {Math.round(((Object.keys(collection.cards).length + Object.keys(collection.foilCards).length) / (cards.length * 2)) * 100) || 0}%
                </span>
            </div>
        </div>

        {/* Charts Row 1: Set Progress */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h3 className="text-lg font-bold text-gray-800 mb-6">Set Completion Progress <span className="text-xs font-normal text-gray-500 ml-2">(Click bar to filter)</span></h3>
            <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={setProgressData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                        <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                        <Tooltip 
                            cursor={{fill: '#f3f4f6'}} 
                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                        />
                        <Legend />
                        <Bar 
                            dataKey="owned" 
                            stackId="a" 
                            fill="#8884d8" 
                            name="Collected" 
                            radius={[0, 0, 4, 4]} 
                            cursor="pointer"
                            onClick={(data) => handleSetClick(data, 'owned')}
                        />
                        <Bar 
                            dataKey="missing" 
                            stackId="a" 
                            fill="#e2e8f0" 
                            name="Missing" 
                            radius={[4, 4, 0, 0]}
                            cursor="pointer"
                            onClick={(data) => handleSetClick(data, 'missing')}
                        >
                             <LabelList dataKey="percent" position="top" formatter={(val: any) => `${val}%`} fill="#666" fontSize={12} fontWeight="bold" />
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>

        {/* Charts Row 2 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <h3 className="text-lg font-bold text-gray-800 mb-6">Card Type Distribution</h3>
                <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={typeData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                            <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                            <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                            <Tooltip cursor={{fill: '#f3f4f6'}} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }} />
                            <Bar 
                                dataKey="count" 
                                fill="#4a90e2" 
                                radius={[4, 4, 0, 0]} 
                                name="Cards" 
                                cursor="pointer"
                                onClick={handleTypeClick}
                            />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <h3 className="text-lg font-bold text-gray-800 mb-6">Rarity Breakdown</h3>
                <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={rarityData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                            <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                            <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                            <Tooltip cursor={{fill: '#f3f4f6'}} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }} />
                            <Bar 
                                dataKey="count" 
                                fill="#667eea" 
                                radius={[4, 4, 0, 0]} 
                                name="Cards" 
                                cursor="pointer"
                                onClick={handleRarityClick}
                            />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>

        {/* Charts Row 3: Price Histogram */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
             <h3 className="text-lg font-bold text-gray-800 mb-6">Value Distribution ($5 Increments)</h3>
             <div className="h-80">
                 {priceData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={priceData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                            <XAxis 
                                dataKey="name" 
                                stroke="#94a3b8" 
                                fontSize={10} 
                                tickLine={false} 
                                axisLine={false} 
                                angle={-45} 
                                textAnchor="end" 
                                height={60}
                            />
                            <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                            <Tooltip cursor={{fill: '#f3f4f6'}} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }} />
                            <Bar 
                                dataKey="count" 
                                fill="#10b981" 
                                radius={[4, 4, 0, 0]} 
                                name="Quantity" 
                                cursor="pointer"
                                onClick={handlePriceClick}
                            />
                        </BarChart>
                    </ResponsiveContainer>
                 ) : (
                     <div className="h-full flex items-center justify-center text-gray-400">
                         No pricing data available for collected cards.
                     </div>
                 )}
             </div>
        </div>
    </div>
  );
};
