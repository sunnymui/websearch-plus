/** Returns a Fisher-Yates shuffle without mutating the source values. */
const shuffle = (values, random) => {
    const result = [...values];
    for (let index = result.length - 1; index > 0; index -= 1) {
        const selected = Math.floor(random() * (index + 1));
        [result[index], result[selected]] = [result[selected], result[index]];
    }
    return result;
};
/** Returns values starting at an offset and wrapping to the beginning. */
const rotate = (values, offset) => {
    if (values.length === 0)
        return [];
    const start = offset % values.length;
    return [...values.slice(start), ...values.slice(0, start)];
};
/**
 * Selects the ordered provider candidates for one search attempt.
 *
 * Cooling providers are excluded. `first` preserves configured order, `rotate` advances the
 * starting position, and `random` groups keyed or keyless-capable providers by preference.
 *
 * @param input Provider availability and strategy state for this search.
 * @returns Provider IDs ordered for this search attempt.
 */
export const selectCandidates = ({ providers, strategy, randomProviderPreference, roundRobinOffset, random, }) => {
    const available = providers.filter((provider) => !provider.coolingDown);
    if (strategy === "first")
        return available.map((provider) => provider.id);
    if (strategy === "rotate")
        return rotate(available, roundRobinOffset).map((provider) => provider.id);
    if (randomProviderPreference === "none")
        return shuffle(available, random).map((provider) => provider.id);
    const authenticated = available.filter((provider) => provider.hasApiKey);
    const keyless = available.filter((provider) => !provider.hasApiKey && provider.supportsKeyless);
    const keyRequired = available.filter((provider) => !provider.hasApiKey && !provider.supportsKeyless);
    const first = randomProviderPreference === "has-api-key" ? authenticated : keyless;
    const second = randomProviderPreference === "has-api-key" ? keyless : authenticated;
    return [...shuffle(first, random), ...shuffle(second, random), ...shuffle(keyRequired, random)].map((provider) => provider.id);
};
