// Temas variados para o quadro de curiosidades da sala (familia toda).
// Cada tema e o titulo de um artigo da Wikipedia em portugues.
export const TEMAS_SALA = {
  Lugar: ['Salar de Uyuni', 'Monte Roraima', 'Lençóis Maranhenses', 'Cataratas do Iguaçu', 'Fernando de Noronha', 'Machu Picchu',
    'Petra', 'Grande Muralha da China', 'Santorini', 'Capadócia', 'Fiorde', 'Grand Canyon', 'Islândia', 'Ilha de Páscoa',
    'Angkor Wat', 'Chapada Diamantina', 'Bonito (Mato Grosso do Sul)', 'Monte Everest', 'Deserto do Saara', 'Veneza',
    'Kyoto', 'Taj Mahal', 'Pirâmides de Gizé', 'Antártida', 'Pantanal', 'Jalapão', 'Galápagos', 'Grande Barreira de Coral'],
  Animal: ['Polvo', 'Axolote', 'Bicho-preguiça', 'Ornitorrinco', 'Tardigrada', 'Beija-flor', 'Baleia-azul', 'Camaleão',
    'Pinguim-imperador', 'Lontra', 'Arara-azul', 'Onça-pintada', 'Tamanduá-bandeira', 'Água-viva', 'Cavalo-marinho',
    'Coruja', 'Elefante', 'Girafa', 'Golfinho', 'Abelha', 'Formiga-cortadeira', 'Boto-cor-de-rosa', 'Capivara', 'Panda-gigante'],
  Espaço: ['Saturno', 'Júpiter', 'Marte', 'Lua', 'Buraco negro', 'Via Láctea', 'Aurora polar', 'Estação Espacial Internacional',
    'Telescópio Espacial James Webb', 'Cometa Halley', 'Nebulosa', 'Eclipse solar', 'Apollo 11', 'Plutão', 'Sol'],
  História: ['Antigo Egito', 'Vikings', 'Samurai', 'Império Romano', 'Maias', 'Incas', 'Coliseu', 'Titanic', 'Pompeia',
    'Guerreiros de terracota', 'Stonehenge', 'Grandes Navegações', 'Santos Dumont', 'Leonardo da Vinci', 'Marie Curie'],
  Natureza: ['Vulcão', 'Arco-íris', 'Relâmpago', 'Floresta Amazônica', 'Sequoia', 'Vitória-régia', 'Bioluminescência',
    'Geyser', 'Caverna', 'Tsunami', 'Floco de neve', 'Furacão', 'Cogumelo', 'Ipê', 'Baobá'],
  Ciência: ['Cérebro humano', 'DNA', 'Coração humano', 'Arco reflexo', 'Dinossauro', 'Tiranossauro', 'Fóssil', 'Imã',
    'Cristal', 'Diamante', 'Ouro', 'Som', 'Luz', 'Gravidade', 'Vacina'],
  Invenção: ['Telefone', 'Avião', 'Internet', 'Fotografia', 'Relógio', 'Bicicleta', 'Lâmpada incandescente', 'Prensa móvel',
    'Penicilina', 'Satélite artificial', 'Robô', 'Trem-bala'],
  Comida: ['Chocolate', 'Café', 'Pão de queijo', 'Açaí', 'Pizza', 'Sushi', 'Mel', 'Mandioca', 'Pequi', 'Baunilha', 'Pimenta', 'Sorvete'],
  Arte: ['Mona Lisa', 'A Noite Estrelada', 'Tarsila do Amaral', 'Origami', 'Cristo Redentor', 'Torre Eiffel', 'Música clássica',
    'Mosaico', 'Grafite (arte)', 'Ópera de Sydney'],
  Esporte: ['Futebol', 'Jogos Olímpicos', 'Pelé', 'Xadrez', 'Surfe', 'Capoeira', 'Skate', 'Vôlei', 'Fórmula 1', 'Ayrton Senna'],
};

export const LISTA_SALA = Object.entries(TEMAS_SALA).flatMap(([categoria, ts]) => ts.map(tema => ({ tema, categoria })));
