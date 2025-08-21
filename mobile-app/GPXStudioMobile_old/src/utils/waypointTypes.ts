export interface WaypointStyle {
    emoji: string;
    color: string;
    description: string;
}

// Standard GPX symbols mapping
export const GPX_SYMBOL_MAPPING: Record<string, WaypointStyle> = {
    // Water sources
    'Drinking Water': { emoji: '🚰', color: '#0066CC', description: 'Acqua potabile' },
    'Water Source': { emoji: '💧', color: '#0088FF', description: "Sorgente d'acqua" },
    Spring: { emoji: '⛲', color: '#00AAFF', description: 'Fontana/Sorgente' },

    // Accommodations
    Lodging: { emoji: '🏨', color: '#8B4513', description: 'Alloggio' },
    Campground: { emoji: '🏕️', color: '#228B22', description: 'Campeggio' },
    'RV Park': { emoji: '🚐', color: '#696969', description: 'Area camper' },

    // Food & Drink
    Restaurant: { emoji: '🍽️', color: '#FF4500', description: 'Ristorante' },
    Bar: { emoji: '🍺', color: '#DAA520', description: 'Bar' },
    'Grocery Store': { emoji: '🛒', color: '#32CD32', description: 'Alimentari' },

    // Transportation
    'Gas Station': { emoji: '⛽', color: '#FF6347', description: 'Distributore' },
    'Parking Area': { emoji: '🅿️', color: '#4169E1', description: 'Parcheggio' },
    Trailhead: { emoji: '🥾', color: '#8B4513', description: 'Inizio sentiero' },

    // Points of Interest
    Summit: { emoji: '⛰️', color: '#8B7355', description: 'Vetta' },
    'Scenic Area': { emoji: '🌅', color: '#FF69B4', description: 'Punto panoramico' },
    Building: { emoji: '🏛️', color: '#A9A9A9', description: 'Edificio' },
    Church: { emoji: '⛪', color: '#8B4513', description: 'Chiesa' },
    Bridge: { emoji: '🌉', color: '#696969', description: 'Ponte' },

    // Navigation
    Waypoint: { emoji: '📍', color: '#FF0000', description: 'Punto di passaggio' },
    Flag: { emoji: '🏁', color: '#000000', description: 'Bandiera' },
    Pin: { emoji: '📌', color: '#DC143C', description: 'Segnaposto' },

    // Emergency & Safety
    'Medical Facility': { emoji: '🏥', color: '#FF0000', description: 'Struttura medica' },
    Information: { emoji: 'ℹ️', color: '#4169E1', description: 'Informazioni' },
    Danger: { emoji: '⚠️', color: '#FF4500', description: 'Pericolo' },
};

// Type-based mapping (fallback quando non c'è simbolo specifico)
export const TYPE_MAPPING: Record<string, WaypointStyle> = {
    // Italian types
    acqua: { emoji: '💧', color: '#0088FF', description: 'Acqua' },
    fontana: { emoji: '⛲', color: '#00AAFF', description: 'Fontana' },
    rifugio: { emoji: '🏠', color: '#8B4513', description: 'Rifugio' },
    vetta: { emoji: '⛰️', color: '#8B7355', description: 'Vetta' },
    passo: { emoji: '🏔️', color: '#A0522D', description: 'Passo' },
    bivacco: { emoji: '🏕️', color: '#228B22', description: 'Bivacco' },
    chiesa: { emoji: '⛪', color: '#8B4513', description: 'Chiesa' },
    paese: { emoji: '🏘️', color: '#CD853F', description: 'Paese' },
    panorama: { emoji: '🌅', color: '#FF69B4', description: 'Punto panoramico' },
    ponte: { emoji: '🌉', color: '#696969', description: 'Ponte' },

    // English types
    water: { emoji: '💧', color: '#0088FF', description: 'Acqua' },
    summit: { emoji: '⛰️', color: '#8B7355', description: 'Vetta' },
    pass: { emoji: '🏔️', color: '#A0522D', description: 'Passo' },
    hut: { emoji: '🏠', color: '#8B4513', description: 'Rifugio' },
    viewpoint: { emoji: '🌅', color: '#FF69B4', description: 'Punto panoramico' },
    village: { emoji: '🏘️', color: '#CD853F', description: 'Paese' },
    parking: { emoji: '🅿️', color: '#4169E1', description: 'Parcheggio' },
    restaurant: { emoji: '🍽️', color: '#FF4500', description: 'Ristorante' },
    hotel: { emoji: '🏨', color: '#8B4513', description: 'Hotel' },
    camp: { emoji: '🏕️', color: '#228B22', description: 'Campeggio' },
};

// Default style for unknown types
export const DEFAULT_WAYPOINT_STYLE: WaypointStyle = {
    emoji: '📍',
    color: '#FF0000',
    description: 'Waypoint generico',
};

/**
 * Determina lo stile del waypoint basato su simbolo e tipo
 */
export function getWaypointStyle(symbol?: string, type?: string, name?: string): WaypointStyle {
    // Priority 1: Check GPX symbol
    if (symbol && GPX_SYMBOL_MAPPING[symbol]) {
        return GPX_SYMBOL_MAPPING[symbol];
    }

    // Priority 2: Check type field
    if (type) {
        const normalizedType = type.toLowerCase().trim();
        if (TYPE_MAPPING[normalizedType]) {
            return TYPE_MAPPING[normalizedType];
        }
    }

    // Priority 3: Check name for keywords (case insensitive)
    if (name) {
        const normalizedName = name.toLowerCase();

        // Check for water-related keywords
        if (
            normalizedName.includes('acqua') ||
            normalizedName.includes('fontana') ||
            normalizedName.includes('water') ||
            normalizedName.includes('spring')
        ) {
            return TYPE_MAPPING['acqua'];
        }

        // Check for summit keywords
        if (
            normalizedName.includes('vetta') ||
            normalizedName.includes('cima') ||
            normalizedName.includes('summit') ||
            normalizedName.includes('peak')
        ) {
            return TYPE_MAPPING['vetta'];
        }

        // Check for hut/shelter keywords
        if (
            normalizedName.includes('rifugio') ||
            normalizedName.includes('hut') ||
            normalizedName.includes('shelter') ||
            normalizedName.includes('bivacco')
        ) {
            return TYPE_MAPPING['rifugio'];
        }

        // Check for viewpoint keywords
        if (
            normalizedName.includes('panorama') ||
            normalizedName.includes('viewpoint') ||
            normalizedName.includes('belvedere') ||
            normalizedName.includes('vista')
        ) {
            return TYPE_MAPPING['panorama'];
        }
    }

    // Default fallback
    return DEFAULT_WAYPOINT_STYLE;
}

/**
 * Ottiene una lista di tutti i tipi disponibili per il UI picker
 */
export function getAvailableWaypointTypes(): Array<{ key: string; style: WaypointStyle }> {
    const allTypes = new Set([...Object.keys(GPX_SYMBOL_MAPPING), ...Object.keys(TYPE_MAPPING)]);

    return Array.from(allTypes)
        .map((key) => ({
            key,
            style: GPX_SYMBOL_MAPPING[key] || TYPE_MAPPING[key] || DEFAULT_WAYPOINT_STYLE,
        }))
        .sort((a, b) => a.style.description.localeCompare(b.style.description));
}
