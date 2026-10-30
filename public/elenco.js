// Uma criatura para cada agente do Brain. Cor, tamanho e jeito de cada um;
// "tema" e o que a criatura caca com o campo vazio; "curiosidades" e de onde
// ela escolhe sozinha o que pesquisar quando ninguem da tema.
export const ELENCO = [
  { id: 'xavier', nome: 'Xavier', cor: '#ffd23f', n: 15, vel: 1, papel: 'coordenador', tema: 'gestao de alta performance', curiosidades: ['gestao de alta performance', 'lideranca', 'tomada de decisao', 'Andrew Grove', 'Peter Drucker', 'produtividade'] },
  { id: 'professor', nome: 'Professor', cor: '#ffe9a8', n: 13, vel: 0.8, papel: 'ensina', tema: 'defesa cibernetica', curiosidades: ['defesa cibernetica', 'criptografia', 'didatica', 'historia da computacao', 'protocolo TCP/IP', 'aprendizagem'] },
  { id: 'revisor', nome: 'Revisor', cor: '#ff4f6d', n: 11, vel: 0.9, papel: 'confere entregas', tema: 'revisao de codigo', curiosidades: ['revisao de codigo', 'teste de software', 'qualidade de software', 'falha de seguranca', 'boas praticas de programacao'] },
  { id: 'batman', nome: 'Batman', cor: '#8a8fb8', n: 14, vel: 1.25, papel: 'seguranca', tema: 'seguranca da informacao', curiosidades: ['seguranca da informacao', 'engenharia social', 'ransomware', 'autenticacao multifator', 'firewall', 'phishing'] },
  { id: 'ciborgue', nome: 'Ciborgue', cor: '#3ee6ff', n: 14, vel: 1.1, papel: 'redes', tema: 'redes de computadores', curiosidades: ['redes de computadores', 'DNS', 'VPN', 'roteador', 'fibra optica', 'Wi-Fi'] },
  { id: 'visao', nome: 'Visao', cor: '#ff8a3d', n: 12, vel: 1, papel: 'sistemas operacionais', tema: 'windows', curiosidades: ['Windows', 'Linux', 'kernel', 'sistema de arquivos', 'PowerShell', 'macOS'] },
  { id: 'stark', nome: 'Stark', cor: '#ff3b3b', n: 13, vel: 1.3, papel: 'software', tema: 'engenharia de software', curiosidades: ['engenharia de software', 'JavaScript', 'Node.js', 'Electron', 'arquitetura de software', 'Git'] },
  { id: 'oraculo', nome: 'Oraculo', cor: '#b18cff', n: 12, vel: 0.85, papel: 'dados', tema: 'ciencia de dados', curiosidades: ['ciencia de dados', 'estatistica', 'visualizacao de dados', 'aprendizado de maquina', 'banco de dados'] },
  { id: 'mimir', nome: 'Mimir', cor: '#5effc8', n: 16, vel: 0.95, papel: 'pesquisa', tema: 'aprendizado de maquina', curiosidades: ['aprendizado de maquina', 'rede neural artificial', 'Mimir', 'biblioteca', 'metodo cientifico', 'grafo de conhecimento'] },
  { id: 'thoth', nome: 'Thoth', cor: '#e6c27a', n: 11, vel: 0.9, papel: 'documentos', tema: 'escrita tecnica', curiosidades: ['escrita tecnica', 'tipografia', 'Thoth', 'retorica', 'apresentacao de slides'] },
  { id: 'iris', nome: 'Iris', cor: '#ff5fd2', n: 10, vel: 1.15, papel: 'cores e temas', tema: 'teoria das cores', curiosidades: ['teoria das cores', 'arco-iris', 'design grafico', 'luz', 'pintura impressionista'] },
  { id: 'iara', nome: 'Iara', cor: '#4dd6ff', n: 10, vel: 1.2, papel: 'pixel-art', tema: 'pixel art', curiosidades: ['pixel art', 'Iara', 'jogos eletronicos', 'animacao', 'sprite'] },
  { id: 'skuld', nome: 'Skuld', cor: '#9dff57', n: 9, vel: 1.35, papel: 'agenda', tema: 'gestao do tempo', curiosidades: ['gestao do tempo', 'calendario', 'Nornas', 'relogio', 'planejamento'] },
  { id: 'odin', nome: 'Odin', cor: '#7f9cff', n: 12, vel: 0.7, papel: 'documenta o Brain', tema: 'mitologia nordica', curiosidades: ['mitologia nordica', 'Odin', 'Yggdrasil', 'runas', 'vikings'] },
  { id: 'heimdall', nome: 'Heimdall', cor: '#f5f7ff', n: 10, vel: 1.05, papel: 'guarda os tokens', tema: 'economia de energia', curiosidades: ['economia de energia', 'Heimdall', 'Bifrost', 'aurora boreal', 'vigilancia'] },
];
