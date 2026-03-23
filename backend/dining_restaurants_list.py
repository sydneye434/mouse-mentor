"""
Top 30 Walt Disney World table-service style dining locations (slug for disneyworld.disney.go.com/dining/{slug}/).
Developed by Sydney Edwards.
"""

from __future__ import annotations

# slug must match Disney URL path segment
WDW_DINING_RESTAURANTS: list[dict[str, str]] = [
    {"name": "Cinderella's Royal Table", "slug": "cinderellas-royal-table"},
    {"name": "Be Our Guest Restaurant", "slug": "be-our-guest-restaurant"},
    {"name": "Chef Mickey's", "slug": "chef-mickeys"},
    {"name": "California Grill", "slug": "california-grill"},
    {"name": "Topolino's Terrace — Flavors of the Riviera", "slug": "topolinos-terrace-flavors-of-the-riviera"},
    {"name": "Yak & Yeti Restaurant", "slug": "yak-and-yeti-restaurant"},
    {"name": "Tusker House Restaurant", "slug": "tusker-house-restaurant"},
    {"name": "Story Book Dining at Artist Point", "slug": "story-book-dining-at-artist-point-with-snow-white"},
    {"name": "Hollywood & Vine", "slug": "hollywood-and-vine"},
    {"name": "Sci-Fi Dine-In Theater", "slug": "sci-fi-dine-in-theater-restaurant"},
    {"name": "The Hollywood Brown Derby", "slug": "the-hollywood-brown-derby"},
    {"name": "Oga's Cantina", "slug": "ogas-cantina"},
    {"name": "50's Prime Time Café", "slug": "50s-prime-time-cafe"},
    {"name": "Via Napoli Ristorante e Pizzeria", "slug": "via-napoli-ristorante-e-pizzeria"},
    {"name": "Spice Road Table", "slug": "spice-road-table"},
    {"name": "Teppan Edo", "slug": "teppan-edo"},
    {"name": "Tutto Italia Ristorante", "slug": "tutto-italia-ristorante"},
    {"name": "Rose & Crown Dining Room", "slug": "rose-and-crown-dining-room"},
    {"name": "Le Cellier Steakhouse", "slug": "le-cellier-steakhouse"},
    {"name": "Garden Grill Restaurant", "slug": "garden-grill-restaurant"},
    {"name": "Coral Reef Restaurant", "slug": "coral-reef-restaurant"},
    {"name": "San Angel Inn Restaurante", "slug": "san-angel-inn-restaurante"},
    {"name": "La Hacienda de San Angel", "slug": "la-hacienda-de-san-angel"},
    {"name": "Jungle Navigation Co. LTD Skipper Canteen", "slug": "jungle-navigation-co-ltd-skipper-canteen"},
    {"name": "The Crystal Palace", "slug": "the-crystal-palace"},
    {"name": "Liberty Tree Tavern", "slug": "liberty-tree-tavern"},
    {"name": "The Plaza Restaurant", "slug": "the-plaza-restaurant"},
    {"name": "Tony's Town Square Restaurant", "slug": "tonys-town-square-restaurant"},
    {"name": "Trattoria al Forno", "slug": "trattoria-al-forno"},
    {"name": "Flying Fish", "slug": "flying-fish"},
]

ALLOWED_SLUGS = frozenset(r["slug"] for r in WDW_DINING_RESTAURANTS)
