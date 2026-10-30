# Changelog

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
