
import { Card, Deck } from '../types';
import { BEGINNER_DECKS, DECK_SUMMARIES } from '../constants';

export const fetchAllCards = async (setList: {code: string}[]): Promise<Card[]> => {
  let allCards: Card[] = [];
  
  if (!setList || setList.length === 0) return [];

  // Construct a Scryfall query: (set:tla OR set:ptla OR ...)
  const query = `(${setList.map(s => `set:${s.code}`).join(' OR ')})`;
  
  try {
      let hasMore = true;
      // unique=prints ensures we get every printing, not just the oracle representative
      let url = `https://api.scryfall.com/cards/search?q=${encodeURIComponent(query)}&unique=prints`;

      console.log(`Fetching from Scryfall: ${query}`);

      while (hasMore) {
        const response = await fetch(url);
        
        if (!response.ok) {
            console.error(`Scryfall API Error: ${response.status} ${response.statusText}`);
            break;
        }
        
        const json = await response.json();
        
        if (json.data && Array.isArray(json.data)) {
            const newCards = json.data.map((card: any) => ({
                ...card,
                set: card.set?.toLowerCase(), // Ensure lowercase for UI filtering compatibility
                legalities: card.legalities
            }));
            allCards = [...allCards, ...newCards];
        }
        
        if (json.has_more && json.next_page) {
            url = json.next_page;
            // Scryfall requests a delay between requests (approx 100ms) to be a good citizen
            await new Promise(r => setTimeout(r, 100)); 
        } else {
            hasMore = false;
        }
      }
  } catch (e) {
      console.error("Critical error fetching from Scryfall API", e);
  }

  return allCards;
};

export const fetchDecks = async (isJumpstartAvailable: boolean): Promise<Deck[]> => {
    if (!isJumpstartAvailable) return [];

    try {
        const response = await fetch('jscomplete.json');
        if (response.ok) {
            const rawData = await response.json();
            
            // Process flat list into Deck objects
            const decksMap: Record<string, Deck> = {};

            rawData.forEach((row: any) => {
                const deckName = row.deck_name;
                
                if (!decksMap[deckName]) {
                    decksMap[deckName] = {
                        title: deckName,
                        source: row.deck_source || 'Jumpstart Boosters',
                        cards: [],
                        ...DECK_SUMMARIES[deckName] // Hydrate with static summaries if available
                    };
                }

                const deck = decksMap[deckName];
                
                // Check if card already exists in this deck to increment qty
                const existingCard = deck.cards.find(c => 
                    c.name === row.card_title && 
                    c.set === row.card_set_code && 
                    c.collectorNumber === row.card_collector_number
                );

                if (existingCard) {
                    existingCard.qty++;
                } else {
                    deck.cards.push({
                        name: row.card_title,
                        qty: 1,
                        set: row.card_set_code,
                        collectorNumber: row.card_collector_number
                    });
                }
            });

            // Convert map to array and sort alphabetically
            return Object.values(decksMap).sort((a, b) => a.title.localeCompare(b.title));
        }
    } catch (e) {
        console.warn("jscomplete.json not found or invalid. Falling back to hardcoded defaults.", e);
    }

    // Fallback if fetch fails
    return [...BEGINNER_DECKS];
};

export const fetchLivePrice = async (scryfallId: string) => {
    try {
        const response = await fetch(`https://api.scryfall.com/cards/${scryfallId}`);
        if (!response.ok) return null;
        const data = await response.json();
        return data.prices;
    } catch (e) {
        return null;
    }
}
