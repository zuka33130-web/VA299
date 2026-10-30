export interface AvatarChoice {
  id: string;
  name: string;
  description: string;
  accent: string;
}

export interface AvatarAppearance {
  bootColor: string;
  outfitId: string;
  accessories: string[];
  transformationId: string | null;
}

export const SKIN_SWATCHES = [
  { label: 'Porcelana', hex: '#ffe0c2', bgClass: 'bg-[#ffe0c2]' },
  { label: 'Durazno', hex: '#ffccaa', bgClass: 'bg-[#ffccaa]' },
  { label: 'Arena', hex: '#e8b88a', bgClass: 'bg-[#e8b88a]' },
  { label: 'Bronce', hex: '#d4a373', bgClass: 'bg-[#d4a373]' },
  { label: 'Cobre', hex: '#b8754e', bgClass: 'bg-[#b8754e]' },
  { label: 'Canela', hex: '#8b5a3c', bgClass: 'bg-[#8b5a3c]' },
  { label: 'Ebano', hex: '#57382e', bgClass: 'bg-[#57382e]' },
  { label: 'Medianoche', hex: '#352b40', bgClass: 'bg-[#352b40]' },
  { label: 'Salvia', hex: '#a3c6a0', bgClass: 'bg-[#a3c6a0]' },
  { label: 'Piedra lunar', hex: '#9be7df', bgClass: 'bg-[#9be7df]' },
  { label: 'Lavanda', hex: '#d0a6d9', bgClass: 'bg-[#d0a6d9]' },
  { label: 'Estelar', hex: '#f4f2ff', bgClass: 'bg-[#f4f2ff]' },
];

export const HAIR_SWATCHES = [
  { label: 'Negro', hex: '#17131f', bgClass: 'bg-[#17131f]' },
  { label: 'Castano', hex: '#331100', bgClass: 'bg-[#331100]' },
  { label: 'Rubio', hex: '#eebb00', bgClass: 'bg-[#eebb00]' },
  { label: 'Pelirrojo', hex: '#a63c21', bgClass: 'bg-[#a63c21]' },
  { label: 'Blanco', hex: '#f4f1e8', bgClass: 'bg-[#f4f1e8]' },
  { label: 'Gris plata', hex: '#9aa7ba', bgClass: 'bg-[#9aa7ba]' },
  { label: 'Azul', hex: '#2874cb', bgClass: 'bg-[#2874cb]' },
  { label: 'Verde', hex: '#37a86b', bgClass: 'bg-[#37a86b]' },
  { label: 'Violeta', hex: '#854cbd', bgClass: 'bg-[#854cbd]' },
  { label: 'Rosa', hex: '#ed6aa8', bgClass: 'bg-[#ed6aa8]' },
  { label: 'Cyan', hex: '#00cbd4', bgClass: 'bg-[#00cbd4]' },
  { label: 'Flame', hex: '#f06b24', bgClass: 'bg-[#f06b24]' },
];

export const SHIRT_SWATCHES = [
  { label: 'Cyan', hex: '#00cbd4', bgClass: 'bg-[#00cbd4]' },
  { label: 'Royal blue', hex: '#3158c8', bgClass: 'bg-[#3158c8]' },
  { label: 'Scarlet', hex: '#d93838', bgClass: 'bg-[#d93838]' },
  { label: 'Forest', hex: '#28704b', bgClass: 'bg-[#28704b]' },
  { label: 'Violeta', hex: '#8151c7', bgClass: 'bg-[#8151c7]' },
  { label: 'Sunset', hex: '#ed7d31', bgClass: 'bg-[#ed7d31]' },
  { label: 'Rosa', hex: '#e85b91', bgClass: 'bg-[#e85b91]' },
  { label: 'Ivory', hex: '#e8e0c5', bgClass: 'bg-[#e8e0c5]' },
  { label: 'Charcoal', hex: '#333b4a', bgClass: 'bg-[#333b4a]' },
  { label: 'Lime', hex: '#8cae35', bgClass: 'bg-[#8cae35]' },
  { label: 'Gold', hex: '#d9a62e', bgClass: 'bg-[#d9a62e]' },
  { label: 'Magenta', hex: '#d52dae', bgClass: 'bg-[#d52dae]' },
];

export const BOOT_SWATCHES = [
  { label: 'Medianoche', hex: '#1e293b', bgClass: 'bg-[#1e293b]' },
  { label: 'Leather', hex: '#75401f', bgClass: 'bg-[#75401f]' },
  { label: 'Sandstone', hex: '#c49a62', bgClass: 'bg-[#c49a62]' },
  { label: 'Ivory', hex: '#e7e2ce', bgClass: 'bg-[#e7e2ce]' },
  { label: 'Crimson', hex: '#a82432', bgClass: 'bg-[#a82432]' },
  { label: 'Ocean', hex: '#236697', bgClass: 'bg-[#236697]' },
  { label: 'Pine', hex: '#286346', bgClass: 'bg-[#286346]' },
  { label: 'Violeta', hex: '#64418c', bgClass: 'bg-[#64418c]' },
  { label: 'Cobre', hex: '#b85e32', bgClass: 'bg-[#b85e32]' },
  { label: 'Gris plata', hex: '#9da9b8', bgClass: 'bg-[#9da9b8]' },
  { label: 'Sunshine', hex: '#e2bd36', bgClass: 'bg-[#e2bd36]' },
  { label: 'Neon pink', hex: '#d74595', bgClass: 'bg-[#d74595]' },
];

export const OUTFITS: AvatarChoice[] = [
  { id: 'classic', name: 'Aventurero clásico', description: 'Chaqueta de campo con solapas y hebilla de latón.', accent: '#e6b844' },
  { id: 'rocker', name: 'Rockero', description: 'Cuero con tachuelas, camiseta de banda y rayo bordado.', accent: '#f45b50' },
  { id: 'mage', name: 'Mago', description: 'Túnica larga, broche estelar y gorro puntiagudo.', accent: '#b990ff' },
  { id: 'indie', name: 'Indie', description: 'Chaleco por capas, mangas arremangadas y costuras visibles.', accent: '#d7a77b' },
  { id: 'hippie', name: 'Hippie', description: 'Túnica amplia, bandas tejidas y motivos florales.', accent: '#f2bd4b' },
  { id: 'punk', name: 'Punk', description: 'Hombro asimetrico, alfileres y tachuelas brillantes.', accent: '#f34b75' },
  { id: 'ninja', name: 'Ninja', description: 'Kimono oscuro, protector facial y faja cruzada.', accent: '#9b82ff' },
  { id: 'knight', name: 'Caballero', description: 'Hombros con placas, emblema heráldico y faldón blindado.', accent: '#b7c9d9' },
  { id: 'explorer', name: 'Explorador', description: 'Arnés de utilidad, bolsillos de campo y emblema de brújula.', accent: '#8cb66a' },
  { id: 'pirate', name: 'Pirata', description: 'Faja cruzada, chaqueta marinera y botones de laton.', accent: '#d34a43' },
  { id: 'scientist', name: 'Científico retro', description: 'Bata de laboratorio, bolsillo para frascos y corbata.', accent: '#e9e7da' },
  { id: 'athlete', name: 'Deportista', description: 'Rayas deportivas, hombros acolchados y dorsal.', accent: '#4dc8d5' },
  { id: 'cowboy', name: 'Vaquero', description: 'Chaleco vaquero, pañuelo al cuello y ribetes de guardabosques.', accent: '#cf843a' },
  { id: 'cyberpunk', name: 'Cyberpunk', description: 'Ribetes de neon, placas segmentadas y nucleo luminoso.', accent: '#ff4bd8' },
  { id: 'artist', name: 'Artista', description: 'Guardapolvo salpicado de pintura, panuelo y porta pinceles.', accent: '#f0a638' },
  { id: 'detective', name: 'Detective', description: 'Abrigo entallado, corbata y bolsillo para libreta.', accent: '#95a7c4' },
  { id: 'space', name: 'Viajero espacial', description: 'Traje presurizado, mochila de oxígeno e insignia de misión.', accent: '#5ed6ed' },
  { id: 'tribal', name: 'Guerrero tribal', description: 'Manto de plumas, faja tejida y emblema solar.', accent: '#d78045' },
  { id: 'vintage', name: 'Elegante vintage', description: 'Chaleco entallado, camisa impecable y reloj de bolsillo.', accent: '#d9c388' },
  { id: 'inventor', name: 'Inventor mecánico', description: 'Delantal de herramientas, remaches de cobre y hebilla dentada.', accent: '#cb8e53' },
];

export const ACCESSORIES: AvatarChoice[] = [
  { id: 'cape', name: 'Capa', description: 'Capa corta sujeta en los hombros.', accent: '#d74646' },
  { id: 'cap', name: 'Gorra', description: 'Gorra ajustada con visera cosida.', accent: '#c88f45' },
  { id: 'glasses', name: 'Gafas', description: 'Montura redonda sobre los ojos.', accent: '#79d7e5' },
  { id: 'bandana', name: 'Bandana', description: 'Vincha anudada con una tira suelta.', accent: '#de4949' },
  { id: 'hat', name: 'Sombrero', description: 'Sombrero de viajero de ala ancha.', accent: '#c99549' },
  { id: 'scarf', name: 'Panuelo', description: 'Panuelo enrollado con una punta al viento.', accent: '#ef7b43' },
  { id: 'backpack', name: 'Mochila', description: 'Mochila resistente con manta y broche.', accent: '#9b6337' },
  { id: 'mask', name: 'Mascara', description: 'Mascara ajustada que cubre la parte baja del rostro.', accent: '#b7c5d8' },
  { id: 'earrings', name: 'Pendientes', description: 'Pendientes pequenos de metal pulido.', accent: '#f5d45c' },
  { id: 'headphones', name: 'Auriculares retro', description: 'Auriculares acolchados con diadema arqueada.', accent: '#62d6db' },
];

export const TRANSFORMATIONS: AvatarChoice[] = [
  { id: 'monster', name: 'Monstruo original', description: 'Criatura original con cuernos y marcas luminosas.', accent: '#77c86d' },
  { id: 'frankenstein', name: 'Frankenstein', description: 'Pernos, costuras y piel verde musgo.', accent: '#89c37d' },
  { id: 'mummy', name: 'Momia', description: 'Vendas de lino cruzan el rostro y el cuerpo.', accent: '#d5bd8c' },
  { id: 'vampire', name: 'Vampiro', description: 'Rostro palido, orejas puntiagudas y cuello de capa alto.', accent: '#be3857' },
  { id: 'werewolf', name: 'Hombre lobo', description: 'Orejas peludas, hocico y guantes con garras.', accent: '#ad805c' },
  { id: 'skeleton', name: 'Esqueleto viviente', description: 'Calavera clara y estructura articulada de huesos.', accent: '#eee5c7' },
  { id: 'alien', name: 'Alienigena', description: 'Visitante luminoso con antenas y ojos ovalados oscuros.', accent: '#65db8b' },
  { id: 'ghost', name: 'Fantasma', description: 'Silueta flotante con bordes espectrales suaves.', accent: '#a8e6ec' },
  { id: 'demon', name: 'Demonio pixel', description: 'Pequeno demonio cornudo con marcas de brasas.', accent: '#ed594b' },
  { id: 'glitch', name: 'Criatura Glitch', description: 'Fragmentos de pixeles desfasados rasgan su silueta.', accent: '#39f4e1' },
];

export const DEFAULT_AVATAR_APPEARANCE: AvatarAppearance = {
  bootColor: '#1e293b',
  outfitId: 'classic',
  accessories: [],
  transformationId: null,
};
