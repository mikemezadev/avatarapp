
import React, { useState, useMemo, useEffect } from 'react';
import { useCollection, useCardHover } from './CollectionContext';
import { CardModal } from './CardModal';
import { ManaCost } from './ManaCost';
import { Card } from '../types';
import { MANA_SYMBOLS } from '../constants';

const CMCS = [0, 1, 2, 3, 4, 5, 6, 7, 8];

const PRICE_RANGES = [
    { label: 'Any Price', min: undefined, max: undefined },
    { label: 'Under $1', min: 0, max: 1 },
    { label: '$1 - $5', min: 1, max: 5 },
    { label: '$5 - $10', min: 5, max: 10 },
    { label: '$10 - $20', min: 10, max: 20 },
    { label: '$20 - $50', min: 20, max: 50 },
    { label: '$50+', min: 50, max: undefined },
];

type SortOption = 'collector_number' | 'name' | 'cmc' | 'price';
type SortOrder = 'asc' | 'desc';

// Defined Type Filters Hierarchy
const TYPE_FILTERS = [
    {
        label: 'Creatures',
        options: [
            { id: 'Creature', label: 'All Creatures' },
            { id: 'Legendary Creature', label: 'Legendary Creature' },
            { id: 'Artifact Creature', label: 'Artifact Creature' },
            { id: 'Legendary Artifact Creature', label: 'Legendary Artifact Creature' },
        ]
    },
    {
        label: 'Artifacts',
        options: [
            { id: 'Artifact', label: 'All Artifacts' },
            { id: 'Legendary Artifact', label: 'Legendary Artifact' },
            { id: 'Equipment', label: 'Equipment' }, // Assumed Artifact
            { id: 'Vehicle', label: 'Vehicle' }, // Assumed Artifact
        ]
    },
    {
        label: 'Enchantments',
        options: [
            { id: 'Enchantment', label: 'All Enchantments' },
            { id: 'Legendary Enchantment', label: 'Legendary Enchantment' },
            { id: 'Aura', label: 'Aura' }, // Assumed Enchantment
            { id: 'Saga', label: 'Saga' }, // Assumed Enchantment
        ]
    },
    {
        label: 'Instants & Sorceries',
        options: [
            { id: 'Instant', label: 'Instant' },
            { id: 'Sorcery', label: 'Sorcery' },
            { id: 'Instant Lesson', label: 'Instant - Lesson' },
            { id: 'Sorcery Lesson', label: 'Sorcery - Lesson' },
        ]
    },
    {
        label: 'Lands',
        options: [
            { id: 'Land', label: 'All Lands' },
            { id: 'Basic Land', label: 'Basic Land' },
        ]
    },
    {
        label: 'Other',
        options: [
            { id: 'Planeswalker', label: 'Planeswalker' },
            { id: 'Token', label: 'Token' },
            { id: 'Emblem', label: 'Emblem' },
        ]
    }
];

export const LibraryView: React.FC = () => {
  const { cards, collection, updateCardQuantity, importCollection, libraryFilters, setLibraryFilters, resetLibraryFilters, decks, universeConfig, isBinderMode, setIsBinderMode } = useCollection();
  const { onMouseEnter, onMouseLeave } = useCardHover();

  // Destructure filters for easier usage
  const { 
      search, 
      rarity: selectedRarity, 
      set: selectedSet, 
      types: selectedTypes,
      cmc: selectedCMC, 
      ownershipStatus,
      colors: selectedColors,
      sort: sortBy,
      order: sortOrder,
      minPrice,
      maxPrice
  } = libraryFilters;

  // Helper to update specific filter fields
  const updateFilter = (updates: Partial<typeof libraryFilters>) => {
      setLibraryFilters(prev => ({ ...prev, ...updates }));
      setPage(1);
  };
  
  // Determine current price range index for dropdown
  const currentPriceRangeIndex = PRICE_RANGES.findIndex(r => r.min === minPrice && r.max === maxPrice);
  const handlePriceRangeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      const idx = parseInt(e.target.value);
      if (idx >= 0 && idx < PRICE_RANGES.length) {
          updateFilter({ minPrice: PRICE_RANGES[idx].min, maxPrice: PRICE_RANGES[idx].max });
      }
  };

  // Modal State
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);

  // Pagination State
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState<number | 'all'>(30);
  
  // Binder Page Size State
  const [binderCapacity, setBinderCapacity] = useState<9 | 12>(9);

  // Import/Export State
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importText, setImportText] = useState('');
  const [importStatus, setImportStatus] = useState<{success: number, total: number} | null>(null);
  const [exportCopied, setExportCopied] = useState(false);
  
  // Card Flip State
  const [flippedCards, setFlippedCards] = useState<Record<string, boolean>>({});

  // Type Filter Section Toggle State
  const [expandedTypeSection, setExpandedTypeSection] = useState<string | null>('Creatures');

  const toggleCardFlip = (cardId: string) => {
      setFlippedCards(prev => ({
          ...prev,
          [cardId]: !prev[cardId]
      }));
  };

  // Toggle basic color filters
  const toggleColor = (color: string) => {
      const newColors = selectedColors.includes(color) 
        ? selectedColors.filter(c => c !== color) 
        : [...selectedColors, color];
      updateFilter({ colors: newColors });
  };

  // Toggle specific type filters
  const toggleType = (typeId: string) => {
      const newTypes = selectedTypes.includes(typeId)
        ? selectedTypes.filter(t => t !== typeId)
        : [...selectedTypes, typeId];
      updateFilter({ types: newTypes });
  };

  // Import/Export Handlers
  const handleExport = () => {
    const lines: string[] = [];
    
    // Sort keys to make export deterministic
    const sortedCardIds = Object.keys(collection.cards).sort();
    const sortedFoilIds = Object.keys(collection.foilCards).sort();

    // Regular Cards
    sortedCardIds.forEach(id => {
        const qty = collection.cards[id];
        const card = cards.find(c => c.id === id);
        if(card && qty > 0) {
            lines.push(`${qty} ${card.name} (${card.set.toUpperCase()}) ${card.collector_number}`);
        }
    });

    // Foil Cards
    sortedFoilIds.forEach(id => {
        const qty = collection.foilCards[id];
        const card = cards.find(c => c.id === id);
        if(card && qty > 0) {
             lines.push(`${qty} ${card.name} (${card.set.toUpperCase()}) ${card.collector_number} *F*`);
        }
    });

    const text = lines.join('\n');
    navigator.clipboard.writeText(text).then(() => {
        setExportCopied(true);
        setTimeout(() => setExportCopied(false), 2000);
    }).catch(err => {
        console.error('Failed to copy export text:', err);
        alert('Failed to copy to clipboard. Please check console.');
    });
  };

  const handleProcessImport = () => {
      if (!importText.trim()) return;

      const lines = importText.split('\n');
      const itemsToImport: { id: string, qty: number, isFoil: boolean }[] = [];
      let successCount = 0;

      // Regex: Qty Name (Set) CN *F*?
      // Matches: "4 Lightning Bolt (MM2) 122 *F*" or "1 Black Lotus (LEA) 232"
      const regex = /^(\d+)\s+(.+?)\s+\(([A-Za-z0-9]+)\)\s+(\S+)(?:\s+(\*F\*))?\s*$/i;

      lines.forEach(line => {
          const trimmed = line.trim();
          if (!trimmed) return;

          const match = trimmed.match(regex);
          if (match) {
              const qty = parseInt(match[1]);
              const name = match[2];
              const setCode = match[3].toLowerCase();
              const cn = match[4];
              const isFoil = !!match[5]; // Group 5 is *F*

              // Find card in database
              const card = cards.find(c => c.set === setCode && c.collector_number === cn);
              
              if (card) {
                  itemsToImport.push({ id: card.id, qty, isFoil });
                  successCount++;
              }
          }
      });

      if (itemsToImport.length > 0) {
          importCollection(itemsToImport);
          setImportText('');
          setImportStatus({ success: successCount, total: lines.filter(l => l.trim()).length });
          setTimeout(() => {
              setIsImportModalOpen(false);
              setImportStatus(null);
          }, 1500);
      } else {
          alert('No valid cards found in text. Check format: Qty Name (SET) # [*F*]');
      }
  };

  const filteredCards = useMemo(() => {
    // Helper to get effective price (USD > Foil > 0)
    const getPrice = (c: Card) => {
        const reg = parseFloat(c.prices?.usd || '0');
        if (reg > 0) return reg;
        return parseFloat(c.prices?.usd_foil || '0');
    };

    let result = cards.filter(card => {
      const typeLine = card.type_line || card.card_faces?.[0]?.type_line || '';
      const oracleText = card.oracle_text || card.card_faces?.[0]?.oracle_text || '';

      // 1. Text Search
      const matchesSearch = !search || 
                            card.name.toLowerCase().includes(search.toLowerCase()) || 
                            typeLine.toLowerCase().includes(search.toLowerCase()) ||
                            oracleText.toLowerCase().includes(search.toLowerCase());
      
      // 2. Rarity
      const matchesRarity = !selectedRarity || card.rarity === selectedRarity;
      
      // 3. Set
      const matchesSet = !selectedSet || card.set === selectedSet;

      // 4. Type (New Complex Logic)
      let matchesType = true;
      if (selectedTypes.length > 0) {
          // If any of the selected types match, include the card (OR logic between selections)
          // Logic for specific complex types:
          matchesType = selectedTypes.some(selectedId => {
              const t = typeLine; 
              // Helper to check includes
              const has = (s: string) => t.includes(s);

              switch(selectedId) {
                  // Creatures
                  case 'Creature': return has('Creature');
                  case 'Legendary Creature': return has('Legendary') && has('Creature');
                  case 'Artifact Creature': return has('Artifact') && has('Creature');
                  case 'Legendary Artifact Creature': return has('Legendary') && has('Artifact') && has('Creature');
                  
                  // Artifacts
                  case 'Artifact': return has('Artifact');
                  case 'Legendary Artifact': return has('Legendary') && has('Artifact');
                  case 'Equipment': return has('Equipment');
                  case 'Vehicle': return has('Vehicle');
                  
                  // Enchantments
                  case 'Enchantment': return has('Enchantment');
                  case 'Legendary Enchantment': return has('Legendary') && has('Enchantment');
                  case 'Aura': return has('Aura');
                  case 'Saga': return has('Saga');
                  
                  // Spells
                  case 'Instant': return has('Instant');
                  case 'Sorcery': return has('Sorcery');
                  case 'Instant Lesson': return has('Instant') && has('Lesson');
                  case 'Sorcery Lesson': return has('Sorcery') && has('Lesson');
                  
                  // Lands
                  case 'Land': return has('Land');
                  case 'Basic Land': return has('Basic') && has('Land');

                  // Other
                  case 'Planeswalker': return has('Planeswalker');
                  case 'Token': return has('Token');
                  case 'Emblem': return has('Emblem');
                  
                  default: return has(selectedId);
              }
          });
      }

      // 5. CMC
      const matchesCMC = selectedCMC === '' || (card.cmc !== undefined && card.cmc === parseInt(selectedCMC));

      // 6. Ownership
      const regularOwned = collection.cards[card.id] && collection.cards[card.id] > 0;
      const foilOwned = collection.foilCards[card.id] && collection.foilCards[card.id] > 0;
      const isOwned = regularOwned || foilOwned;

      let matchesOwnership = true;
      if (ownershipStatus === 'owned') {
          matchesOwnership = isOwned;
      } else if (ownershipStatus === 'missing') {
          matchesOwnership = !isOwned;
      }

      // 7. Colors
      let matchesColor = true;
      if (selectedColors.length > 0) {
          const cardColors = card.colors || [];
          const isColorless = cardColors.length === 0;
          const matchesColorless = selectedColors.includes('C') && isColorless;
          const matchesColored = selectedColors.some(c => c !== 'C' && cardColors.includes(c));
          matchesColor = matchesColorless || matchesColored;
      }

      // 8. Price Range
      const price = getPrice(card);
      const matchesMinPrice = minPrice === undefined || price >= minPrice;
      const matchesMaxPrice = maxPrice === undefined || price < maxPrice;

      return matchesSearch && matchesRarity && matchesSet && matchesType && matchesCMC && matchesOwnership && matchesColor && matchesMinPrice && matchesMaxPrice;
    });

    const getSetRank = (setCode: string) => {
        const sets = universeConfig ? universeConfig.sets : [];
        const index = sets.findIndex(s => s.code === setCode);
        return index === -1 ? 999 : index;
    };

    result.sort((a, b) => {
        let comparison = 0;
        switch (sortBy) {
            case 'name':
                comparison = a.name.localeCompare(b.name);
                break;
            case 'cmc':
                comparison = (a.cmc || 0) - (b.cmc || 0);
                break;
            case 'price':
                comparison = getPrice(a) - getPrice(b);
                break;
            case 'collector_number':
            default:
                const rankA = getSetRank(a.set);
                const rankB = getSetRank(b.set);
                if (rankA !== rankB) {
                    comparison = rankA - rankB;
                } else {
                    const numA = parseInt(a.collector_number.replace(/\D/g,'')) || 0;
                    const numB = parseInt(b.collector_number.replace(/\D/g,'')) || 0;
                    if (numA !== numB) comparison = numA - numB;
                    else comparison = a.collector_number.localeCompare(b.collector_number);
                }
                break;
        }
        return sortOrder === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [cards, search, selectedRarity, selectedSet, selectedTypes, selectedCMC, ownershipStatus, selectedColors, collection.cards, collection.foilCards, sortBy, sortOrder, minPrice, maxPrice, universeConfig]);

  // --- Pagination Logic ---
  
  let startIdx = 0;
  let endIdx = 0;
  let totalPages = 1;

  if (isBinderMode) {
      const cardsCount = filteredCards.length;

      if (binderCapacity === 12) {
          const effectiveItemsPerPage = 12;
          totalPages = Math.ceil(cardsCount / effectiveItemsPerPage) || 1;
          const safePage = Math.max(1, Math.min(page, totalPages));
          startIdx = (safePage - 1) * effectiveItemsPerPage;
          endIdx = startIdx + effectiveItemsPerPage;
      } else {
          const spreadCapacity = 18;
          if (cardsCount <= 9) {
              totalPages = 1;
          } else {
              totalPages = 1 + Math.ceil((cardsCount - 9) / spreadCapacity);
          }
          const safePage = Math.max(1, Math.min(page, totalPages));
          if (safePage === 1) {
              startIdx = 0;
              endIdx = 9;
          } else {
              startIdx = 9 + (safePage - 2) * 18;
              endIdx = startIdx + 18;
          }
      }
  } else {
      const effectiveItemsPerPage = perPage === 'all' ? Math.max(filteredCards.length, 1) : perPage;
      totalPages = Math.ceil(filteredCards.length / effectiveItemsPerPage);
      const safePage = Math.max(1, Math.min(page, totalPages));
      startIdx = (safePage - 1) * effectiveItemsPerPage;
      endIdx = safePage * effectiveItemsPerPage;
  }

  useEffect(() => {
    if (page > totalPages && totalPages > 0) {
        setPage(1);
    }
  }, [totalPages, page]);

  const paginatedCards = filteredCards.slice(startIdx, endIdx);

  // Modal Navigation Handlers
  const handleNextCard = () => {
      if (!selectedCard) return;
      const currentIndex = filteredCards.findIndex(c => c.id === selectedCard.id);
      if (currentIndex !== -1 && currentIndex < filteredCards.length - 1) {
          setSelectedCard(filteredCards[currentIndex + 1]);
      }
  };

  const handlePrevCard = () => {
      if (!selectedCard) return;
      const currentIndex = filteredCards.findIndex(c => c.id === selectedCard.id);
      if (currentIndex > 0) {
          setSelectedCard(filteredCards[currentIndex - 1]);
      }
  };

  const activeSetQuote = useMemo(() => {
    if (!selectedSet || !universeConfig) return null;
    const set = universeConfig.sets.find(s => s.code === selectedSet);
    return set?.quote;
  }, [selectedSet, universeConfig]);

  const calculatePageValue = (cardsOnPage: (Card | undefined)[]) => {
      return cardsOnPage.reduce((total, card) => {
          if (!card) return total;
          const regQty = collection.cards[card.id] || 0;
          const foilQty = collection.foilCards[card.id] || 0;
          const regPrice = parseFloat(card.prices?.usd || '0');
          const foilPrice = parseFloat(card.prices?.usd_foil || '0');
          return total + (regQty * regPrice) + (foilQty * foilPrice);
      }, 0);
  };

  // --- Components for Binder View ---
  const BinderCardSlot = ({ card }: { card?: Card }) => {
      if (!card) {
          return <div className="w-full h-full bg-gray-100/5 rounded-lg border border-white/5 flex items-center justify-center"></div>;
      }

      const regularQty = collection.cards[card.id] || 0;
      const foilQty = collection.foilCards[card.id] || 0;
      const isCollected = regularQty > 0 || foilQty > 0;
      const isStacked = regularQty > 0 && foilQty > 0;
      
      const isFlipped = flippedCards[card.id];
      const hasBackFace = card.card_faces && card.card_faces.length > 1 && card.card_faces[1].image_uris;
      
      let imageUrl = 'https://via.placeholder.com/250x350?text=No+Image';
      if (isFlipped && hasBackFace) {
          imageUrl = card.card_faces![1].image_uris?.normal || card.card_faces![1].image_uris?.large || imageUrl;
      } else {
          imageUrl = card.image_uris?.normal || card.card_faces?.[0]?.image_uris?.normal || imageUrl;
      }

      return (
          <div 
              className="relative w-full h-full rounded-lg group cursor-pointer"
              onClick={() => setSelectedCard(card)}
          >
               {isStacked && (
                   <div 
                        className="absolute inset-0 bg-gray-800 rounded-lg transform -translate-x-2 -translate-y-2 border-t border-l border-gray-500 shadow-sm"
                        style={{ zIndex: 0 }}
                   ></div>
               )}

              <div className="relative w-full h-full rounded-lg overflow-hidden z-10 bg-black">
                  <img 
                      src={imageUrl} 
                      alt={card.name} 
                      className={`w-full h-full object-cover transition-all duration-300 ${isCollected ? '' : 'grayscale opacity-60'}`} 
                  />
                  {hasBackFace && (
                      <button 
                          onClick={(e) => { e.stopPropagation(); toggleCardFlip(card.id); }}
                          className="absolute top-1 right-1 z-40 bg-black/60 text-white w-6 h-6 rounded-full flex items-center justify-center hover:bg-black/80 transition-colors backdrop-blur-sm shadow-sm"
                          title="Flip Card"
                      >
                          <i className="fa-solid fa-arrows-rotate text-[10px]"></i>
                      </button>
                  )}
                  {foilQty > 0 && (
                      <div className="absolute inset-0 pointer-events-none z-20 rounded-lg">
                          <div className="absolute inset-0 opacity-25 mix-blend-color-dodge" style={{ background: 'linear-gradient(135deg, #ef4444 0%, #eab308 20%, #22c55e 40%, #3b82f6 60%, #a855f7 80%, #ef4444 100%)' }}></div>
                          <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/40 to-transparent mix-blend-overlay opacity-30"></div>
                      </div>
                  )}
                  <div className={`absolute bottom-0 inset-x-0 p-1.5 flex flex-col gap-1 transition-opacity duration-200 bg-black/80 backdrop-blur-[1px] ${(regularQty > 0 || foilQty > 0) ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} z-30`}>
                      <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-white/90 w-8">Reg</span>
                          <div className="flex items-center gap-1">
                              <button onClick={(e) => { e.stopPropagation(); updateCardQuantity(card.id, -1, false); }} className="w-5 h-5 rounded bg-white/20 hover:bg-white/40 text-white flex items-center justify-center transition-colors"><i className="fa-solid fa-minus text-[8px]"></i></button>
                              <span className="text-xs font-bold text-white min-w-[1rem] text-center">{regularQty}</span>
                              <button onClick={(e) => { e.stopPropagation(); updateCardQuantity(card.id, 1, false); }} className="w-5 h-5 rounded bg-blue-500/80 hover:bg-blue-500 text-white flex items-center justify-center transition-colors"><i className="fa-solid fa-plus text-[8px]"></i></button>
                          </div>
                      </div>
                      <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-orange-400 w-8 flex items-center gap-1"><i className="fa-solid fa-star text-[8px]"></i> Foil</span>
                          <div className="flex items-center gap-1">
                              <button onClick={(e) => { e.stopPropagation(); updateCardQuantity(card.id, -1, true); }} className="w-5 h-5 rounded bg-white/20 hover:bg-white/40 text-white flex items-center justify-center transition-colors"><i className="fa-solid fa-minus text-[8px]"></i></button>
                              <span className="text-xs font-bold text-orange-400 min-w-[1rem] text-center">{foilQty}</span>
                              <button onClick={(e) => { e.stopPropagation(); updateCardQuantity(card.id, 1, true); }} className="w-5 h-5 rounded bg-orange-600/80 hover:bg-orange-600 text-white flex items-center justify-center transition-colors"><i className="fa-solid fa-plus text-[8px]"></i></button>
                          </div>
                      </div>
                  </div>
              </div>
          </div>
      );
  };

  const renderBinderLayout = () => {
      // 12-POCKET LAYOUT (Single Page)
      if (binderCapacity === 12) {
          const slots = [...paginatedCards];
          while (slots.length < 12) { slots.push(undefined as any); }
          const pageValue = calculatePageValue(slots);

          return (
              <div className="flex flex-col items-center justify-center select-none py-4 px-2">
                  <div key={page} className="flex flex-col shadow-2xl rounded-lg overflow-hidden bg-[#151515] ring-1 ring-white/10 max-w-4xl transition-all duration-300">
                       <div className="w-full aspect-[4/3] bg-[#2a2a2a] p-4 md:p-6 flex flex-col relative">
                           <div className="text-center mb-3">
                               <span className="bg-black/30 px-3 py-1 rounded-full text-xs font-mono text-green-400 border border-white/5">Page Value: ${pageValue.toFixed(2)}</span>
                           </div>
                           <div className="flex-1 grid grid-cols-4 grid-rows-3 gap-3 md:gap-4 z-10">
                               {slots.map((card, i) => (
                                    <div key={card?.id || `p-${i}`} className="bg-white/5 rounded-sm p-1 shadow-inner h-full w-full border border-white/5">
                                        <BinderCardSlot card={card} />
                                    </div>
                               ))}
                           </div>
                           <div className="mt-3 text-center text-gray-500 text-xs font-mono z-10">Page {page}</div>
                       </div>
                  </div>
              </div>
          );
      }

      // 9-POCKET LAYOUT (Spread)
      const isCover = page === 1;
      const slots = [...paginatedCards];
      const totalSlotsNeeded = isCover ? 9 : 18;
      
      while (slots.length < totalSlotsNeeded) { slots.push(undefined as any); }
      
      const leftCards = isCover ? [] : slots.slice(0, 9);
      const rightCards = isCover ? slots.slice(0, 9) : slots.slice(9, 18);
      const leftPageValue = calculatePageValue(leftCards);
      const rightPageValue = calculatePageValue(rightCards);

      return (
          <div className="flex flex-col items-center justify-center select-none py-4 px-2">
              <div key={page} className={`flex flex-col xl:flex-row shadow-2xl rounded-lg overflow-hidden bg-[#151515] ring-1 ring-white/10 ${isCover ? 'max-w-2xl' : 'max-w-[84rem]'} transition-all duration-300`}>
                   {!isCover && (
                       <div className="w-full max-w-2xl aspect-[3/4] bg-[#2a2a2a] p-4 md:p-6 border-r-2 border-dashed border-black/40 flex flex-col relative">
                           <div className="text-center mb-3"><span className="bg-black/30 px-3 py-1 rounded-full text-xs font-mono text-green-400 border border-white/5">Page Value: ${leftPageValue.toFixed(2)}</span></div>
                           <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-black/20 to-transparent pointer-events-none"></div>
                           <div className="flex-1 grid grid-cols-3 grid-rows-3 gap-3 md:gap-4 z-10">
                               {leftCards.map((card, i) => (
                                    <div key={card?.id || `l-${i}`} className="bg-white/5 rounded-sm p-1 shadow-inner h-full w-full border border-white/5">
                                        <BinderCardSlot card={card} />
                                    </div>
                               ))}
                           </div>
                           <div className="mt-3 text-center text-gray-500 text-xs font-mono z-10">Page {9 + (page - 2) * 18 + 1}</div>
                       </div>
                   )}
                   <div className={`w-full max-w-2xl aspect-[3/4] bg-[#2a2a2a] p-4 md:p-6 flex flex-col relative ${!isCover ? 'border-l-2 border-dashed border-white/10' : ''}`}>
                       <div className="text-center mb-3"><span className="bg-black/30 px-3 py-1 rounded-full text-xs font-mono text-green-400 border border-white/5">Page Value: ${rightPageValue.toFixed(2)}</span></div>
                       {!isCover && <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-black/20 to-transparent pointer-events-none"></div>}
                       <div className="flex-1 grid grid-cols-3 grid-rows-3 gap-3 md:gap-4 z-10">
                           {rightCards.map((card, i) => (
                                <div key={card?.id || `r-${i}`} className="bg-white/5 rounded-sm p-1 shadow-inner h-full w-full border border-white/5">
                                    <BinderCardSlot card={card} />
                                </div>
                           ))}
                       </div>
                       <div className="mt-3 text-center text-gray-500 text-xs font-mono z-10">{isCover ? 'Front Page' : `Page ${9 + (page - 2) * 18 + 10}`}</div>
                   </div>
              </div>
          </div>
      );
  };
  
  const PaginationControls = () => (
      <div className="flex justify-center gap-2 py-4">
          <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors shadow-sm text-sm font-bold"><i className="fa-solid fa-chevron-left mr-2"></i> Previous</button>
          <span className="flex items-center px-4 font-medium text-gray-600 bg-white border border-gray-200 rounded-lg shadow-sm">{isBinderMode ? (binderCapacity === 12 ? `Page ${page}` : (page === 1 ? 'Front Page' : `Spread ${page-1}`)) : `Page ${page}`} of {totalPages}</span>
          <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)} className="px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors shadow-sm text-sm font-bold">Next <i className="fa-solid fa-chevron-right ml-2"></i></button>
      </div>
  );

  return (
    <div className="max-w-[90rem] mx-auto p-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex flex-col lg:flex-row gap-6">
            
            {/* LEFT SIDEBAR: FILTERS */}
            <div className="w-full lg:w-64 space-y-6 shrink-0">
                
                {/* 1. Sort & Display */}
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 space-y-3">
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Sort & Display</h3>
                    
                    {/* View Toggle */}
                    <div className="flex bg-gray-100 p-1 rounded-lg">
                        <button onClick={() => { setIsBinderMode(false); setPage(1); }} className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${!isBinderMode ? 'bg-white shadow text-primary' : 'text-gray-500 hover:text-gray-700'}`}><i className="fa-solid fa-th-large mr-1"></i> Grid</button>
                        <button onClick={() => { setIsBinderMode(true); setPage(1); }} className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${isBinderMode ? 'bg-white shadow text-primary' : 'text-gray-500 hover:text-gray-700'}`}><i className="fa-solid fa-book-open mr-1"></i> Binder</button>
                    </div>

                    {/* Sort Controls */}
                    <div className="flex gap-2">
                        <select className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary/20" value={sortBy} onChange={e => updateFilter({ sort: e.target.value as SortOption })}>
                            <option value="collector_number"># Number</option>
                            <option value="name">Name</option>
                            <option value="cmc">Mana Value</option>
                            <option value="price">Price</option>
                        </select>
                        <button onClick={() => updateFilter({ order: sortOrder === 'asc' ? 'desc' : 'asc' })} className="px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 hover:bg-gray-100 text-gray-600 transition-colors" title={sortOrder === 'asc' ? "Ascending" : "Descending"}><i className={`fa-solid fa-arrow-${sortOrder === 'asc' ? 'up' : 'down'}-wide-short`}></i></button>
                    </div>

                    {/* Per Page (Grid) OR Binder Size (Binder) */}
                    {isBinderMode ? (
                        <div className="space-y-1 pt-1 border-t border-gray-100">
                             <label className="text-xs font-bold text-gray-400 uppercase">Binder Layout</label>
                             <select className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary/20" value={binderCapacity} onChange={(e) => { setBinderCapacity(parseInt(e.target.value) as 9 | 12); setPage(1); }}>
                                <option value="9">9-Pocket (3x3) Spread</option>
                                <option value="12">12-Pocket (4x3) Single</option>
                            </select>
                        </div>
                    ) : (
                        <select className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary/20" value={perPage} onChange={(e) => { const val = e.target.value; setPerPage(val === 'all' ? 'all' : parseInt(val)); setPage(1); }}>
                            <option value="30">30 Items per page</option>
                            <option value="90">90 Items per page</option>
                            <option value="180">180 Items per page</option>
                            <option value="360">360 Items per page</option>
                            <option value="all">Show All Items</option>
                        </select>
                    )}
                </div>

                {/* 2. Collection Status */}
                 <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 space-y-3">
                     <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Collection Status</h3>
                     <div className="flex flex-col gap-2">
                        {['all', 'owned', 'missing'].map((status) => (
                            <button key={status} onClick={() => updateFilter({ ownershipStatus: status as any })} className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors border ${ownershipStatus === status ? 'bg-primary/10 text-primary border-primary/20' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>
                                <span className="capitalize">{status === 'all' ? 'All Cards' : status}</span>
                                {ownershipStatus === status && <i className="fa-solid fa-check float-right mt-1"></i>}
                            </button>
                        ))}
                     </div>
                 </div>

                 {/* 3. Data Management (Import/Export) */}
                 <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 space-y-3">
                     <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Import / Export</h3>
                     <div className="grid grid-cols-2 gap-2">
                        <button onClick={handleExport} className={`px-3 py-2 border rounded-lg text-xs font-bold flex flex-col items-center justify-center gap-1 transition-all ${exportCopied ? 'bg-green-50 border-green-200 text-green-700' : 'bg-gray-50 border-gray-200 hover:bg-gray-100 hover:border-gray-300 text-gray-700'}`}>
                            {exportCopied ? <i className="fa-solid fa-check text-sm"></i> : <i className="fa-solid fa-download text-sm"></i>}
                            {exportCopied ? 'Copied!' : 'Export'}
                        </button>
                        <button onClick={() => setIsImportModalOpen(true)} className="px-3 py-2 bg-gray-50 border border-gray-200 hover:bg-gray-100 hover:border-gray-300 text-gray-700 rounded-lg text-xs font-bold flex flex-col items-center justify-center gap-1 transition-all"><i className="fa-solid fa-upload text-sm"></i> Import</button>
                     </div>
                 </div>

                {/* 4. Card Types (New Section) */}
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 space-y-3">
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Card Types</h3>
                    <div className="space-y-2">
                        {TYPE_FILTERS.map((section) => (
                            <div key={section.label} className="border-b border-gray-100 last:border-0 pb-2 last:pb-0">
                                <button 
                                    className="w-full flex items-center justify-between text-xs font-bold text-gray-600 uppercase hover:text-primary py-1"
                                    onClick={() => setExpandedTypeSection(expandedTypeSection === section.label ? null : section.label)}
                                >
                                    <span>{section.label}</span>
                                    <i className={`fa-solid fa-chevron-down transition-transform duration-200 ${expandedTypeSection === section.label ? 'rotate-180' : ''}`}></i>
                                </button>
                                {expandedTypeSection === section.label && (
                                    <div className="pl-1 pt-1 space-y-1 animate-in slide-in-from-top-1 fade-in duration-200">
                                        {section.options.map(opt => {
                                            const isActive = selectedTypes.includes(opt.id);
                                            return (
                                                <button
                                                    key={opt.id}
                                                    onClick={() => toggleType(opt.id)}
                                                    className={`w-full text-left px-2 py-1.5 rounded text-xs transition-colors flex items-center justify-between ${
                                                        isActive 
                                                        ? 'bg-primary/10 text-primary font-bold' 
                                                        : 'text-gray-600 hover:bg-gray-50'
                                                    }`}
                                                >
                                                    <span>{opt.label}</span>
                                                    {isActive && <i className="fa-solid fa-check"></i>}
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* 5. Color Identity */}
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 space-y-3">
                     <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Color Identity</h3>
                     <div className="grid grid-cols-6 gap-2">
                        {['W', 'U', 'B', 'R', 'G', 'C'].map(c => (
                            <button key={c} onClick={() => toggleColor(c)} className={`aspect-square rounded-md flex items-center justify-center transition-all border ${selectedColors.includes(c) ? 'bg-gray-100 border-gray-300 shadow-inner' : 'border-transparent hover:bg-gray-50'}`} title={`Filter ${c}`}>
                                <img src={MANA_SYMBOLS[c]} alt={c} className={`w-5 h-5 ${selectedColors.includes(c) ? 'opacity-100' : 'opacity-40'}`} />
                            </button>
                        ))}
                     </div>
                </div>

                {/* 6. General Filters */}
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 space-y-3">
                    <div className="flex justify-between items-center">
                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Filters</h3>
                        <button onClick={resetLibraryFilters} className="text-xs text-red-500 hover:underline">Reset</button>
                    </div>

                    <select className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary/20" value={selectedSet} onChange={e => updateFilter({ set: e.target.value })}>
                         <option value="">All Sets</option>
                         {universeConfig?.sets.map(s => <option key={s.code} value={s.code}>{s.name} ({s.code.toUpperCase()})</option>)}
                     </select>

                     <select className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary/20" value={selectedRarity} onChange={e => updateFilter({ rarity: e.target.value })}>
                         <option value="">All Rarities</option>
                         <option value="common">Common</option>
                         <option value="uncommon">Uncommon</option>
                         <option value="rare">Rare</option>
                         <option value="mythic">Mythic</option>
                     </select>

                     <select className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary/20" value={currentPriceRangeIndex !== -1 ? currentPriceRangeIndex : ""} onChange={handlePriceRangeChange}>
                         {PRICE_RANGES.map((r, idx) => (
                             <option key={idx} value={idx}>{r.label}</option>
                         ))}
                         {currentPriceRangeIndex === -1 && (minPrice !== undefined || maxPrice !== undefined) && (
                             <option value="" disabled>Custom Range</option>
                         )}
                     </select>

                     <select className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary/20" value={selectedCMC} onChange={e => updateFilter({ cmc: e.target.value })}>
                         <option value="">Any Mana Cost</option>
                         {CMCS.map(c => <option key={c} value={c}>{c}</option>)}
                         <option value="9+">9+</option>
                     </select>
                </div>

            </div>

            {/* MAIN CONTENT */}
            <div className="flex-1 min-w-0 flex flex-col gap-6">
                
                {/* Top Controls: Search ONLY */}
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                     <div className="relative">
                        <i className="fa-solid fa-search absolute left-3 top-3 text-gray-400"></i>
                        <input type="text" placeholder="Search cards by name, type, or text..." className="w-full pl-10 pr-4 py-2 bg-white text-gray-900 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 placeholder-gray-400" value={search} onChange={e => updateFilter({ search: e.target.value })} />
                    </div>
                </div>

                {/* Active Info / Quotes */}
                {activeSetQuote && (
                    <div className="w-full bg-primary/5 rounded-lg p-3 text-center border border-primary/20">
                        <p className="text-primary italic font-serif">"{activeSetQuote}"</p>
                    </div>
                )}
                
                {/* Results Meta */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm font-medium text-gray-500">
                        Found {filteredCards.length} cards {isBinderMode && `in Binder View (${totalPages} ${binderCapacity === 12 ? 'pages' : (totalPages === 1 ? 'page' : 'spreads')})`}
                    </span>
                    
                    {(minPrice !== undefined || maxPrice !== undefined) && (
                        <div className="flex items-center gap-2 text-xs bg-green-50 text-green-700 px-2 py-1 rounded border border-green-100">
                            <i className="fa-solid fa-tag"></i>
                            {minPrice !== undefined ? `$${minPrice}` : '$0'} - {maxPrice !== undefined ? `$${maxPrice}` : 'Any'}
                            <button onClick={() => updateFilter({ minPrice: undefined, maxPrice: undefined })} className="ml-1 hover:text-green-900">
                                <i className="fa-solid fa-xmark"></i>
                            </button>
                        </div>
                    )}
                </div>

                {/* Top Pagination Control (Binder Mode Multi-page) */}
                {isBinderMode && totalPages > 1 && <PaginationControls />}

                {/* Card Display Area */}
                {isBinderMode ? renderBinderLayout() : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                        {paginatedCards.map(card => {
                            const regularQty = collection.cards[card.id] || 0;
                            const foilQty = collection.foilCards[card.id] || 0;
                            const totalQty = regularQty + foilQty;
                            const isFlipped = flippedCards[card.id];
                            const hasBackFace = card.card_faces && card.card_faces.length > 1 && card.card_faces[1].image_uris;

                            let imageUrl = 'https://via.placeholder.com/250x350?text=No+Image';
                            if (isFlipped && hasBackFace) {
                                imageUrl = card.card_faces![1].image_uris?.normal || card.card_faces![1].image_uris?.large || imageUrl;
                            } else {
                                imageUrl = card.image_uris?.normal || card.card_faces?.[0]?.image_uris?.normal || imageUrl;
                            }
                            
                            const isFrontCard = card.set === 'jtla' || card.set === 'ftla';
                            const variationCount = isFrontCard && universeConfig?.hasJumpstart ? decks.filter(d => {
                                if (card.set === 'jtla' && d.source !== 'Jumpstart Boosters') return false;
                                if (card.set === 'ftla' && d.source !== 'Beginner Box') return false;
                                if (d.themeCard === card.name) return true;
                                const titleBase = d.title.split(' (')[0].trim();
                                return titleBase.toLowerCase() === card.name.toLowerCase();
                            }).length : 0;

                            return (
                                <div key={card.id} className={`relative group bg-white rounded-xl shadow-sm border transition-all duration-200 hover:shadow-xl hover:-translate-y-1 cursor-pointer ${totalQty > 0 ? 'border-primary/50 ring-1 ring-primary/20' : 'border-gray-200'}`} onClick={() => setSelectedCard(card)} onMouseEnter={() => onMouseEnter(card, imageUrl)} onMouseLeave={onMouseLeave}>
                                    <div className="relative aspect-[5/7] overflow-hidden rounded-t-xl bg-gray-100">
                                        <img src={imageUrl} alt={card.name} loading="lazy" className="w-full h-full object-cover" />
                                        {hasBackFace && (
                                            <button onClick={(e) => { e.stopPropagation(); toggleCardFlip(card.id); }} className="absolute top-2 right-2 z-40 bg-black/60 text-white w-8 h-8 rounded-full flex items-center justify-center hover:bg-black/80 transition-colors backdrop-blur-sm shadow-sm opacity-0 group-hover:opacity-100" title="Flip Card"><i className="fa-solid fa-arrows-rotate"></i></button>
                                        )}
                                    </div>
                                    <div className="p-3">
                                        <h3 className="font-bold text-gray-800 text-sm truncate" title={card.name}>{card.name}</h3>
                                        <div className="flex items-center mt-1 mb-1 justify-between h-6">
                                            <div className="flex items-center">
                                                {variationCount > 1 ? (
                                                    <span className="text-[10px] font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded flex items-center gap-1">{variationCount} Variations</span>
                                                ) : (
                                                    <ManaCost manaCost={card.mana_cost || card.card_faces?.[0]?.mana_cost} />
                                                )}
                                            </div>
                                            <span className="text-xs text-gray-400 font-mono uppercase">{card.set} #{card.collector_number}</span>
                                        </div>
                                        <div className="space-y-1">
                                            <div className="flex items-center justify-between bg-gray-50 rounded px-2 py-1">
                                                <span className="text-xs text-gray-500 font-semibold">Reg</span>
                                                <div className="flex items-center gap-2">
                                                    <button className="w-5 h-5 flex items-center justify-center bg-gray-200 hover:bg-gray-300 rounded text-gray-600 transition-colors" onClick={(e) => { e.stopPropagation(); updateCardQuantity(card.id, -1, false); }}><i className="fa-solid fa-minus text-[8px]"></i></button>
                                                    <span className="text-sm font-bold text-gray-800 w-4 text-center">{regularQty}</span>
                                                    <button className="w-5 h-5 flex items-center justify-center bg-primary text-white hover:bg-primary/90 rounded transition-colors" onClick={(e) => { e.stopPropagation(); updateCardQuantity(card.id, 1, false); }}><i className="fa-solid fa-plus text-[8px]"></i></button>
                                                </div>
                                            </div>
                                            <div className="flex items-center justify-between bg-orange-50/50 rounded px-2 py-1">
                                                <span className="text-xs text-orange-600 font-semibold flex items-center gap-1"><i className="fa-solid fa-star text-[8px]"></i> Foil</span>
                                                <div className="flex items-center gap-2">
                                                    <button className="w-5 h-5 flex items-center justify-center bg-white border border-orange-200 hover:bg-orange-100 rounded text-orange-600 transition-colors" onClick={(e) => { e.stopPropagation(); updateCardQuantity(card.id, -1, true); }}><i className="fa-solid fa-minus text-[8px]"></i></button>
                                                    <span className="text-sm font-bold text-orange-700 w-4 text-center">{foilQty}</span>
                                                    <button className="w-5 h-5 flex items-center justify-center bg-orange-500 text-white hover:bg-orange-600 rounded transition-colors" onClick={(e) => { e.stopPropagation(); updateCardQuantity(card.id, 1, true); }}><i className="fa-solid fa-plus text-[8px]"></i></button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {paginatedCards.length === 0 && (
                    <div className="text-center py-20 text-gray-400">
                        <i className="fa-solid fa-ghost text-4xl mb-4"></i>
                        <p>No cards found matching your filters.</p>
                    </div>
                )}

                {totalPages > 1 && <PaginationControls />}

                {selectedCard && (
                    <CardModal 
                        card={selectedCard} 
                        onClose={() => setSelectedCard(null)} 
                        onNext={handleNextCard}
                        onPrev={handlePrevCard}
                    />
                )}

                {isImportModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
                        <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
                            <div className="p-6 border-b border-gray-200 flex justify-between items-center">
                                <h2 className="text-2xl font-bold text-gray-800"><i className="fa-solid fa-file-import mr-2 text-primary"></i> Import Collection</h2>
                                <button onClick={() => { setIsImportModalOpen(false); setImportStatus(null); }} className="text-gray-400 hover:text-gray-600 transition-colors"><i className="fa-solid fa-xmark text-xl"></i></button>
                            </div>
                            <div className="p-6 flex-1 overflow-y-auto">
                                <p className="text-sm text-gray-600 mb-4">
                                    Paste your card list below to add them to your collection. <br/>
                                    <strong>Format:</strong> <code>Qty Name (SET) # *F*</code> <br/>
                                    <em>Example:</em> <code>4 Lightning Bolt (MM2) 122 *F*</code>
                                </p>
                                <textarea className="w-full h-64 p-4 rounded-xl border border-gray-200 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none bg-gray-50" placeholder={`1 Black Lotus (LEA) 232\n4 Lightning Bolt (MM2) 122 *F*`} value={importText} onChange={(e) => setImportText(e.target.value)} />
                                {importStatus && (
                                    <div className="mt-4 p-3 bg-green-50 text-green-700 rounded-lg border border-green-200 text-sm font-bold flex items-center gap-2"><i className="fa-solid fa-check-circle"></i> Successfully imported {importStatus.success} of {importStatus.total} cards.</div>
                                )}
                            </div>
                            <div className="p-6 bg-gray-50 border-t border-gray-200 flex justify-end gap-3">
                                <button onClick={() => { setIsImportModalOpen(false); setImportStatus(null); }} className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg transition-colors font-medium">Cancel</button>
                                <button onClick={handleProcessImport} disabled={!importText.trim()} className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-bold shadow-md disabled:opacity-50 disabled:cursor-not-allowed">Import Cards</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    </div>
  );
};
