import { UnitType } from "../schema/UnitSchema";

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
  "Diego"
];

function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getUnitTypeName(unitType: UnitType): string {
  return UnitType[unitType];
}

export function generateName(unitType?: UnitType): string {
  const adjective = randomItem(adjectives);
  const noun = randomItem(nouns);
  
  if (unitType !== undefined) {
    const typeName = getUnitTypeName(unitType);
    return `${noun} the ${adjective} ${typeName}`;
  }
  
  return `${adjective} ${noun}`;
}
