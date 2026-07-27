// Built-in fixtures. Each is a (training-corpus sample, benchmark test set)
// pair the demo can load with one click. Kept deliberately small so the whole
// scan is instant and the verdicts are easy to eyeball.

export interface Example {
  id: string;
  label: string;
  blurb: string;
  training: string;
  test: string;
}

// --- 1. Leaky benchmark: exact + n-gram + near-dup + clean all present. ------
const LEAKY_TRAINING = `The mitochondria is the powerhouse of the cell.
In reinforcement learning an agent learns a policy by maximizing the expected cumulative reward it receives from the environment over time.
A transformer model processes every token in parallel using a self attention mechanism that weighs the relevance of all other tokens.
The capital of Australia is Canberra not Sydney.
def add(a, b): return a + b  # a trivial helper reused across the codebase
Photosynthesis converts carbon dioxide and water into glucose and oxygen using energy from sunlight.`;

const LEAKY_TEST = `The mitochondria is the powerhouse of the cell.
During training, an agent learns a policy by maximizing the expected cumulative reward, and this loop repeats.
The transformer model processes every token in parallel while a self attention mechanism weighs the relevance of the other tokens.
Who wrote the novel Pride and Prejudice, and in what year was it first published?
What is the boiling point of water at sea level in degrees Celsius?
The capital of Australia is Canberra, not Sydney.`;

// --- 2. Clean benchmark: disjoint domains, expect 0% contamination. -----------
const CLEAN_TRAINING = `Preheat the oven to 220 degrees Celsius before you begin the recipe.
Whisk the eggs with a pinch of salt until they turn pale and frothy.
Fold the flour into the batter gently so the sponge stays light and airy.
A good stock simmers for hours as the bones slowly release their gelatin.`;

const CLEAN_TEST = `Estimate the total number of stars in an average spiral galaxy.
Explain why the sky appears blue during the day but red at sunset.
Describe how tectonic plates drift across the surface of the planet.
State Kepler's third law relating orbital period to semi major axis.`;

// --- 3. Paraphrase attack: moderate rewording that breaks n-grams; near-dup
//        Jaccard still catches it. One item is left verbatim (exact) and one is
//        genuinely unrelated (clean).
const PARA_TRAINING = `Gradient descent iteratively updates the model parameters in the direction that most steeply reduces the training loss.
Overfitting happens when a model memorizes noise in the training data instead of learning the underlying pattern.
The learning rate controls how large a step the optimizer takes on each parameter update during training.
Regularization discourages large weights so the trained model generalizes better to unseen examples.`;

const PARA_TEST = `Gradient descent iteratively tweaks the model parameters in the direction which most steeply reduces the training loss.
Overfitting happens when a model retains noise in the training data instead of grasping the underlying pattern.
The learning rate sets how large a step the optimizer takes upon each parameter update during training.
Regularization discourages large weights so the trained model generalizes better to unseen examples.
Summarize the plot of a nineteenth century Russian novel in exactly three sentences.`;

export const EXAMPLES: Example[] = [
  {
    id: "leaky",
    label: "Leaky benchmark",
    blurb:
      "A test set where several items leaked into the training sample — verbatim, as a shared n-gram, and as a paraphrase.",
    training: LEAKY_TRAINING,
    test: LEAKY_TEST,
  },
  {
    id: "clean",
    label: "Clean benchmark",
    blurb:
      "Training and test cover different domains. A well-run eval should look like this: 0% contamination.",
    training: CLEAN_TRAINING,
    test: CLEAN_TEST,
  },
  {
    id: "paraphrase",
    label: "Paraphrase attack",
    blurb:
      "Every leaked item was reworded to dodge exact and n-gram filters. Near-duplicate Jaccard still catches it.",
    training: PARA_TRAINING,
    test: PARA_TEST,
  },
];

export const DEFAULT_EXAMPLE = EXAMPLES[0];
