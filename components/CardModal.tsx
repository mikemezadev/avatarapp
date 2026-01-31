
import React, { useEffect, useState, useMemo } from 'react';
import { Card, Deck, DeckCardEntry } from '../types';
import { useCollection, DEFAULT_FILTERS } from './CollectionContext';
import { ManaCost } from './ManaCost';
import { fetchLivePrice } from '../services/dataService';

interface CardModalProps {
  card: Card;
  onClose: () => void;
  variant?: 'library' | 'deck';
  deck?: Deck;
  onNext?: () => void;
  onPrev?: () => void;
  // Deck Builder Specific Props
  onSetCommander?: () => void;
  onSetCover?: () => void;
  isCommander?: boolean;
  isCover?: boolean;
}

const ScryfallIcon = ({ className }: { className?: string }) => (
    <svg viewBox="0 0 460 460" className={className} xmlns="http://www.w3.org/2000/svg">
        <g transform="translate(-60 -58)" fill="none" fillRule="evenodd">
            <circle fill="#000" opacity=".09" cx="290" cy="288" r="230"></circle>
            <path fill="#BC979D" d="M279.508 112.547l-.028 361.84 43.137 6.808 56.715-13.23 28.54-72.547-28.044-178.926-31.887-113.004"></path>
            <path fill="#AE7F9C" d="M281.57 100.633l-2.457 383.13-67.972-21.888 13.9-355.852"></path>
            <path d="M207.05 113.316v344.032S87.364 394.5 93.388 283.043C99.41 171.586 207.05 113.316 207.05 113.316z" fill="#786076"></path>
            <path d="M237.375 107.21l-30.603 4.35s-20.682 10.42-37.922 25.5c-75.19 167.948 108.332 115.1-12.725 286.69 50.647 47.86 72.293 41.137 72.293 41.137l8.957-357.676z" fill="#947A92"></path>
            <path d="M343.058 89.985c-109.36-29.303-221.77 35.597-251.073 144.957-29.303 109.36 35.597 221.77 144.957 251.073 109.36 29.303 221.77-35.597 251.073-144.957 29.303-109.36-35.597-221.77-144.957-251.073zM256.342 451.95l.276.71c1.172 3.187 3.562 5.776 6.644 7.2 3.082 1.422 6.603 1.562 9.788.387l48.355-17.774c3.184-1.175 6.706-1.035 9.787.388 3.082 1.424 5.472 4.013 6.644 7.2l.19.56c2.105 5.852-.304 12.37-5.71 15.448-93.23 22.17-187.912-30.724-217.912-121.736s14.67-189.84 102.81-227.453c5.144.502 9.544 3.91 11.32 8.762 2.578 6.977 10.317 10.55 17.3 7.99l15.73-5.803c3.186-1.176 6.707-1.036 9.79.387 3.08 1.423 5.47 4.012 6.643 7.198l.19.56c1.174 3.185 1.034 6.706-.39 9.788-1.422 3.082-4.01 5.472-7.197 6.644l-109.46 40.366c-3.187 1.172-5.777 3.562-7.2 6.644-1.422 3.082-1.562 6.603-.388 9.788l.19.56c1.172 3.186 3.562 5.775 6.643 7.198 3.082 1.423 6.603 1.563 9.788.388l80.06-29.483c3.184-1.174 6.705-1.034 9.787.388 3.082 1.423 5.472 4.013 6.644 7.2l.19.56c1.173 3.184 1.034 6.705-.39 9.787-1.422 3.08-4.01 5.47-7.197 6.643l-127.814 47.08c-3.186 1.17-5.776 3.56-7.2 6.643-1.42 3.082-1.56 6.603-.387 9.788l.19.56c1.172 3.186 3.562 5.775 6.643 7.198 3.08 1.423 6.602 1.563 9.787.388L297.72 226.4c3.184-1.175 6.705-1.036 9.787.387 3.082 1.423 5.472 4.012 6.644 7.198l.467 1.27c1.174 3.186 1.035 6.707-.388 9.79-1.424 3.08-4.014 5.47-7.2 6.643l-113 41.54c-3.187 1.172-5.777 3.562-7.2 6.644-1.422 3.08-1.562 6.603-.387 9.787l.19.56c1.17 3.185 3.56 5.775 6.643 7.198 3.08 1.423 6.603 1.562 9.787.388l51.798-19.06c3.186-1.174 6.707-1.034 9.79.39 3.08 1.422 5.47 4.01 6.643 7.197l.19.56c1.174 3.185 1.034 6.706-.39 9.788-1.422 3.083-4.01 5.473-7.197 6.644l-89.085 32.754c-3.185 1.17-5.774 3.56-7.197 6.643-1.423 3.083-1.562 6.604-.388 9.79l.19.56c1.17 3.185 3.56 5.775 6.643 7.197 3.082 1.423 6.603 1.563 9.788.388L304.563 336.3c3.185-1.173 6.706-1.034 9.788.39 3.083 1.422 5.473 4.01 6.644 7.197l.19.56c1.174 3.185 1.035 6.706-.388 9.788s-4.013 5.472-7.198 6.644l-74.954 27.54c-3.186 1.17-5.776 3.56-7.2 6.643-1.422 3.082-1.56 6.603-.387 9.788l.19.56c1.172 3.187 3.562 5.777 6.643 7.2 3.082 1.422 6.603 1.562 9.788.387l94.147-34.537c3.185-1.175 6.706-1.035 9.788.388s5.472 4.012 6.644 7.198c2.428 6.58-.893 13.887-7.447 16.384l-86.903 33.168c-3.18 1.18-5.764 3.574-7.18 6.658-1.414 3.083-1.547 6.603-.367 9.784l-.018-.09z" fill="#FFF"></path>
        </g>
    </svg>
);

export const CardModal: React.FC<CardModalProps> = ({ 
  card: initialCard, 
  onClose, 
  variant = 'library',
  deck: propDeck,
  onNext,
  onPrev,
  onSetCommander,
  onSetCover,
  isCommander,
  isCover
}) => {
  const { collection, updateCardQuantity, decks, setFocusedDeck, setActiveView, cards, setLibraryFilters } = useCollection();
  
  // State for navigation within the modal (Front Card -> Deck Card)
  // Also used when clicking a specific variant in the sidebar
  const [subCard, setSubCard] = useState<Card | null>(null);
  const [copied, setCopied] = useState(false);
  
  // The card currently being displayed (either the prop card or the drilled-down subCard)
  const activeDisplayCard = subCard || initialCard;

  const [livePrices, setLivePrices] = useState(activeDisplayCard.prices);
  
  const regularQty = collection.cards[activeDisplayCard.id] || 0;
  const foilQty = collection.foilCards[activeDisplayCard.id] || 0;
  const totalQty = regularQty + foilQty;

  const [activeFaceIndex, setActiveFaceIndex] = useState(0);

  // Find all decks associated with this card (if it's a front card)
  const associatedDecks = useMemo(() => {
      // If a specific deck was passed, use it exclusively
      if (propDeck) return [propDeck];

      // Only search for decks if this is a front card or we are in deck view
      const isFront = initialCard.set === 'jtla' || initialCard.set === 'ftla';
      if (!isFront && variant !== 'deck') return [];

      // Find decks where the title matches the card name or the theme card matches
      const matches = decks.filter(d => {
          // Ensure deck source matches the card set
          if (initialCard.set === 'jtla' && d.source !== 'Jumpstart Boosters') return false;
          if (initialCard.set === 'ftla' && d.source !== 'Beginner Box') return false;

          if (d.themeCard === initialCard.name) return true;
          
          // Match "Adept (0011) - Variation 1" against "Adept"
          const titleBase = d.title.split(' (')[0].trim();
          return titleBase.toLowerCase() === initialCard.name.toLowerCase();
      });

      // Sort by title (numeric aware to handle Variation 1, 2, etc.)
      return matches.sort((a, b) => a.title.localeCompare(b.title, undefined, { numeric: true }));
  }, [decks, initialCard, propDeck, variant]);

  const [activeDeckIndex, setActiveDeckIndex] = useState(0);
  const activeDeck = associatedDecks[activeDeckIndex] || null;

  // Reset active deck index when the card changes
  useEffect(() => {
    setActiveDeckIndex(0);
  }, [initialCard.id]);

  // Determine if we are in the special "Front Card View" (Deck List View)
  const isDeckView = variant === 'deck';
  const isFrontCardView = !subCard && (isDeckView || associatedDecks.length > 0);

  // Find other prints of this card
  const cardVariants = useMemo(() => {
      // Find cards with the same name, excluding the current one
      const variants = cards.filter(c => 
          c.name === activeDisplayCard.name && 
          c.id !== activeDisplayCard.id
      );
      
      // Sort by set, then number
      return variants.sort((a, b) => {
          if (a.set !== b.set) return a.set.localeCompare(b.set);
          return a.collector_number.localeCompare(b.collector_number, undefined, { numeric: true });
      });
  }, [cards, activeDisplayCard]);

  useEffect(() => {
    // Reset face index when card changes
    setActiveFaceIndex(0);
    
    // Fetch live price when the active card changes
    fetchLivePrice(activeDisplayCard.id).then(prices => {
      if (prices) setLivePrices(prices);
    });
    
    // Lock body scroll
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = 'unset'; };
  }, [activeDisplayCard.id]);

  const hasFaces = activeDisplayCard.card_faces && activeDisplayCard.card_faces.length > 0;
  const activeFace = hasFaces ? activeDisplayCard.card_faces![activeFaceIndex] : activeDisplayCard;
  
  // Resolve image URL
  let imageUrl = 'https://via.placeholder.com/250x350?text=No+Image';
  if (hasFaces) {
      if (activeDisplayCard.card_faces![activeFaceIndex].image_uris?.large) imageUrl = activeDisplayCard.card_faces![activeFaceIndex].image_uris!.large;
      else if (activeDisplayCard.card_faces![activeFaceIndex].image_uris?.normal) imageUrl = activeDisplayCard.card_faces![activeFaceIndex].image_uris!.normal;
  } else {
      if (activeDisplayCard.image_uris?.large) imageUrl = activeDisplayCard.image_uris.large;
      else if (activeDisplayCard.image_uris?.normal) imageUrl = activeDisplayCard.image_uris.normal;
  }

  // Format legalities
  const formats = ['standard', 'pioneer', 'modern', 'legacy', 'vintage', 'commander', 'pauper'];

  // Handle deck navigation (Jumpstart View)
  const handleGoToDeck = (targetDeck: Deck) => {
    if (targetDeck) {
        setFocusedDeck(targetDeck.title);
        setActiveView('jumpstart');
        onClose();
    }
  };

  // Handle showing all variants in library
  const handleShowAllVariants = () => {
      // Set filters to search for this card name specifically
      setLibraryFilters({
          ...DEFAULT_FILTERS,
          search: activeDisplayCard.name
      });
      setActiveView('library');
      onClose();
  };

  // Handle clicking a card in the list
  const handleListCardClick = (entry: DeckCardEntry) => {
      // Try to find the card in the global card list
      const found = cards.find(c => {
          if (entry.set && entry.collectorNumber) {
              return c.set === entry.set.toLowerCase() && c.collector_number === entry.collectorNumber;
          }
          return c.name === entry.name;
      });

      if (found) {
          setSubCard(found);
      }
  };

  const handleCopyDeckList = () => {
    if (!activeDeck) return;
    
    // Format: 1 Card Name (SET) CN
    const listText = activeDeck.cards.map(c => {
        const setCode = c.set ? ` (${c.set.toUpperCase()})` : '';
        const cn = c.collectorNumber ? ` ${c.collectorNumber}` : '';
        return `${c.qty} ${c.name}${setCode}${cn}`;
    }).join('\n');

    navigator.clipboard.writeText(listText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Construct TCGPlayer Link
  const tcgLink = activeDisplayCard.purchase_uris?.tcgplayer || 
    `https://www.tcgplayer.com/search/magic/product?productLineName=magic&q=${encodeURIComponent(activeDisplayCard.name)}`;

  // Determine Title to display
  let title = activeFace.name || activeDisplayCard.name;
  if (isDeckView && isFrontCardView && activeDeck && !subCard) {
       // Clean title for display (remove "(XX)" suffix)
       title = activeDeck.title.replace(/\s*\(\d+\)\s*$/, '').trim();
  }

  // Render the standard details view (Type, Mana, Text, P/T)
  const renderCardDetails = () => (
    <>
        <div className="mb-6 flex items-center gap-2 flex-wrap">
            <ManaCost manaCost={activeFace.mana_cost} />
            <span className="text-gray-500 text-sm">({activeDisplayCard.cmc || 0})</span>
            <span className="mx-2 text-gray-300">|</span>
            <span className="font-medium text-gray-700">{activeFace.type_line}</span>
        </div>

        <div className="prose prose-sm text-gray-700 mb-6 bg-gray-50 p-4 rounded-lg border border-gray-100">
            {activeFace.oracle_text?.split('\n').map((line, i) => (
                <p key={i} className="mb-2 last:mb-0">{line}</p>
            ))}
            {activeFace.flavor_text && (
                <p className="italic text-gray-500 mt-4 border-l-2 border-primary pl-3">{activeFace.flavor_text}</p>
            )}
        </div>

        <div className="space-y-6">
            {/* Stats & Price */}
            <div className="grid grid-cols-2 gap-4">
                {activeFace.power && activeFace.toughness && (
                    <div className="bg-orange-50 p-3 rounded-lg border border-orange-100 text-center">
                        <span className="block text-xs text-orange-600 uppercase font-bold">P / T</span>
                        <span className="text-xl font-bold text-gray-900">{activeFace.power} / {activeFace.toughness}</span>
                    </div>
                )}
            </div>

            {/* Legality */}
            {activeDisplayCard.legalities && (
            <div>
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Format Legality</h4>
                <div className="flex flex-wrap gap-2">
                {formats.map(fmt => {
                    const status = activeDisplayCard.legalities?.[fmt];
                    if (!status) return null;
                    
                    let badgeClass = 'bg-gray-100 text-gray-500';
                    if (status === 'legal') badgeClass = 'bg-green-100 text-green-700 border-green-200';
                    else if (status === 'not_legal') badgeClass = 'bg-gray-100 text-gray-400 border-gray-200';
                    else if (status === 'banned') badgeClass = 'bg-red-100 text-red-700 border-red-200';
                    else if (status === 'restricted') badgeClass = 'bg-yellow-100 text-yellow-700 border-yellow-200';

                    return (
                    <span key={fmt} className={`px-2 py-1 rounded text-[10px] uppercase font-bold border ${badgeClass}`}>
                        {fmt}
                    </span>
                    );
                })}
                </div>
            </div>
            )}

            {/* Scryfall Button */}
            {activeDisplayCard.scryfall_uri && (
                <div className="pt-2">
                    <a 
                        href={activeDisplayCard.scryfall_uri} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center justify-center px-4 py-3 rounded-lg text-sm uppercase font-bold border bg-purple-100 text-purple-700 border-purple-200 hover:bg-purple-200 transition-colors shadow-sm"
                    >
                        <ScryfallIcon className="w-5 h-5 mr-2" />
                        View on Scryfall
                    </a>
                </div>
            )}

            {/* Variants / Prints Section */}
            {cardVariants.length > 0 && (
                <div className="pt-4 border-t border-gray-200">
                    <div className="flex justify-between items-center mb-3">
                        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Prints & Variants</h4>
                        <button 
                            onClick={handleShowAllVariants}
                            className="text-xs text-primary font-bold hover:underline flex items-center gap-1"
                        >
                             View All <i className="fa-solid fa-arrow-right"></i>
                        </button>
                    </div>
                    <div className="space-y-2">
                        {cardVariants.slice(0, 3).map(variant => (
                            <div 
                                key={variant.id}
                                onClick={() => setSubCard(variant)}
                                className="flex items-center justify-between p-2 rounded border border-gray-200 hover:border-primary/50 hover:bg-gray-50 cursor-pointer transition-colors group"
                            >
                                <div className="flex items-center gap-3">
                                    <span className="text-xs font-mono font-bold text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded group-hover:bg-white group-hover:text-primary transition-colors">
                                        {variant.set.toUpperCase()} #{variant.collector_number}
                                    </span>
                                    <span className="text-xs text-gray-700 font-medium truncate max-w-[150px]">
                                        {variant.set_name}
                                    </span>
                                </div>
                                <div className="text-xs text-green-600 font-bold">
                                    {variant.prices?.usd ? `$${variant.prices.usd}` : (variant.prices?.usd_foil ? `$${variant.prices.usd_foil} *` : '-')}
                                </div>
                            </div>
                        ))}
                        {cardVariants.length > 3 && (
                             <button 
                                onClick={handleShowAllVariants}
                                className="w-full text-center text-xs text-gray-400 hover:text-gray-600 py-1"
                             >
                                 + {cardVariants.length - 3} more variants
                             </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    </>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={onClose}>
      <div 
        className="bg-white rounded-xl max-w-4xl w-full max-h-[95vh] overflow-hidden flex flex-col md:flex-row shadow-2xl animate-in fade-in zoom-in duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Left Column: Image & Deck Info */}
        <div className="md:w-5/12 bg-gray-100 p-6 flex flex-col items-center overflow-y-auto custom-scrollbar border-r border-gray-200">
          <img src={imageUrl} alt={activeDisplayCard.name} className="rounded-lg shadow-xl w-full object-contain mb-6" />
          
          {hasFaces && (
            <button 
                onClick={() => setActiveFaceIndex(i => i === 0 ? 1 : 0)}
                className="mb-6 px-4 py-2 bg-white text-gray-800 rounded-full shadow-md border border-gray-200 font-medium hover:bg-gray-50 flex items-center gap-2 text-xs"
            >
                <i className="fa-solid fa-arrows-rotate"></i> Flip Card
            </button>
          )}

          {/* Deck Builder Options (Only in Deck Builder context) */}
          {(onSetCommander || onSetCover) && (
              <div className="w-full bg-white p-4 rounded-xl border border-purple-200 shadow-sm mb-4">
                  <h4 className="text-xs font-bold text-purple-800 uppercase tracking-wide mb-3 flex items-center gap-2">
                      <i className="fa-solid fa-sliders"></i> Deck Options
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                      {onSetCommander && (
                          <button 
                              onClick={onSetCommander}
                              className={`flex flex-col items-center justify-center gap-1 p-2 rounded-lg border transition-all ${isCommander ? 'bg-purple-600 text-white border-purple-600' : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-purple-300 hover:bg-purple-50'}`}
                          >
                              <i className="fa-solid fa-crown text-lg"></i>
                              <span className="text-[10px] font-bold uppercase">{isCommander ? 'Is Commander' : 'Commander'}</span>
                          </button>
                      )}
                      {onSetCover && (
                          <button 
                              onClick={onSetCover}
                              className={`flex flex-col items-center justify-center gap-1 p-2 rounded-lg border transition-all ${isCover ? 'bg-blue-600 text-white border-blue-600' : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-blue-300 hover:bg-blue-50'}`}
                          >
                              <i className="fa-solid fa-image text-lg"></i>
                              <span className="text-[10px] font-bold uppercase">{isCover ? 'Is Cover' : 'Set Cover'}</span>
                          </button>
                      )}
                  </div>
              </div>
          )}

           {/* Collection Management (Shown only when NOT in Deck View OR when drilling down) */}
           {(!isDeckView || subCard) && (
               <div className="w-full space-y-4">
                <div className="w-full bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                        <div className="flex justify-between items-center mb-4">
                            <span className="font-semibold text-gray-700 text-sm">In Collection</span>
                            <div className="flex gap-4">
                                <div className="flex flex-col items-center">
                                    <span className="text-[10px] text-gray-400 uppercase font-bold">Total</span>
                                    <span className="text-xl font-bold text-primary">{totalQty}</span>
                                </div>
                            </div>
                        </div>
                        
                        {/* Regular Controls */}
                        <div className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg p-2 mb-2">
                            <span className="text-xs font-medium text-gray-700 ml-1">Reg</span>
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-bold text-gray-800 w-4 text-center">{regularQty}</span>
                                <div className="flex gap-1">
                                    <button 
                                        onClick={() => updateCardQuantity(activeDisplayCard.id, -1, false)}
                                        className="w-6 h-6 flex items-center justify-center bg-gray-200 hover:bg-gray-300 rounded text-gray-600 transition-colors"
                                    >
                                        <i className="fa-solid fa-minus text-[10px]"></i>
                                    </button>
                                    <button 
                                        onClick={() => updateCardQuantity(activeDisplayCard.id, 1, false)}
                                        className="w-6 h-6 flex items-center justify-center bg-primary text-white hover:bg-primary/90 rounded transition-colors"
                                    >
                                        <i className="fa-solid fa-plus text-[10px]"></i>
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Foil Controls */}
                        <div className="flex items-center justify-between bg-orange-50 border border-orange-200 rounded-lg p-2">
                            <span className="text-xs font-medium text-orange-800 ml-1 flex items-center gap-1">
                                <i className="fa-solid fa-star text-orange-500 text-[10px]"></i> Foil
                            </span>
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-bold text-orange-700 w-4 text-center">{foilQty}</span>
                                <div className="flex gap-1">
                                    <button 
                                        onClick={() => updateCardQuantity(activeDisplayCard.id, -1, true)}
                                        className="w-6 h-6 flex items-center justify-center bg-white border border-orange-200 hover:bg-orange-100 rounded text-orange-600 transition-colors"
                                    >
                                        <i className="fa-solid fa-minus text-[10px]"></i>
                                    </button>
                                    <button 
                                        onClick={() => updateCardQuantity(activeDisplayCard.id, 1, true)}
                                        className="w-6 h-6 flex items-center justify-center bg-orange-500 text-white hover:bg-orange-600 rounded transition-colors"
                                    >
                                        <i className="fa-solid fa-plus text-[10px]"></i>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Price Information */}
                    <div className="w-full bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs text-green-600 uppercase font-bold">Prices</span>
                            <a href={tcgLink} target="_blank" rel="noopener noreferrer" className="text-[10px] text-green-700 hover:underline flex items-center gap-1">
                                <i className="fa-solid fa-external-link-alt"></i> TCG
                            </a>
                        </div>
                        <div className="flex justify-between items-center gap-4">
                            <div className="text-center flex-1">
                                <span className="block text-[10px] text-gray-500 uppercase">Reg</span>
                                <span className="text-sm font-bold text-green-700">
                                    {livePrices?.usd ? `$${livePrices.usd}` : 'N/A'}
                                </span>
                            </div>
                            <div className="w-px h-6 bg-gray-200"></div>
                            <div className="text-center flex-1">
                                <span className="block text-[10px] text-orange-500 uppercase flex items-center justify-center gap-1"><i className="fa-solid fa-star text-[8px]"></i> Foil</span>
                                <span className="text-sm font-bold text-orange-600">
                                    {livePrices?.usd_foil ? `$${livePrices.usd_foil}` : 'N/A'}
                                </span>
                            </div>
                        </div>
                    </div>
               </div>
           )}

          {/* Deck Strategy / Summary / Stats (Only in Deck View and NOT viewing subcard) */}
          {isDeckView && isFrontCardView && activeDeck && !subCard && (
               <div className="w-full space-y-4">
                   {/* Summary Box */}
                   {activeDeck.summary && (
                       <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm relative">
                            <i className="fa-solid fa-quote-left absolute top-3 left-3 text-gray-200 text-2xl"></i>
                            <p className="text-sm text-gray-600 italic text-center relative z-10 px-2 leading-relaxed">
                                {activeDeck.summary}
                            </p>
                       </div>
                   )}

                   {/* Strategy & Stats */}
                    <div className="bg-blue-50/50 border border-blue-100 rounded-lg p-4 space-y-3">
                         {activeDeck.strategy && (
                             <div>
                                 <h4 className="text-xs font-bold text-blue-800 uppercase tracking-wide mb-1">Strategy</h4>
                                 <p className="text-sm text-gray-700">{activeDeck.strategy}</p>
                             </div>
                         )}
                         <div className="grid grid-cols-1 gap-3 pt-2">
                             {activeDeck.strengths && (
                                 <div className="bg-green-50 p-2 rounded border border-green-100">
                                     <h4 className="text-[10px] font-bold text-green-800 uppercase mb-1">Strengths</h4>
                                     <p className="text-xs text-green-900">{activeDeck.strengths}</p>
                                 </div>
                             )}
                             {activeDeck.weaknesses && (
                                 <div className="bg-red-50 p-2 rounded border border-red-100">
                                     <h4 className="text-[10px] font-bold text-red-800 uppercase mb-1">Weaknesses</h4>
                                     <p className="text-xs text-red-900">{activeDeck.weaknesses}</p>
                                 </div>
                             )}
                         </div>

                         {/* Pairings Section - NEW */}
                         {activeDeck.pairings && activeDeck.pairings.length > 0 && (
                             <div className="pt-3 mt-1 border-t border-blue-100/50">
                                 <h4 className="text-[10px] font-bold text-blue-800 uppercase mb-1">Top Pairings</h4>
                                 <div className="flex flex-wrap gap-1">
                                     {activeDeck.pairings.map((pairing, idx) => (
                                         <span key={idx} className="text-[10px] bg-white border border-blue-100 text-blue-700 px-2 py-0.5 rounded-full shadow-sm">
                                             {pairing}
                                         </span>
                                     ))}
                                 </div>
                             </div>
                         )}
                     </div>
               </div>
           )}

           {/* For Front Cards in Library Mode: Show Summary */}
          {!isDeckView && isFrontCardView && activeDeck && activeDeck.summary && (
              <div className="mt-4 w-full">
                  <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm relative">
                       <i className="fa-solid fa-quote-left absolute top-3 left-3 text-gray-200 text-2xl"></i>
                       <p className="text-sm text-gray-600 italic text-center relative z-10 px-2 leading-relaxed">
                           {activeDeck.summary}
                       </p>
                  </div>
              </div>
          )}
        </div>

        {/* Right Column: Details & Card Grid */}
        <div className="md:w-7/12 p-8 flex flex-col bg-white overflow-y-auto">
            <div className="flex justify-between items-start mb-6">
                <div className="flex gap-3 items-start flex-1 mr-4">
                    {/* Back Button if viewing sub-card */}
                    {subCard && (
                        <button 
                            onClick={() => setSubCard(null)}
                            className="shrink-0 w-8 h-8 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 flex items-center justify-center transition-colors"
                        >
                            <i className="fa-solid fa-arrow-left"></i>
                        </button>
                    )}
                    <div className="flex-1">
                        <h2 className="text-2xl font-bold text-gray-900 mb-1 leading-tight">
                            {title}
                        </h2>
                        {!isDeckView || subCard ? (
                            <div className="flex items-center gap-3 text-sm text-gray-600">
                                <span>{activeDisplayCard.set_name}</span>
                                <span className="px-2 py-0.5 bg-gray-200 rounded text-xs uppercase font-bold tracking-wider">{activeDisplayCard.rarity}</span>
                                <span>#{activeDisplayCard.collector_number}</span>
                            </div>
                        ) : (
                            <div className="flex items-center gap-3 text-sm text-gray-500">
                                <span>{activeDeck?.source}</span>
                                <span className="text-gray-300">|</span>
                                <span>{activeDeck?.cards.reduce((sum, c) => sum + c.qty, 0)} Cards</span>
                                <span className="text-gray-300">|</span>
                                <button
                                    onClick={handleCopyDeckList}
                                    className={`text-xs px-2 py-0.5 rounded border transition-colors flex items-center gap-1 ${copied ? 'bg-green-50 border-green-200 text-green-700' : 'bg-gray-50 border-gray-200 hover:bg-gray-100 text-gray-600'}`}
                                >
                                    {copied ? <><i className="fa-solid fa-check mr-1"></i> Copied</> : <><i className="fa-regular fa-copy mr-1"></i> Copy</>}
                                    {copied ? "Copied" : "Export List"}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
                
                {/* Controls Area */}
                <div className="flex items-center gap-2">
                    {/* Navigation Buttons (Only if handlers provided and not drilling down) */}
                    {(!subCard && (onPrev || onNext)) && (
                        <div className="flex items-center bg-gray-100 rounded-lg p-0.5 mr-2">
                             <button 
                                onClick={onPrev}
                                disabled={!onPrev}
                                className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-white hover:shadow-sm text-gray-600 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:shadow-none transition-all"
                             >
                                 <i className="fa-solid fa-chevron-left"></i>
                             </button>
                             <div className="w-px h-4 bg-gray-300 mx-0.5"></div>
                             <button 
                                onClick={onNext}
                                disabled={!onNext}
                                className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-white hover:shadow-sm text-gray-600 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:shadow-none transition-all"
                             >
                                 <i className="fa-solid fa-chevron-right"></i>
                             </button>
                        </div>
                    )}

                    <button onClick={onClose} className="text-gray-400 hover:text-gray-900 transition-colors w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100">
                        <i className="fa-solid fa-xmark text-xl"></i>
                    </button>
                </div>
            </div>

            {/* Special Layout for Front Cards (Only when at root) */}
            {isFrontCardView && activeDeck && !subCard ? (
                <div className="flex-1">
                     
                     {/* Show View Deck Details button ONLY in Library Mode */}
                     {!isDeckView && (
                         <div className="mb-4">
                            {associatedDecks.length > 1 && (
                                <div className="mb-4 bg-gray-50 rounded-lg p-3 border border-gray-200">
                                    <h4 className="text-xs font-bold text-gray-500 uppercase mb-2 tracking-wide">Select Variation</h4>
                                    <div className="grid grid-cols-1 gap-2">
                                        {associatedDecks.map((d, idx) => {
                                            const isActive = idx === activeDeckIndex;
                                            // Extract variation name or just use title if not variation
                                            let label = d.title;
                                            // Heuristic: if title contains "Variation", extract it. Otherwise "Standard" or title.
                                            const varMatch = d.title.match(/Variation \d+/);
                                            if (varMatch) {
                                                label = varMatch[0]; // "Variation 1"
                                            } else if (associatedDecks.length > 1) {
                                                // Fallback if multiple decks but no "Variation" text
                                                 label = `Deck ${idx + 1}`; 
                                            }

                                            return (
                                                <div key={d.title} className={`flex items-center justify-between p-2 rounded border transition-all ${isActive ? 'bg-white border-primary/50 ring-1 ring-primary/20 shadow-sm' : 'bg-white border-gray-200 hover:bg-gray-50'}`}>
                                                    <div className="flex items-center gap-2">
                                                        <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-primary' : 'bg-gray-300'}`}></div>
                                                        <span className={`text-sm font-medium ${isActive ? 'text-gray-900' : 'text-gray-600'}`}>
                                                            {label}
                                                        </span>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={() => setActiveDeckIndex(idx)}
                                                            className={`px-3 py-1 text-xs rounded font-medium transition-colors ${isActive ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                                                        >
                                                            {isActive ? 'Showing List' : 'Show List'}
                                                        </button>
                                                        <button
                                                            onClick={() => handleGoToDeck(d)}
                                                            className="px-3 py-1 text-xs bg-secondary/10 text-secondary hover:bg-secondary/20 rounded font-medium transition-colors flex items-center gap-1"
                                                            title="Go to Jumpstart Deck Detail View"
                                                        >
                                                            View Details <i className="fa-solid fa-arrow-right text-[10px]"></i>
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Fallback Single Deck Button if only 1 deck */}
                            {associatedDecks.length === 1 && (
                                <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 mb-4">
                                    <div className="flex items-center gap-3 mb-2">
                                        <i className="fa-solid fa-layer-group text-primary text-xl"></i>
                                        <h3 className="font-bold text-lg text-primary">Associated Deck</h3>
                                    </div>
                                    <p className="text-sm text-gray-600 mb-3 font-medium">
                                        {activeDeck.title.replace(/\s*\(\d+\)\s*$/, '').trim()}
                                    </p>
                                    <button 
                                        onClick={() => handleGoToDeck(activeDeck)}
                                        className="w-full py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 text-sm font-bold shadow-sm"
                                    >
                                        View Deck Details <i className="fa-solid fa-arrow-right"></i>
                                    </button>
                                </div>
                            )}
                        </div>
                     )}

                     {/* Card List - Grid View for Deck Mode, Table for Library Mode */}
                     {isDeckView ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                {activeDeck.cards.map((entry, idx) => {
                                    const cardData = cards.find(c => {
                                        if (entry.set && entry.collectorNumber) {
                                            return c.set === entry.set.toLowerCase() && c.collector_number === entry.collectorNumber;
                                        }
                                        return c.name === entry.name;
                                    });

                                    const artUrl = cardData?.image_uris?.art_crop || cardData?.card_faces?.[0]?.image_uris?.art_crop || 'https://via.placeholder.com/250x200?text=No+Art';
                                    const detailFace = cardData?.card_faces?.[0] || cardData;
                                    const cost = detailFace?.mana_cost || cardData?.mana_cost;
                                    const typeLine = detailFace?.type_line || cardData?.type_line || '';
                                    // Shorten type line
                                    const shortType = typeLine.split('—')[0].trim(); 
                                    const pt = detailFace?.power && detailFace?.toughness ? `${detailFace.power}/${detailFace.toughness}` : null;

                                    return (
                                        <div 
                                            key={idx} 
                                            onClick={() => handleListCardClick(entry)}
                                            className="group cursor-pointer bg-white rounded-lg overflow-hidden border border-gray-200 hover:border-primary hover:shadow-lg hover:-translate-y-0.5 transition-all flex flex-col"
                                        >
                                            {/* Image Area */}
                                            <div className="relative aspect-[4/3] bg-gray-100 overflow-hidden">
                                                <img src={artUrl} alt={entry.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                                
                                                {/* Qty Badge */}
                                                {entry.qty > 1 && (
                                                    <div className="absolute top-1 right-1 bg-yellow-400 text-black text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm border border-yellow-500">
                                                        x{entry.qty}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Info Area */}
                                            <div className="p-2 flex flex-col gap-1 flex-1 bg-gray-50/30">
                                                <div className="font-bold text-gray-800 text-xs leading-tight line-clamp-2 group-hover:text-primary h-8">
                                                    {entry.name}
                                                </div>
                                                
                                                <div className="flex justify-between items-center mt-auto">
                                                    <div className="text-[10px] text-gray-500 truncate max-w-[60%]" title={typeLine}>
                                                        {shortType}
                                                    </div>
                                                    <div className="scale-90 origin-right">
                                                        <ManaCost manaCost={cost} />
                                                    </div>
                                                </div>

                                                {pt && (
                                                    <div className="flex justify-end pt-1 border-t border-gray-100 mt-1">
                                                        <span className="font-bold bg-gray-100 text-gray-700 px-1.5 rounded text-[10px] border border-gray-200">
                                                            {pt}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                        </div>
                     ) : (
                         /* Table View for Library Mode */
                         <div className="flex-1 overflow-y-auto border border-gray-200 rounded-lg bg-gray-50">
                            <table className="w-full text-sm text-left">
                                <thead className="text-xs text-gray-500 uppercase bg-gray-100 border-b border-gray-200 sticky top-0">
                                    <tr>
                                        <th className="px-4 py-2 w-20 text-center">Qty</th>
                                        <th className="px-2 py-2">Card Details</th>
                                        <th className="px-2 py-2 w-8"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {activeDeck.cards.map((entry, idx) => {
                                        const cardData = cards.find(c => {
                                            if (entry.set && entry.collectorNumber) {
                                                return c.set === entry.set.toLowerCase() && c.collector_number === entry.collectorNumber;
                                            }
                                            return c.name === entry.name;
                                        });

                                        const detailFace = cardData?.card_faces?.[0] || cardData;
                                        const cost = detailFace?.mana_cost || cardData?.mana_cost;
                                        const type = detailFace?.type_line || cardData?.type_line || 'Unknown Type';
                                        const pt = detailFace?.power && detailFace?.toughness ? `${detailFace.power}/${detailFace.toughness}` : null;

                                        return (
                                            <tr 
                                                key={idx} 
                                                onClick={() => handleListCardClick(entry)}
                                                className="hover:bg-blue-50 transition-colors cursor-pointer group"
                                            >
                                                <td className="px-4 py-3 text-center align-middle">
                                                    <span className="text-2xl font-bold text-black">{entry.qty}</span>
                                                </td>
                                                <td className="px-2 py-2 align-middle">
                                                    <div className="flex flex-col gap-1">
                                                        <div className="flex justify-between items-center">
                                                            <span className="font-bold text-gray-800 text-sm group-hover:text-primary leading-tight line-clamp-1">
                                                                {entry.name}
                                                            </span>
                                                            <div className="pl-2 shrink-0">
                                                                <ManaCost manaCost={cost} />
                                                            </div>
                                                        </div>
                                                        <div className="flex justify-between items-center text-xs text-gray-500">
                                                            <span className="truncate pr-2 max-w-[200px]" title={type}>{type}</span>
                                                            {pt && <span className="font-bold bg-gray-100 px-1.5 rounded text-gray-700 whitespace-nowrap">{pt}</span>}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-2 py-2 text-center align-middle text-gray-300 group-hover:text-primary">
                                                    <i className="fa-solid fa-chevron-right text-xs"></i>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                         </div>
                     )}
                </div>
            ) : (
                /* Standard Detail View (used for Sub-Cards AND regular library cards) */
                renderCardDetails()
            )}
        </div>
      </div>
    </div>
  );
};
