import { locale, t } from '../i18n'
import type { MessageKey } from '../i18n/fr'

/** RAWG genres are in English. */
const GENRES_FR: Record<string, string> = {
  Action: 'Action', Adventure: 'Aventure', RPG: 'RPG', Shooter: 'Tir', Platformer: 'Plates-formes', Racing: 'Course', Sports: 'Sport',
  Strategy: 'Stratégie', Puzzle: 'Réflexion', Simulation: 'Simulation', Fighting: 'Combat', Family: 'Famille', Indie: 'Indépendant',
  Arcade: 'Arcade', Casual: 'Casual', 'Massively Multiplayer': 'MMO', Educational: 'Éducatif', Card: 'Cartes', 'Board Games': 'Jeux de société',
}
const ESRB: Record<string, string> = { Everyone: 'gaming.esrb.everyone', 'Everyone 10+': 'gaming.esrb.ten', Teen: 'gaming.esrb.teen', Mature: 'gaming.esrb.mature', 'Adults Only': 'gaming.esrb.adults' }
export const esrb = (name: string) => (ESRB[name] ? t(ESRB[name] as MessageKey) : name)
export const genre = (g: string) => (locale === 'fr' ? GENRES_FR[g] ?? g : g)
