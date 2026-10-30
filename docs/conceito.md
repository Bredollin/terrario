# Conceito e fases

## A ideia

Um terrário no PC com criaturas vivas. Cada uma tem um agente de IA. Você dá um tema ou solta um link, ela sai para caçar, lê as páginas e volta com um resumo em markdown, que vira conhecimento do Brain.

## Regras

- **Privacidade**: a criatura só lê o que recebe (tema, link, página indicada). Nunca a tela, nunca arquivos, nunca o que o usuário digita em outros programas.
- **Nada de segredo no repositório**: chave da IA só por variável de ambiente.
- **Local**: o servidor só escuta em `127.0.0.1`.

## Fases

| Fase | O quê | Estado |
|---|---|---|
| 1. Protótipo web | terrário animado, caçada de tema ou link, markdown gravado | **feito (0.1.0)** |
| 2. App de desktop | Electron, `.exe` portátil, bandeja, chave por criatura | **feito (0.2.0)** |
| 3. Tela de bloqueio generativa | a cada bloqueio do Windows, uma imagem nova e única | **feito (0.2.0)**, falta testar no Windows real |
| 4. Celular | versão para o telefone | depois |

## Wallpaper generativo (fase 3)

- **Semente** = data e hora do bloqueio + temas caçados no dia. A mesma semente gera a mesma imagem; uma nova semente, uma imagem nunca vista.
- **Desenho** (desde 0.3.0): sem criaturas, a pedido do dono. É um instante do protetor de tela animado (`public/protetor.js`): sete movimentos abstratos que se revezam. Exporta JPG na resolução da tela.
- **No Windows** (como ficou): o app escuta o evento de bloqueio (`powerMonitor` *lock-screen*), pinta a próxima imagem numa janela oculta (`public/bloqueio.html` + `public/protetor.js`), salva em `Documentos\Terrario\telas` e troca a imagem com `Windows.System.UserProfile.LockScreen.SetImageFileAsync` num script do Windows PowerShell 5.1 com tempo limite de 15 s por passo (`electron/bloqueio-ps.mjs`). A imagem nova vale para o bloqueio seguinte.
- Sem instalar nada além do próprio app.

## Protetor de tela (0.3.0)

- A tela de bloqueio do Windows só aceita imagem parada. Animação de verdade só no **protetor de tela**, com *ao reiniciar, exibir a tela de logon*: o PC fica parado, a animação roda, e ao mexer o Windows pede a senha.
- O protetor é o próprio `Terrario.exe` copiado como `Terrario.scr` em `%LOCALAPPDATA%\Terrario`. O Windows chama com `/s` (mostrar), `/p` (miniatura, fica vazia) ou `/c` (configurar, abre um aviso). Nesse modo o app não pega a trava de instância única, não mexe na configuração nem na bandeja.
- Ligar grava `SCRNSAVE.EXE` em `HKCU\Control Panel\Desktop` e chama `SystemParametersInfo` (tempo, ativo, seguro) num script do Windows PowerShell 5.1 (`electron/protetor-ps.mjs`). Sem administrador. Uma política da empresa pode travar: o app avisa.
- O portátil se descompacta a cada abertura, então o protetor leva alguns segundos para aparecer.

## Área de trabalho (0.3.0)

- Janela Electron transparente do tamanho da área de trabalho (sem a barra de tarefas), `alwaysOnTop`, `focusable: false` e `setIgnoreMouseEvents(true, { forward: true })`: o clique passa, o movimento do mouse chega e as criaturas saem da frente dele. 40 quadros por segundo.
- O terrário manda ao app as ligadas com nome, cor e jeito; o app repassa para a janela da área.

## Por que centopeia de blocos

Cada bloco é um estado (4 células que piscam), as pernas são arestas de um grafo e os pés são nós. Quando ela lê, os blocos piscam mais rápido, as palavras lidas acendem e os termos saem flutuando como num cladograma.
