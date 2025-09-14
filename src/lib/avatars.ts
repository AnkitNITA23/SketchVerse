export const AVATARS = [
    'avatar-1.svg',
    'avatar-2.svg',
    'avatar-3.svg',
    'avatar-4.svg',
    'avatar-5.svg',
    'avatar-6.svg',
    'avatar-7.svg',
    'avatar-8.svg',
    'avatar-9.svg',
    'avatar-10.svg',
];

export const generateUsername = () => {
    const adjectives = ['Silly', 'Goofy', 'Wacky', 'Zany', 'Dizzy', 'Bizarre', 'Funky', 'Quirky'];
    const nouns = ['Panda', 'Unicorn', 'Dinosaur', 'Alien', 'Robot', 'Pirate', 'Ninja', 'Wizard'];
    return `${adjectives[Math.floor(Math.random() * adjectives.length)]}${nouns[Math.floor(Math.random() * nouns.length)]}${Math.floor(Math.random() * 100)}`;
}
