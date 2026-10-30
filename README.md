# Terrário

Um terrário de criaturas digitais. Cada criatura é uma centopeia de blocos com pernas de grafo, e cada uma tem um agente que caça um tema na web, lê as páginas na sua frente e grava o que aprendeu em **markdown**.

Inspiração: o vídeo "Crawlers" (criaturas que exploram a web). Aqui não há NFT nem blockchain: só a criatura, a leitura e o conhecimento.

![terrário](docs/capturas/01b-chaves.png)

## App de Windows

Baixe o `Terrario.exe` da [última Release](../../releases/latest) (portátil, não instala nada) e abra. O GitHub gera o exe sozinho a cada merge na `main`. O terrário abre e fica um ícone na bandeja.

- **Criaturas**: uma para cada agente do Brain (Xavier, Professor, Revisor, Batman, Ciborgue, Visão, Stark, Oráculo, Mímir, Thoth, Íris, Iara, Skuld, Odin, Heimdall). Cada uma tem sua chave: ligue uma, várias ou todas (*ligar todas* / *desligar todas*). Só as ligadas andam no terrário.
- **Área de trabalho**: *soltar na área de trabalho* (no app ou na bandeja) põe as criaturas ligadas andando pela tela toda, por cima das janelas. O clique passa por elas e elas saem da frente do mouse. Ligar ou desligar uma criatura no terrário vale lá também.
- **Protetor de tela animado**: a chave *protetor de tela* instala o Terrário como protetor de tela do Windows, com *exibir a tela de logon* ligado. Com o PC parado (5 min; muda na bandeja), entram animações abstratas que mudam o tempo todo (sem criaturas) e, ao mexer, o Windows pede a senha. *Prévia* mostra rodando; *tela cheia* mostra como fica.
- **Imagem no bloqueio**: a tela de bloqueio do Windows só aceita imagem parada. Ligada, a cada Win+L o app guarda um instante do protetor e ele aparece no próximo bloqueio.
- **Bandeja**: abrir o terrário, criaturas, área de trabalho, protetor (liga, tempo, ver agora), imagem no bloqueio, pastas, iniciar com o Windows, sair. Fechar a janela não fecha o app.
- Arquivos em `Documentos\Terrario`: `conhecimento\` (markdown) e `telas\` (as últimas 12 imagens).

A troca da tela de bloqueio usa a API do próprio Windows (via Windows PowerShell, sem administrador). Se a tela de bloqueio estiver em *Windows em destaque* (Spotlight) ou se uma política da empresa travar a personalização, o Windows pode ignorar a troca: o app avisa com a mensagem do erro.

Para gerar o `.exe`: `npm install` e `npm run dist` (sai em `dist/Terrario.exe`).

## Rodar no navegador

```bash
npm start            # abre em http://127.0.0.1:4747
```

Node 20 ou mais novo, sem dependências. Tudo fica no seu PC: o servidor só escuta em `127.0.0.1`.

| Variável | Para quê | Padrão |
|---|---|---|
| `TERRARIO_SAIDA` | pasta onde o markdown é gravado (ex.: a pasta de conhecimento do Brain) | `./conhecimento` |
| `ANTHROPIC_API_KEY` | se existir, o resumo é escrito pelo Claude; sem ela, o resumo é extrativo (primeiras frases de cada página) | vazio |
| `TERRARIO_MODELO` | modelo do resumo | `claude-sonnet-5-5` |
| `TERRARIO_WIKI` | Wikipedia usada para caçar temas | `https://pt.wikipedia.org` |
| `PORT` | porta | `4747` |

A chave nunca vai para arquivo nem para o repositório: só variável de ambiente.

## Usar

- **Caçar**: escolha a criatura, escreva um tema e clique em *Caçar*. Ela fareja, lê até 3 páginas rastejando palavra por palavra, solta os termos que achou e leva o resumo para a gaveta *conhecimento*.
- **Soltar um link**: arraste um link para perto de uma criatura (ou cole no campo). Ela lê só aquela página.
- **Cutucar**: clique numa criatura.
- **Batizar** (no próprio campo) e **+ criatura** (criaturas novas, fora do elenco). Até 20 ligadas ao mesmo tempo.
- Campo vazio + *Caçar*: a criatura caça o tema favorito dela (ex.: Batman caça segurança da informação).
- **Caçam sozinhas** (ligado por padrão): sem tema dado, cada criatura ligada escolhe o que pesquisar (curiosidades do seu papel ou pistas do que leu antes) e caça a cada 3 minutos. Uma leitura por vez na tela.
- Abrir `public/index.html` direto, ou com `?demo`, roda uma demonstração sem servidor (nada é gravado).

## Privacidade

A criatura **não** lê a tela, arquivos nem o que você faz. Ela só lê o que recebe: um tema (busca na Wikipedia) ou um link que você soltou. Links para a rede interna (`localhost`, `10.x`, `192.168.x` etc.) são recusados.

## Testes

```bash
npm test             # agente, markdown e servidor (com uma Wikipedia falsa)
npm run test:ui      # Chromium: criaturas, prévia do protetor, caçada, cada movimento do protetor, imagem de bloqueio e área de trabalho
npm run test:app     # Electron: tela de bloqueio, área de trabalho transparente, protetor e o .scr com /s e /p; no Linux: xvfb-run -a npm run test:app
```

## Próximos passos

Veja [docs/conceito.md](docs/conceito.md). Celular fica para depois.

![protetor de tela: seis dos sete movimentos](docs/capturas/protetor-movimentos.png)

![criaturas soltas na área de trabalho](docs/capturas/08-area-de-trabalho.png)
