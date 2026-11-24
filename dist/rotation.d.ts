import type { ProviderID, RandomProviderPreference, Strategy } from "./options.js";
export interface ProviderAvailability {
    readonly id: ProviderID;
    readonly hasApiKey: boolean;
    readonly supportsKeyless: boolean;
    readonly coolingDown: boolean;
}
export interface RotationInput {
    readonly providers: readonly ProviderAvailability[];
    readonly strategy: Strategy;
    readonly randomProviderPreference: RandomProviderPreference;
    readonly roundRobinOffset: number;
    readonly random: () => number;
}
/**
 * Selects the ordered provider candidates for one search attempt.
 *
 * Cooling providers are excluded. `first` preserves configured order, `rotate` advances the
 * starting position, and `random` groups keyed or keyless-capable providers by preference.
 *
 * @param input Provider availability and strategy state for this search.
 * @returns Provider IDs ordered for this search attempt.
 */
export declare const selectCandidates: ({ providers, strategy, randomProviderPreference, roundRobinOffset, random, }: RotationInput) => ProviderID[];
