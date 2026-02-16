const adjectives = [
  "Chunky", "Sneaky", "Wobbly", "Grumpy", "Dizzy",
  "Fluffy", "Cranky", "Spicy", "Soggy", "Bouncy",
  "Sassy", "Turbo", "Funky", "Crispy", "Sleepy",
  "Wiggly", "Mighty", "Tiny", "Jumpy", "Clumsy",
  "Angry", "Derpy", "Chonky", "Zappy", "Goofy",
];

const nouns = [
  "Nugget", "Pickle", "Waffle", "Noodle", "Potato",
  "Taco", "Muffin", "Biscuit", "Pancake", "Burrito",
  "Dumpling", "Pretzel", "Turnip", "Cabbage", "Sausage",
  "Toaster", "Walrus", "Penguin", "Goblin", "Hamster",
  "Llama", "Moose", "Platypus", "Raccoon", "Wombat",
];

function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function generateName(): string {
  return `${randomItem(adjectives)} ${randomItem(nouns)}`;
}
