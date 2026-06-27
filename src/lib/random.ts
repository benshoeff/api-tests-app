const FIRST_NAMES = [
  "James", "Mary", "John", "Patricia", "Robert", "Jennifer", "Michael", "Linda",
  "David", "Elizabeth", "William", "Barbara", "Richard", "Susan", "Joseph", "Jessica",
  "Thomas", "Sarah", "Christopher", "Karen", "Charles", "Lisa", "Daniel", "Nancy",
  "Matthew", "Betty", "Anthony", "Margaret", "Mark", "Sandra", "Donald", "Ashley",
  "Steven", "Dorothy", "Paul", "Kimberly", "Andrew", "Emily", "Joshua", "Donna",
];

const LAST_NAMES = [
  "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis",
  "Rodriguez", "Martinez", "Hernandez", "Lopez", "Gonzalez", "Wilson", "Anderson",
  "Thomas", "Taylor", "Moore", "Jackson", "Martin", "Lee", "Perez", "Thompson",
  "White", "Harris", "Sanchez", "Clark", "Ramirez", "Lewis", "Robinson", "Walker",
  "Young", "Allen", "King", "Wright", "Scott", "Torres", "Hill", "Green", "Adams",
];

const WORDS = [
  "lorem", "ipsum", "dolor", "sit", "amet", "consectetur", "adipiscing", "elit",
  "sed", "do", "eiusmod", "tempor", "incididunt", "ut", "labore", "et", "dolore",
  "magna", "aliqua", "enim", "ad", "minim", "veniam", "quis", "nostrud",
  "exercitation", "ullamco", "laboris", "nisi", "aliquip", "ex", "ea", "commodo",
  "consequat", "duis", "aute", "irure", "dolor", "reprehenderit", "voluptate",
  "velit", "esse", "cillum", "fugiat", "pariatur", "excepteur", "sint", "occaecat",
  "cupidatat", "non", "proident", "sunt", "culpa", "officia", "deserunt", "mollit",
  "anim", "id", "est", "laborum",
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randDigit(): string {
  return String(randInt(0, 9));
}

export function generateRandomValues(): Record<string, string> {
  const firstName = pick(FIRST_NAMES);
  const lastName = pick(LAST_NAMES);
  const num = randInt(1, 999);
  const username = `${firstName.toLowerCase().slice(0, 1)}${lastName.toLowerCase()}_${num}`;
  const domain = pick(["example.com", "test.com", "mail.com", "demo.org", "sample.net"]);
  const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}.${num}@${domain}`;

  const timestamp = new Date().toISOString();

  return {
    $timestamp: timestamp,
    $isoTimestamp: timestamp,
    $randomEmail: email,
    $randomUserName: username,
    $randomName: `${firstName} ${lastName}`,
    $randomFirstName: firstName,
    $randomLastName: lastName,
    $randomPhone: `555-${randInt(100, 999)}-${randInt(1000, 9999)}`,
    $randomUUID: crypto.randomUUID(),
    $randomInt: String(randInt(1, 9999)),
    $randomBoolean: Math.random() > 0.5 ? "true" : "false",
    $randomWord: pick(WORDS),
    $randomParagraph: generateParagraph(randInt(20, 60)),
  };
}

function generateParagraph(wordCount: number): string {
  const words: string[] = [];
  for (let i = 0; i < wordCount; i++) {
    words.push(pick(WORDS));
  }
  const text = words.join(" ");
  return text.charAt(0).toUpperCase() + text.slice(1) + ".";
}
