# Changelog

## 0.3.0 (2026-10-30)

- **Área de trabalho**: as criaturas ligadas saem do terrário e andam pela tela toda, numa janela transparente, sempre no topo, que não pega foco e deixa o clique passar. Fogem do mouse para não atrapalhar. Chave no app (*soltar na área de trabalho*) e na bandeja; cada criatura continua com a sua chave. Para de desenhar com o PC bloqueado.
- **Protetor de tela animado** (sem criaturas): sete movimentos abstratos (fluxo, aurora, rede, harmonógrafo, mandala, túnel, ondas) que se revezam com fusão a cada 30 a 48 s, com números novos a cada volta e a paleta girando o tempo todo; relógio e data no monitor principal. Um desenho por monitor.
- O app instala o protetor no Windows (cópia `Terrario.scr` em `%LOCALAPPDATA%\Terrario`, sem administrador) com *ao reiniciar, exibir a tela de logon* ligado: sair do protetor pede a senha. Tempo de 1 a 30 min pela bandeja. *Ver protetor de tela agora* e *prévia* com tela cheia.
- **Imagem no bloqueio**: agora sem criaturas, um instante do protetor (a tela de bloqueio do Windows só aceita imagem parada). Sai `public/pintura.js`.
- A criatura virou módulo próprio (`public/criatura.js`), usado pelo terrário e pela área de trabalho.

## 0.2.2 (2026-10-30)

- Leitura: a cabeça segue a rota da folha em linha (230 px/s), sem mirar ponto a ponto. Antes, com raio de curva maior que o raio de chegada, a criatura podia orbitar uma palavra e a caçada não terminava. 3 páginas levam cerca de 30 s.
- Chips do elenco atualizados no lugar: recriar os botões a cada mudança de estado perdia o clique na chave durante uma caçada.
- Desligar durante o "farejando" também cancela (antes a folha ainda aparecia).
- Caça sozinha (padrão ligado, botão *caçam sozinhas*): sem tema dado, cada criatura escolhe um (curiosidades do seu papel ou pistas da última leitura) e caça a cada 3 min; uma leitura por vez na tela. `?intervalo=<s>` muda o intervalo.
- GitHub Actions (`.github/workflows/exe.yml`): gera o `Terrario.exe` no Windows a cada PR (artefato) e publica uma Release a cada merge na main.

## 0.2.1 (2026-10-30)

- Corrigido: criatura podia ficar rodando em volta de uma palavra e a caçada nunca terminava, o que travava a chave de desligar. Agora ela freia quando o ponto está de lado e pula o ponto depois de 1,5 s.
- Desligar uma criatura no meio da caçada cancela a caçada na hora.

## 0.2.0 (2026-10-30)

- Elenco: uma criatura para cada agente do Brain, com cor, tamanho, ritmo e tema favorito.
- Chave liga/desliga por criatura, *ligar todas* e *desligar todas*. Até 20 ligadas.
- Tela de bloqueio generativa: campo de fluxo + criaturas ligadas + termos aprendidos; semente = data e hora; botão liga/desliga e prévia.
- App de Windows (Electron, `Terrario.exe` portátil): bandeja, gera a próxima tela a cada bloqueio, iniciar com o Windows.
- Batizar sem `prompt()` (funciona no app).
- Teste do app (`npm run test:app`).

## 0.1.0 (2026-10-30)

- Terrário animado em canvas: fundo com rede, esporos e aurora; moldura de vidro.
- Criaturas de blocos com pernas de grafo, passo alternado, antenas e brilho. Cutucar, batizar, chocar (até 8).
- Caçada: tema (Wikipedia) ou link solto; a criatura lê as páginas palavra por palavra e solta os termos.
- Resumo em markdown gravado em `conhecimento/` (ou `TERRARIO_SAIDA`); com `ANTHROPIC_API_KEY`, escrito pelo Claude.
- Links para a rede interna recusados. Servidor só em `127.0.0.1`.
- Testes do agente e do servidor; teste de tela com capturas.
